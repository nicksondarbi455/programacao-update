import { useEffect, useRef, useState } from 'react';
import { CpdDiagrama } from '../components/organisms/CpdDiagrama';
import { mapService } from '../services/mapService';
import { loadMapLibs, parseRouteFile } from '../utils/mapLoader';
import { Button } from '../components/atoms/Button';

const TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';
const CORES_TIPO = { CPD: '#2563eb', COLO: '#16a34a' };
// Abaixo deste zoom os nomes dos CPDs somem, deixando só os ícones
const ZOOM_MINIMO_NOMES = 11;
// Opções do card de cada CPD (à esquerda)
const CPD_ABAS = [
    { id: 'hack', label: 'Hack' },
    { id: 'preventivas', label: 'Preventivas' },
    { id: 'equipamentos', label: 'Equipamentos' },
    { id: 'informacoes', label: 'Informações' }
];
const EMPTY_FORM = { origem: '', destino: '', descricao: '', cabos: [{ nome: '', cor: '#2196F3' }], file: null };

const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '7px 8px', background: 'var(--th-surface-2)', border: '1px solid var(--th-border-strong)', borderRadius: '4px', fontSize: '0.8rem', color: 'var(--th-text)' };
const labelStyle = { fontSize: '0.72rem', color: 'var(--th-muted)', fontWeight: 'bold' };
const titleStyle = { margin: '0 0 8px 0', fontSize: '0.9rem', fontWeight: 700, color: 'var(--th-text)' };

// Distância em km entre dois pontos (para escolher o CPD mais próximo)
function distanciaKm(a, b) {
    const R = 6371;
    const rad = (d) => (d * Math.PI) / 180;
    const dLat = rad(b.lat - a.lat);
    const dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

function escaparHtml(texto) {
    return String(texto).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function MapPage({ userEmail }) {
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const camadasRef = useRef({});

    const [pronto, setPronto] = useState(false);
    const [erro, setErro] = useState('');
    const [datacenters, setDatacenters] = useState([]);
    const [rotas, setRotas] = useState([]);
    const [form, setForm] = useState(EMPTY_FORM);
    const [fileKey, setFileKey] = useState(0);
    const [salvando, setSalvando] = useState(false);
    const [viab, setViab] = useState({ coords: '', cpd: 'auto' });
    const [resultado, setResultado] = useState(null);
    const [calculando, setCalculando] = useState(false);
    // Card de status da rede (minimizável)
    const [statusAberto, setStatusAberto] = useState(true);
    // CPD aberto no card (ao clicar no ícone) e a opção escolhida
    const [cpdSelecionado, setCpdSelecionado] = useState(null);
    const [cpdAba, setCpdAba] = useState(null);

    const abrirCpd = (dc) => {
        setCpdSelecionado(dc);
        setCpdAba(null);
    };

    // 1) Cria o mapa uma vez
    useEffect(() => {
        let cancelado = false;
        let mapa = null;

        loadMapLibs()
            .then((L) => {
                if (cancelado) return;
                mapa = L.map(containerRef.current).setView([-3.89, -38.46], 10);
                L.tileLayer(TILE_URL, { attribution: 'Tiles &copy; Esri', maxZoom: 16 }).addTo(mapa);
                camadasRef.current = {
                    dc: L.layerGroup().addTo(mapa),
                    rotas: L.layerGroup().addTo(mapa),
                    viab: L.layerGroup().addTo(mapa)
                };
                mapRef.current = mapa;

                // Esconde os nomes dos CPDs quando o zoom está afastado
                const atualizaNomes = () => {
                    mapa.getContainer().classList.toggle('map-zoom-out', mapa.getZoom() < ZOOM_MINIMO_NOMES);
                };
                mapa.on('zoomend', atualizaNomes);
                atualizaNomes();
                setPronto(true);
            })
            .catch((err) => {
                if (!cancelado) setErro(err.message);
            });

        return () => {
            cancelado = true;
            if (mapa) mapa.remove();
            mapRef.current = null;
            camadasRef.current = {};
        };
    }, []);

    const desenharDatacenters = (lista) => {
        const L = window.L;
        const grupo = camadasRef.current.dc;
        if (!L || !grupo) return;
        grupo.clearLayers();
        lista.forEach((dc) => {
            const cor = CORES_TIPO[dc.tipo] || '#64748b';
            const icone = L.divIcon({
                className: '',
                html: `<i class="fa-solid fa-server" style="color:${cor};font-size:18px;line-height:18px;text-shadow:0 0 3px #fff,0 0 3px #fff;"></i>`,
                iconSize: [18, 18],
                iconAnchor: [9, 9]
            });
            L.marker([dc.lat, dc.lng], { icon: icone })
                .bindTooltip(escaparHtml(dc.nome), { permanent: true, direction: 'right', offset: [10, 0], className: 'cpd-tooltip' })
                .on('click', () => abrirCpd(dc))
                .addTo(grupo);
        });
    };

    const carregarRotas = async () => {
        const L = window.L;
        const grupo = camadasRef.current.rotas;
        if (!L || !grupo) return;

        const lista = await mapService.listRoutes();
        setRotas(lista);
        grupo.clearLayers();

        await Promise.all(lista.map(async (rota) => {
            try {
                const arquivo = await mapService.downloadRouteFile(rota.arquivo_path);
                const camada = await parseRouteFile(arquivo, rota.nome_arquivo);
                if (camada.setStyle) camada.setStyle({ color: '#7c3aed', weight: 2, opacity: 0.85 });

                const cabos = (rota.cabos || []).map((c) =>
                    `<div style="display:flex;align-items:center;gap:5px;font-size:12px;margin-bottom:3px;">` +
                    `<span style="width:10px;height:10px;border-radius:50%;background:${escaparHtml(c.cor)}"></span>${escaparHtml(c.nome)}</div>`
                ).join('') || '<i style="font-size:11px;color:#888">Nenhum cabo cadastrado.</i>';

                camada.bindPopup(
                    `<b>${escaparHtml(rota.origem)} ↔ ${escaparHtml(rota.destino)}</b><br>` +
                    `<span style="font-size:11px">${escaparHtml(rota.descricao)}</span><hr style="margin:5px 0">${cabos}`
                );
                camada.addTo(grupo);
            } catch (err) {
                console.warn('Rota não carregada:', rota.id, err.message);
            }
        }));
    };

    // 2) Carrega datacenters e rotas assim que o mapa estiver pronto
    useEffect(() => {
        if (!pronto) return;
        let cancelado = false;
        (async () => {
            try {
                const dcs = await mapService.listDatacenters();
                if (cancelado) return;
                setDatacenters(dcs);
                desenharDatacenters(dcs);
                await carregarRotas();
            } catch (err) {
                if (!cancelado) setErro(err.message);
            }
        })();
        return () => {
            cancelado = true;
        };
    }, [pronto]);

    const atualizarCabo = (indice, campo, valor) => {
        setForm((f) => ({ ...f, cabos: f.cabos.map((c, i) => (i === indice ? { ...c, [campo]: valor } : c)) }));
    };

    const handleSalvarRota = async (e) => {
        e.preventDefault();
        if (form.origem === form.destino) {
            alert('A origem e o destino não podem ser iguais.');
            return;
        }
        if (!form.file) {
            alert('Selecione o arquivo KMZ ou KML.');
            return;
        }
        const nomeArquivo = form.file.name.toLowerCase();
        if (!nomeArquivo.endsWith('.kmz') && !nomeArquivo.endsWith('.kml')) {
            alert('Use um arquivo .kmz ou .kml.');
            return;
        }

        const cabos = form.cabos.filter((c) => c.nome.trim()).map((c) => ({ nome: c.nome.trim(), cor: c.cor }));
        setSalvando(true);
        try {
            await mapService.saveRoute({
                origem: form.origem,
                destino: form.destino,
                descricao: form.descricao.trim(),
                cabos,
                file: form.file
            }, userEmail);
            setForm(EMPTY_FORM);
            setFileKey((k) => k + 1);
            await carregarRotas();
            alert('Rota cadastrada.');
        } catch (err) {
            alert('Erro ao salvar rota: ' + err.message);
        } finally {
            setSalvando(false);
        }
    };

    const handleExcluirRota = async (rota) => {
        if (!window.confirm(`Excluir a rota ${rota.origem} ↔ ${rota.destino}?`)) return;
        try {
            await mapService.deleteRoute(rota);
            await carregarRotas();
        } catch (err) {
            alert('Erro ao excluir rota: ' + err.message);
        }
    };

    const handleCalcularViabilidade = async () => {
        const partes = viab.coords.split(',').map((s) => parseFloat(s.trim()));
        if (partes.length !== 2 || partes.some((n) => Number.isNaN(n))) {
            alert('Use o formato: latitude, longitude (ex: -3.8914, -38.4483).');
            return;
        }
        const ponto = { lat: partes[0], lng: partes[1] };
        const cpds = datacenters.filter((d) => d.tipo === 'CPD');
        const destino = viab.cpd === 'auto'
            ? cpds.reduce((melhor, d) => (!melhor || distanciaKm(ponto, d) < distanciaKm(ponto, melhor) ? d : melhor), null)
            : cpds.find((d) => d.nome === viab.cpd);
        if (!destino) {
            alert('CPD de destino não encontrado.');
            return;
        }

        setCalculando(true);
        try {
            const r = await mapService.calcularViabilidade([ponto.lng, ponto.lat], [destino.lng, destino.lat]);
            const L = window.L;
            const grupo = camadasRef.current.viab;
            grupo.clearLayers();

            const coords = r.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
            L.marker([ponto.lat, ponto.lng], {
                icon: L.divIcon({
                    className: '',
                    html: '<div style="background:#ff9800;width:14px;height:14px;border-radius:50%;border:2px solid #fff;"></div>',
                    iconSize: [14, 14],
                    iconAnchor: [7, 7]
                })
            }).bindPopup('<b>Ponto de viabilidade</b>').addTo(grupo);
            L.polyline(coords, { color: '#b070ff', weight: 5, opacity: 0.9 }).addTo(grupo);
            mapRef.current.fitBounds(L.latLngBounds(coords));

            setResultado({ cpd: destino.nome, distancia: Math.round(r.distance) });
        } catch (err) {
            alert('Erro ao calcular: ' + err.message);
        } finally {
            setCalculando(false);
        }
    };

    const cpdsOpcoes = datacenters.map((d) => d.nome);

    return (
        <div style={{ display: 'flex', height: '100vh', width: '100%', boxSizing: 'border-box' }}>
            <aside style={{ width: '340px', flexShrink: 0, overflowY: 'auto', padding: '16px', borderRight: '1px solid var(--th-border)', background: 'var(--th-surface)', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--th-text)' }}>Mapa de rede</h2>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '6px', fontSize: '0.7rem', color: 'var(--th-muted)' }}>
                        <span><i className="fa-solid fa-server" style={{ color: CORES_TIPO.CPD }}></i> CPD</span>
                        <span><i className="fa-solid fa-server" style={{ color: CORES_TIPO.COLO }}></i> COLO</span>
                        <span><span style={{ color: '#7c3aed' }}>━</span> Rota</span>
                    </div>
                </div>

                <section>
                    <h3 style={titleStyle}>Cadastrar rota</h3>
                    <form onSubmit={handleSalvarRota} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={labelStyle}>Origem</label>
                        <select value={form.origem} onChange={(e) => setForm({ ...form, origem: e.target.value })} required style={inputStyle}>
                            <option value="">Selecione...</option>
                            {cpdsOpcoes.map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>

                        <label style={labelStyle}>Destino</label>
                        <select value={form.destino} onChange={(e) => setForm({ ...form, destino: e.target.value })} required style={inputStyle}>
                            <option value="">Selecione...</option>
                            {cpdsOpcoes.map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>

                        <label style={labelStyle}>Detalhes (ex: Backbone)</label>
                        <input type="text" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} style={inputStyle} />

                        <label style={labelStyle}>Cabos nesta rota</label>
                        {form.cabos.map((cabo, i) => (
                            <div key={i} style={{ display: 'flex', gap: '5px' }}>
                                <input type="text" value={cabo.nome} placeholder="Nome/ID do cabo" onChange={(e) => atualizarCabo(i, 'nome', e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                                <input type="color" value={cabo.cor} onChange={(e) => atualizarCabo(i, 'cor', e.target.value)} style={{ width: '40px', border: 'none', background: 'none' }} />
                                {form.cabos.length > 1 && (
                                    <button type="button" onClick={() => setForm({ ...form, cabos: form.cabos.filter((_, j) => j !== i) })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>
                                        <i className="fa-solid fa-xmark"></i>
                                    </button>
                                )}
                            </div>
                        ))}
                        <Button size="sm" variant="secondary" onClick={() => setForm({ ...form, cabos: [...form.cabos, { nome: '', cor: '#2196F3' }] })}>
                            + Adicionar cabo
                        </Button>

                        <label style={labelStyle}>Arquivo KMZ / KML (até 10 MB)</label>
                        <input key={fileKey} type="file" accept=".kmz,.kml" onChange={(e) => setForm({ ...form, file: e.target.files[0] || null })} style={{ fontSize: '0.75rem' }} />

                        <Button type="submit" variant="primary" disabled={salvando}>
                            {salvando ? 'Salvando...' : 'Salvar rota'}
                        </Button>
                    </form>
                </section>

                <section>
                    <h3 style={titleStyle}>Viabilidade de ponto</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={labelStyle}>Coordenadas (lat, lng)</label>
                        <input type="text" value={viab.coords} placeholder="Ex: -3.8945, -38.4621" onChange={(e) => setViab({ ...viab, coords: e.target.value })} style={inputStyle} />

                        <label style={labelStyle}>CPD de destino</label>
                        <select value={viab.cpd} onChange={(e) => setViab({ ...viab, cpd: e.target.value })} style={inputStyle}>
                            <option value="auto">Automático (mais próximo)</option>
                            {datacenters.filter((d) => d.tipo === 'CPD').map((d) => <option key={d.nome} value={d.nome}>{d.nome}</option>)}
                        </select>

                        <Button variant="primary" onClick={handleCalcularViabilidade} disabled={calculando || !pronto}>
                            {calculando ? 'Calculando...' : 'Calcular rota e distância'}
                        </Button>

                        {resultado && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--th-text-2)', background: 'var(--th-tint-blue)', padding: '8px', borderRadius: '4px' }}>
                                <div><strong>Destino:</strong> {resultado.cpd}</div>
                                <div><strong>Distância:</strong> {resultado.distancia} metros</div>
                            </div>
                        )}
                    </div>
                </section>

                <section>
                    <h3 style={titleStyle}>Rotas cadastradas ({rotas.length})</h3>
                    {rotas.length === 0 && <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--th-muted)' }}>Nenhuma rota cadastrada.</p>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {rotas.map((r) => (
                            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--th-text-2)', border: '1px solid var(--th-border)', borderRadius: '4px', padding: '5px 8px' }}>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.origem} ↔ {r.destino}</span>
                                <button type="button" title="Excluir rota" onClick={() => handleExcluirRota(r)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>
                                    <i className="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
            </aside>

            <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
                <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
                {!pronto && !erro && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--th-surface-2)', color: 'var(--th-muted)', zIndex: 500 }}>
                        Carregando mapa...
                    </div>
                )}
                {erro && (
                    <div role="alert" style={{ position: 'absolute', top: '12px', left: '12px', right: '12px', zIndex: 500, background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '6px', padding: '10px', fontSize: '0.8rem' }}>
                        Erro no mapa: {erro}
                    </div>
                )}
                <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 600, width: '270px', background: '#ffffff', border: '1px solid #d1d5db', borderRadius: '10px', boxShadow: '0 4px 14px rgba(0,0,0,0.15)', overflow: 'hidden', boxSizing: 'border-box' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px' }}>
                        <span className="status-dot-blink" aria-hidden="true" />
                        <strong style={{ flex: 1, fontSize: '0.85rem', color: '#1f2937' }}>Sem incidentes na rede</strong>
                        <button
                            type="button"
                            onClick={() => setStatusAberto((aberto) => !aberto)}
                            aria-label={statusAberto ? 'Minimizar' : 'Expandir'}
                            title={statusAberto ? 'Minimizar' : 'Expandir'}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '0.9rem', padding: '2px 4px' }}
                        >
                            <i className={statusAberto ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'}></i>
                        </button>
                    </div>
                    {statusAberto && (
                        <div style={{ height: '140px', background: '#ffffff', borderTop: '1px solid #e5e7eb' }} />
                    )}
                </div>
                {cpdSelecionado && (
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 650, width: cpdAba === 'hack' ? 'min(1280px, 96%)' : '560px', maxWidth: 'calc(100% - 40px)', height: cpdAba === 'hack' ? '88%' : '360px', maxHeight: 'calc(100% - 40px)', background: '#ffffff', border: '1px solid #d1d5db', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxSizing: 'border-box' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
                            <i className="fa-solid fa-server" style={{ color: CORES_TIPO[cpdSelecionado.tipo] || '#64748b' }}></i>
                            <strong style={{ flex: 1, fontSize: '1rem', color: '#1f2937' }}>{cpdSelecionado.nome}</strong>
                            <button
                                type="button"
                                onClick={() => setCpdSelecionado(null)}
                                aria-label="Fechar"
                                title="Fechar"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '1rem', padding: '2px 6px' }}
                            >
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
                            <nav style={{ width: '170px', flexShrink: 0, borderRight: '1px solid #e5e7eb', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px', boxSizing: 'border-box' }}>
                                {CPD_ABAS.map((aba) => {
                                    const ativa = cpdAba === aba.id;
                                    return (
                                        <button
                                            key={aba.id}
                                            type="button"
                                            onClick={() => setCpdAba(aba.id)}
                                            style={{ textAlign: 'left', padding: '9px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: ativa ? 700 : 500, color: ativa ? '#ffffff' : '#1f2937', background: ativa ? '#1a73e8' : '#f3f4f6', border: 'none' }}
                                        >
                                            {aba.label}
                                        </button>
                                    );
                                })}
                            </nav>
                            {cpdAba === 'hack' ? (
                                <CpdDiagrama key={cpdSelecionado.nome} cpdNome={cpdSelecionado.nome} podeEditar={true} />
                            ) : (
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', color: '#6b7280', fontSize: '0.95rem', textAlign: 'center' }}>
                                    {cpdAba ? 'trabalhando nisso' : 'Selecione uma opção'}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
