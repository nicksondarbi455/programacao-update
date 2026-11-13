import { useEffect, useRef, useState } from 'react';
import { loadMapLibs, parseRouteFile } from '../utils/mapLoader';
import { mapService } from '../services/mapService';
import { projectMapService } from '../services/projectMapService';
import { supabaseService } from '../services/supabaseService';
import { ProjectSettingsModal } from '../components/organisms/ProjectSettingsModal';
import { CalendarWidget } from '../components/organisms/CalendarWidget';
import { Modals } from '../components/organisms/Modals';
import { localDateStr } from '../utils/dates';
import { ProjectIconPicker } from '../components/molecules/ProjectIconPicker';
import { Button } from '../components/atoms/Button';
import { Checkbox } from '../components/atoms/Checkbox';

const TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';
const CORES_TIPO = { CPD: '#2563eb', COLO: '#16a34a', OUTRO: '#64748b' };
const ICONE_TIPO = { CPD: 'fa-solid fa-server', COLO: 'fa-solid fa-building', OUTRO: 'fa-solid fa-location-dot' };
const CORES_ANOTACAO = ['#f59e0b', '#ef4444', '#22c55e', '#3b82f6', '#a855f7'];
const LIMITE_KMZ = 10 * 1024 * 1024;
const ABAS = [
    { id: 'objetos', label: 'Objetos' },
    { id: 'anotacoes', label: 'Anotações' },
    { id: 'rotas', label: 'Rotas' },
    { id: 'viabilidade', label: 'Viabilidade' }
];

const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '7px 8px', background: 'var(--th-surface-2)', border: '1px solid var(--th-border-strong)', borderRadius: '4px', fontSize: '0.8rem', color: 'var(--th-text)', fontFamily: 'inherit' };
const labelStyle = { fontSize: '0.72rem', color: 'var(--th-muted)', fontWeight: 'bold' };
const titleStyle = { margin: '0 0 8px 0', fontSize: '0.9rem', fontWeight: 700, color: 'var(--th-text)' };
const itemStyle = { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--th-text-2)', border: '1px solid var(--th-border)', borderRadius: '4px', padding: '6px 8px', cursor: 'pointer' };

function escapar(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Lê "latitude, longitude" (ex.: -3.8914, -38.4483), como o Google Maps copia
function lerCoordenadas(texto) {
    const partes = String(texto || '').trim().split(/[,;\s]+/).filter(Boolean).map(Number);
    if (partes.length !== 2 || partes.some((n) => Number.isNaN(n))) return null;
    const [lat, lng] = partes;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat, lng };
}

const textoCoordenadas = (lat, lng) => `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

const iconeDoObjeto = (o) => o.icone || ICONE_TIPO[o.tipo] || ICONE_TIPO.OUTRO;
const corDoObjeto = (o) => CORES_TIPO[o.tipo] || CORES_TIPO.OUTRO;

// Projeto do tipo "mapa": objetos, rotas KMZ, anotações e agenda próprias do projeto.
// Usa o Leaflet e as mesmas funções de leitura de KMZ e de viabilidade do mapa oficial,
// mas não lê nem altera nenhuma tabela ou arquivo do mapa oficial.
export function ProjectMapPage({ project, userEmail, onBackToDashboard, onProjectUpdated }) {
    const podeEditar = !!project.canEdit;
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const camadasRef = useRef({});
    const modoRef = useRef(null);
    const podeRef = useRef(podeEditar);
    const aoClicarRef = useRef(null);
    podeRef.current = podeEditar;

    const [pronto, setPronto] = useState(false);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState('');
    const [salvando, setSalvando] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);

    const [objetos, setObjetos] = useState([]);
    const [anotacoes, setAnotacoes] = useState([]);
    const [rotas, setRotas] = useState([]);
    const [oficiais, setOficiais] = useState([]);
    // Rotas do mapa real (somente leitura) e as camadas já lidas dos arquivos KMZ
    const [oficialRotas, setOficialRotas] = useState([]);
    const [camadasRotasOficiais, setCamadasRotasOficiais] = useState([]);
    const [mostrarOficial, setMostrarOficial] = useState(true);

    const [aba, setAba] = useState('objetos');
    // Modo de posicionamento no mapa: null | 'objeto' | 'anotacao'
    const [modo, setModo] = useState(null);
    modoRef.current = modo;
    // Item sendo criado ou editado no painel: { kind: 'objeto' | 'anotacao', id?, lat, lng, ... }
    const [rascunho, setRascunho] = useState(null);
    // Texto colado com as coordenadas, antes de criar o item
    const [colarObjeto, setColarObjeto] = useState('');
    const [colarAnotacao, setColarAnotacao] = useState('');

    const [rotaForm, setRotaForm] = useState({ nome: '', descricao: '', origemId: '', destinoId: '', file: null });
    const [fileKey, setFileKey] = useState(0);

    // Agenda do projeto: a mesma tabela (schedules) e os mesmos componentes das tabelas
    const [schedules, setSchedules] = useState(project.schedules || {});
    const [calendarioAberto, setCalendarioAberto] = useState(false);
    const [modalDia, setModalDia] = useState({ isOpen: false, dateStr: '', friendlyDate: '', items: [], equipments: [] });

    const [viab, setViab] = useState({ origemTipo: 'coords', coords: '', origemObjetoId: '', destinoKey: '' });
    const [resultado, setResultado] = useState(null);
    const [calculando, setCalculando] = useState(false);

    const aplicar = (dados) => {
        setObjetos(dados.objetos);
        setAnotacoes(dados.anotacoes);
        setRotas(dados.rotas);
    };

    const recarregar = async () => {
        aplicar(await projectMapService.carregar(project.id));
    };

    // Carrega os dados do projeto e os CPDs oficiais (só para a viabilidade)
    useEffect(() => {
        let ativo = true;
        (async () => {
            try {
                // Só leitura no mapa real: listDatacenters e listRoutes não alteram nada
                const [dados, dcs, rotasOf] = await Promise.all([
                    projectMapService.carregar(project.id),
                    mapService.listDatacenters(),
                    mapService.listRoutes()
                ]);
                if (!ativo) return;
                aplicar(dados);
                setOficiais(dcs);
                setOficialRotas(rotasOf);
            } catch (e) {
                if (ativo) setErro(e.message || 'Não foi possível carregar o mapa do projeto.');
            } finally {
                if (ativo) setCarregando(false);
            }
        })();
        return () => {
            ativo = false;
        };
    }, [project.id]);

    // Cria o mapa uma vez. Cliques no mapa passam pelo ref para usar sempre o modo atual.
    useEffect(() => {
        let cancelado = false;
        let mapa = null;

        loadMapLibs()
            .then((L) => {
                if (cancelado) return;
                mapa = L.map(containerRef.current).setView([-3.89, -38.46], 10);
                L.tileLayer(TILE_URL, { attribution: 'Tiles &copy; Esri', maxZoom: 16 }).addTo(mapa);
                // Ordem de baixo para cima: rede oficial primeiro, depois o que é do projeto
                camadasRef.current = {
                    oficialRotas: L.layerGroup().addTo(mapa),
                    rotas: L.layerGroup().addTo(mapa),
                    oficialCpds: L.layerGroup().addTo(mapa),
                    objetos: L.layerGroup().addTo(mapa),
                    anotacoes: L.layerGroup().addTo(mapa),
                    viab: L.layerGroup().addTo(mapa),
                    rascunho: L.layerGroup().addTo(mapa)
                };
                mapa.on('click', (e) => aoClicarRef.current?.(e.latlng));
                mapRef.current = mapa;
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

    // Clique no mapa: com um modo ativo, abre o formulário do novo item já com a posição
    aoClicarRef.current = ({ lat, lng }) => {
        const m = modoRef.current;
        if (!m || !podeRef.current) return;
        if (m === 'objeto') {
            setAba('objetos');
            setRascunho({ kind: 'objeto', lat, lng, coordTexto: textoCoordenadas(lat, lng), nome: '', categoria: 'CPD', icone: null, descricao: '' });
        } else {
            setAba('anotacoes');
            setRascunho({ kind: 'anotacao', lat, lng, coordTexto: textoCoordenadas(lat, lng), texto: '', cor: CORES_ANOTACAO[0] });
        }
        setModo(null);
    };

    const focar = (lat, lng) => {
        const mapa = mapRef.current;
        if (mapa) mapa.setView([lat, lng], Math.max(mapa.getZoom(), 13));
    };

    const editarObjeto = (o) => {
        setAba('objetos');
        setModo(null);
        setRascunho({ kind: 'objeto', id: o.id, lat: o.lat, lng: o.lng, coordTexto: textoCoordenadas(o.lat, o.lng), nome: o.nome, categoria: o.tipo, icone: o.icone, descricao: o.descricao || '' });
        focar(o.lat, o.lng);
    };

    const editarAnotacao = (n) => {
        setAba('anotacoes');
        setModo(null);
        setRascunho({ kind: 'anotacao', id: n.id, lat: n.lat, lng: n.lng, coordTexto: textoCoordenadas(n.lat, n.lng), texto: n.texto, cor: n.cor });
        focar(n.lat, n.lng);
    };

    // Rede oficial (somente leitura): CPDs e COLOs do mapa real
    useEffect(() => {
        const L = window.L;
        const grupo = camadasRef.current.oficialCpds;
        if (!pronto || !L || !grupo) return;
        grupo.clearLayers();
        if (!mostrarOficial) return;
        oficiais.forEach((d) => {
            const cor = CORES_TIPO[d.tipo] || CORES_TIPO.OUTRO;
            L.marker([d.lat, d.lng], {
                icon: L.divIcon({
                    className: '',
                    html: `<i class="fa-solid fa-server" style="color:${cor};font-size:18px;line-height:18px;text-shadow:0 0 3px #fff,0 0 3px #fff;"></i>`,
                    iconSize: [18, 18],
                    iconAnchor: [9, 9]
                })
            })
                .bindTooltip(escapar(d.nome), { permanent: true, direction: 'right', offset: [10, 0], className: 'cpd-tooltip' })
                .bindPopup(`<b>${escapar(d.nome)}</b><br><span style="font-size:11px">${escapar(d.tipo)} · rede oficial (somente leitura)</span>`)
                .addTo(grupo);
        });
    }, [oficiais, mostrarOficial, pronto]);

    // Lê os KMZ da rede oficial uma vez. Só download: nada é gravado no mapa real.
    useEffect(() => {
        if (!pronto) return;
        let cancelado = false;
        (async () => {
            const camadas = [];
            for (const r of oficialRotas) {
                if (cancelado) return;
                try {
                    const arquivo = await mapService.downloadRouteFile(r.arquivo_path);
                    const camada = await parseRouteFile(arquivo, r.nome_arquivo);
                    if (camada.setStyle) camada.setStyle({ color: '#7c3aed', weight: 2, opacity: 0.85 });
                    const cabos = (r.cabos || []).map((c) =>
                        `<div style="display:flex;align-items:center;gap:5px;font-size:12px;margin-bottom:3px;">` +
                        `<span style="width:10px;height:10px;border-radius:50%;background:${escapar(c.cor)}"></span>${escapar(c.nome)}</div>`
                    ).join('') || '<i style="font-size:11px;color:#888">Nenhum cabo cadastrado.</i>';
                    camada.bindPopup(
                        `<b>${escapar(r.origem)} ↔ ${escapar(r.destino)}</b><br>` +
                        `<span style="font-size:11px">${escapar(r.descricao)}</span><hr style="margin:5px 0">${cabos}` +
                        `<div style="font-size:10px;color:#888;margin-top:4px">Rede oficial (somente leitura)</div>`
                    );
                    camadas.push(camada);
                } catch (err) {
                    console.warn('Rota oficial não carregada:', r.id, err.message);
                }
            }
            if (!cancelado) setCamadasRotasOficiais(camadas);
        })();
        return () => {
            cancelado = true;
        };
    }, [oficialRotas, pronto]);

    // Mostra ou esconde as rotas oficiais sem baixar os arquivos de novo
    useEffect(() => {
        const grupo = camadasRef.current.oficialRotas;
        if (!pronto || !grupo) return;
        grupo.clearLayers();
        if (mostrarOficial) camadasRotasOficiais.forEach((c) => c.addTo(grupo));
    }, [camadasRotasOficiais, mostrarOficial, pronto]);

    // Desenha os objetos do projeto
    useEffect(() => {
        const L = window.L;
        const grupo = camadasRef.current.objetos;
        if (!pronto || !L || !grupo) return;
        grupo.clearLayers();
        objetos.forEach((o) => {
            const cor = corDoObjeto(o);
            L.marker([o.lat, o.lng], {
                icon: L.divIcon({
                    className: '',
                    html: `<i class="${escapar(iconeDoObjeto(o))}" style="color:${cor};font-size:18px;line-height:18px;text-shadow:0 0 3px #fff,0 0 3px #fff;"></i>`,
                    iconSize: [18, 18],
                    iconAnchor: [9, 9]
                })
            })
                .bindTooltip(escapar(o.nome), { permanent: true, direction: 'right', offset: [10, 0], className: 'cpd-tooltip' })
                .on('click', () => editarObjeto(o))
                .addTo(grupo);
        });
    }, [objetos, pronto]);

    // Desenha as anotações
    useEffect(() => {
        const L = window.L;
        const grupo = camadasRef.current.anotacoes;
        if (!pronto || !L || !grupo) return;
        grupo.clearLayers();
        anotacoes.forEach((n) => {
            L.marker([n.lat, n.lng], {
                icon: L.divIcon({
                    className: '',
                    html: `<div style="background:${escapar(n.cor)};color:#fff;padding:2px 6px;border-radius:4px;font-size:11px;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,.3);">${escapar(n.texto)}</div>`,
                    iconSize: null,
                    iconAnchor: [0, 10]
                })
            })
                .on('click', () => editarAnotacao(n))
                .addTo(grupo);
        });
    }, [anotacoes, pronto]);

    // Marca no mapa o ponto do item em criação/edição, até salvar ou cancelar
    useEffect(() => {
        const L = window.L;
        const grupo = camadasRef.current.rascunho;
        if (!pronto || !L || !grupo) return;
        grupo.clearLayers();
        const c = rascunho ? lerCoordenadas(rascunho.coordTexto) : null;
        if (c) {
            L.circleMarker([c.lat, c.lng], { radius: 9, color: '#2563eb', weight: 3, fillColor: '#2563eb', fillOpacity: 0.25 }).addTo(grupo);
        }
    }, [rascunho, pronto]);

    // Desenha as rotas KMZ/KML do projeto (lidas uma vez por carregamento da lista)
    useEffect(() => {
        const L = window.L;
        const grupo = camadasRef.current.rotas;
        if (!pronto || !L || !grupo) return;
        let cancelado = false;
        grupo.clearLayers();
        (async () => {
            for (const r of rotas) {
                if (cancelado) return;
                try {
                    const arquivo = await projectMapService.baixarArquivoRota(r.arquivo_path);
                    const camada = await parseRouteFile(arquivo, r.nome_arquivo);
                    if (camada.setStyle) camada.setStyle({ color: '#0d9488', weight: 3, opacity: 0.85 });
                    camada.bindPopup(`<b>${escapar(r.nome)}</b><br><span style="font-size:11px">${escapar(r.descricao)}</span>`);
                    if (!cancelado) camada.addTo(grupo);
                } catch (err) {
                    console.warn('Rota não carregada:', r.id, err.message);
                }
            }
        })();
        return () => {
            cancelado = true;
        };
    }, [rotas, pronto]);

    const executar = async (acao) => {
        setSalvando(true);
        setErro('');
        try {
            await acao();
            await recarregar();
            return true;
        } catch (e) {
            setErro(e.message || 'Não foi possível salvar.');
            return false;
        } finally {
            setSalvando(false);
        }
    };

    const alternarModo = (novo) => {
        setRascunho(null);
        setModo((atual) => (atual === novo ? null : novo));
    };

    // Cria o item já na posição das coordenadas coladas, sem precisar clicar no mapa
    const criarObjetoPelasCoordenadas = () => {
        const c = lerCoordenadas(colarObjeto);
        if (!c) {
            setErro('Coordenadas inválidas. Use: latitude, longitude (ex: -3.8914, -38.4483).');
            return;
        }
        setErro('');
        setModo(null);
        setAba('objetos');
        setRascunho({ kind: 'objeto', lat: c.lat, lng: c.lng, coordTexto: textoCoordenadas(c.lat, c.lng), nome: '', categoria: 'CPD', icone: null, descricao: '' });
        setColarObjeto('');
        focar(c.lat, c.lng);
    };

    const criarAnotacaoPelasCoordenadas = () => {
        const c = lerCoordenadas(colarAnotacao);
        if (!c) {
            setErro('Coordenadas inválidas. Use: latitude, longitude (ex: -3.8914, -38.4483).');
            return;
        }
        setErro('');
        setModo(null);
        setAba('anotacoes');
        setRascunho({ kind: 'anotacao', lat: c.lat, lng: c.lng, coordTexto: textoCoordenadas(c.lat, c.lng), texto: '', cor: CORES_ANOTACAO[0] });
        setColarAnotacao('');
        focar(c.lat, c.lng);
    };

    // --- Objetos ---
    const salvarObjeto = async () => {
        const r = rascunho;
        const coord = lerCoordenadas(r.coordTexto);
        if (!r.nome.trim()) {
            setErro('Informe o nome do objeto.');
            return;
        }
        if (!coord) {
            setErro('Coordenadas inválidas. Use: latitude, longitude (ex: -3.8914, -38.4483).');
            return;
        }
        const ok = await executar(() => projectMapService.salvarObjeto(project.id, {
            id: r.id,
            nome: r.nome.trim(),
            tipo: r.categoria,
            lat: coord.lat,
            lng: coord.lng,
            icone: r.icone,
            descricao: r.descricao.trim()
        }, userEmail));
        if (ok) setRascunho(null);
    };

    const excluirObjeto = async (id) => {
        if (!window.confirm('Excluir este objeto? As rotas ligadas a ele continuam, sem a origem ou o destino.')) return;
        const ok = await executar(() => projectMapService.excluirObjeto(id));
        if (ok) setRascunho(null);
    };

    // --- Anotações ---
    const salvarAnotacao = async () => {
        const r = rascunho;
        const coord = lerCoordenadas(r.coordTexto);
        if (!r.texto.trim()) {
            setErro('Escreva o texto da anotação.');
            return;
        }
        if (!coord) {
            setErro('Coordenadas inválidas. Use: latitude, longitude (ex: -3.8914, -38.4483).');
            return;
        }
        const ok = await executar(() => projectMapService.salvarAnotacao(project.id, {
            id: r.id, texto: r.texto.trim(), cor: r.cor, lat: coord.lat, lng: coord.lng
        }, userEmail));
        if (ok) setRascunho(null);
    };

    const excluirAnotacao = async (id) => {
        if (!window.confirm('Excluir esta anotação?')) return;
        const ok = await executar(() => projectMapService.excluirAnotacao(id));
        if (ok) setRascunho(null);
    };

    // --- Rotas ---
    const salvarRota = async (e) => {
        e.preventDefault();
        const { file } = rotaForm;
        if (!rotaForm.nome.trim()) return setErro('Informe o nome da rota.');
        if (!file) return setErro('Selecione o arquivo KMZ ou KML.');
        const nome = file.name.toLowerCase();
        if (!nome.endsWith('.kmz') && !nome.endsWith('.kml')) return setErro('Use um arquivo .kmz ou .kml.');
        if (file.size > LIMITE_KMZ) return setErro('O arquivo passa de 10 MB.');
        if (rotaForm.origemId && rotaForm.origemId === rotaForm.destinoId) return setErro('A origem e o destino não podem ser iguais.');

        const ok = await executar(() => projectMapService.salvarRota(project.id, {
            nome: rotaForm.nome.trim(),
            descricao: rotaForm.descricao.trim(),
            origemId: rotaForm.origemId,
            destinoId: rotaForm.destinoId,
            file
        }, userEmail));
        if (ok) {
            setRotaForm({ nome: '', descricao: '', origemId: '', destinoId: '', file: null });
            setFileKey((k) => k + 1);
        }
    };

    const excluirRota = async (rota) => {
        if (!window.confirm(`Excluir a rota "${rota.nome}"?`)) return;
        await executar(() => projectMapService.excluirRota(rota));
    };

    // --- Viabilidade ---
    const destinoPorChave = (chave) => {
        if (chave.startsWith('obj:')) {
            const o = objetos.find((x) => x.id === chave.slice(4));
            return o ? { lat: o.lat, lng: o.lng, nome: o.nome } : null;
        }
        const d = oficiais.find((x) => x.nome === chave.slice(8));
        return d ? { lat: d.lat, lng: d.lng, nome: d.nome } : null;
    };

    const calcularViabilidade = async () => {
        let origem;
        if (viab.origemTipo === 'coords') {
            const partes = viab.coords.split(',').map((s) => parseFloat(s.trim()));
            if (partes.length !== 2 || partes.some((n) => Number.isNaN(n))) {
                setErro('Use o formato: latitude, longitude (ex: -3.8914, -38.4483).');
                return;
            }
            origem = { lat: partes[0], lng: partes[1], nome: 'Ponto informado' };
        } else {
            const o = objetos.find((x) => x.id === viab.origemObjetoId);
            if (!o) {
                setErro('Escolha o objeto de origem.');
                return;
            }
            origem = { lat: o.lat, lng: o.lng, nome: o.nome };
        }
        const destino = destinoPorChave(viab.destinoKey);
        if (!destino) {
            setErro('Escolha o destino.');
            return;
        }

        setCalculando(true);
        setErro('');
        try {
            const r = await projectMapService.calcularViabilidade([origem.lng, origem.lat], [destino.lng, destino.lat]);
            const L = window.L;
            const grupo = camadasRef.current.viab;
            grupo.clearLayers();
            const coords = r.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
            L.marker([origem.lat, origem.lng], {
                icon: L.divIcon({
                    className: '',
                    html: '<div style="background:#ff9800;width:14px;height:14px;border-radius:50%;border:2px solid #fff;"></div>',
                    iconSize: [14, 14],
                    iconAnchor: [7, 7]
                })
            }).bindPopup(`<b>${escapar(origem.nome)}</b>`).addTo(grupo);
            L.polyline(coords, { color: '#b070ff', weight: 5, opacity: 0.9 }).addTo(grupo);
            mapRef.current.fitBounds(L.latLngBounds(coords));
            setResultado({ destino: destino.nome, distancia: Math.round(r.distance) });
        } catch (e) {
            setErro('Erro ao calcular: ' + e.message);
        } finally {
            setCalculando(false);
        }
    };

    // --- Calendário: mesma agenda das tabelas (grava em schedules) ---
    const gravarDia = async (dateStr, items) => {
        const proximo = { ...schedules };
        if (items.length === 0) delete proximo[dateStr];
        else proximo[dateStr] = items;
        setSchedules(proximo);
        setModalDia((prev) => ({ ...prev, items }));
        try {
            await supabaseService.saveSchedule(project.id, dateStr, items);
        } catch (e) {
            setErro(e.message || 'Não foi possível guardar o agendamento.');
        }
    };

    const abrirDia = (dateStr, friendlyDate) => {
        setModalDia({ isOpen: true, dateStr, friendlyDate, items: schedules[dateStr] || [], equipments: [] });
    };

    const fecharDia = () => {
        setModalDia({ isOpen: false, dateStr: '', friendlyDate: '', items: [], equipments: [] });
    };

    const agendarEvento = async (titulo, hora = '') => {
        const dateStr = modalDia.dateStr;
        const atual = schedules[dateStr] || [];
        if (atual.some((i) => i.text === titulo)) return alert('Este evento já está agendado para este dia!');
        await gravarDia(dateStr, [...atual, { text: titulo, completed: false, statusText: 'Agendado', ...(hora ? { hora } : {}) }]);
    };

    const alternarConcluido = async (dateStr, idx) => {
        const proximo = (schedules[dateStr] || []).map((item, i) => {
            if (i !== idx) return { ...item };
            const concluido = !item.completed;
            return {
                ...item,
                completed: concluido,
                completedAt: concluido ? new Date().toISOString() : undefined,
                statusText: concluido ? '✔ Realizado com Sucesso' : '⏳ Pendente / Agendado'
            };
        });
        await gravarDia(dateStr, proximo);
    };

    const removerEvento = async (dateStr, idx) => {
        await gravarDia(dateStr, (schedules[dateStr] || []).filter((_, i) => i !== idx));
    };

    // Selos do calendário: itens pendentes desta semana e de amanhã
    const hoje = new Date();
    const amanha = new Date(hoje);
    amanha.setDate(hoje.getDate() + 1);
    const amanhaStr = localDateStr(amanha);
    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - hoje.getDay());
    inicioSemana.setHours(0, 0, 0, 0);
    const fimSemana = new Date(inicioSemana);
    fimSemana.setDate(inicioSemana.getDate() + 6);
    fimSemana.setHours(23, 59, 59, 999);
    let weekCount = 0;
    let tomorrowCount = 0;
    Object.entries(schedules).forEach(([dateStr, items]) => {
        const [a, m, d] = dateStr.split('-').map(Number);
        const data = new Date(a, m - 1, d);
        const pendentes = (items || []).filter((i) => !i.completed).length;
        if (data >= inicioSemana && data <= fimSemana) weekCount += pendentes;
        if (dateStr === amanhaStr) tomorrowCount += pendentes;
    });

    const handleSaveSettings = async (campos) => {
        await supabaseService.updateProject(project.id, campos);
        setSettingsOpen(false);
        if (onProjectUpdated) onProjectUpdated({ ...project, ...campos });
    };

    const handleDeleteProject = async () => {
        try {
            await supabaseService.deleteProject(project.id, project.name);
            onBackToDashboard();
        } catch (e) {
            setSettingsOpen(false);
            setErro(e.message || 'Não foi possível excluir o projeto.');
        }
    };

    const botaoAba = (id, label) => {
        const ativa = aba === id;
        return (
            <button
                key={id}
                type="button"
                onClick={() => setAba(id)}
                style={{ padding: '5px 9px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: ativa ? 700 : 500, color: ativa ? '#ffffff' : 'var(--th-text)', background: ativa ? '#1a73e8' : 'var(--th-surface-2)', border: '1px solid var(--th-border)' }}
            >
                {label}
            </button>
        );
    };

    const rascunhoObjeto = rascunho?.kind === 'objeto' ? rascunho : null;
    const rascunhoAnotacao = rascunho?.kind === 'anotacao' ? rascunho : null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', boxSizing: 'border-box' }}>
            {settingsOpen && (
                <ProjectSettingsModal
                    project={project}
                    onSave={handleSaveSettings}
                    onClose={() => setSettingsOpen(false)}
                    onDelete={project.canManage ? handleDeleteProject : undefined}
                />
            )}

            <div style={{ background: '#1e293b', padding: '8px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Mapa do projeto: {project.name} {project.isPrivate ? '🔒' : ''}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {project.canManage && (
                        <Button variant="secondary" size="sm" onClick={() => setSettingsOpen(true)}>
                            <i className="fa-solid fa-gear"></i> Configurações
                        </Button>
                    )}
                    <Button variant="secondary" size="sm" onClick={onBackToDashboard}>Voltar</Button>
                </div>
            </div>

            <CalendarWidget
                isOpen={calendarioAberto}
                onToggle={() => setCalendarioAberto((v) => !v)}
                schedules={schedules}
                equipments={[]}
                onOpenModal={abrirDia}
                onToggleComplete={alternarConcluido}
                weekCount={weekCount}
                tomorrowCount={tomorrowCount}
                projectType="pontual"
            />

            <Modals
                modalData={modalDia}
                onCloseModal={fecharDia}
                onSaveEvent={agendarEvento}
                onDeleteSchedule={removerEvento}
                onToggleCompleteSchedule={alternarConcluido}
                colModalOpen={false}
                columnConfig={[]}
                textoLivre
            />

            {erro && (
                <div role="alert" style={{ background: '#fef2f2', color: '#b91c1c', borderBottom: '1px solid #fecaca', padding: '6px 15px', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>⚠️ {erro}</span>
                    <button type="button" onClick={() => setErro('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c', fontWeight: 'bold' }}>×</button>
                </div>
            )}

            <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
                <aside style={{ width: '340px', flexShrink: 0, overflowY: 'auto', padding: '14px', borderRight: '1px solid var(--th-border)', background: 'var(--th-surface)', display: 'flex', flexDirection: 'column', gap: '12px', boxSizing: 'border-box' }}>
                    {!podeEditar && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--th-muted)' }}>Somente leitura: você pode ver, mas não alterar.</span>
                    )}

                    <section style={{ display: 'flex', flexDirection: 'column', gap: '6px', border: '1px solid var(--th-border)', borderRadius: '6px', padding: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--th-text)', cursor: 'pointer' }}>
                            <Checkbox checked={mostrarOficial} onChange={(e) => setMostrarOficial(e.target.checked)} />
                            Mostrar rede oficial
                        </label>
                        <span style={{ fontSize: '0.7rem', color: 'var(--th-muted)' }}>
                            {oficiais.length} pontos e {oficialRotas.length} rotas do mapa real, somente leitura.
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '0.7rem', color: 'var(--th-muted)' }}>
                            <span><i className="fa-solid fa-server" style={{ color: CORES_TIPO.CPD }}></i> CPD oficial</span>
                            <span><span style={{ color: '#7c3aed' }}>━</span> Rota oficial</span>
                            <span><span style={{ color: '#0d9488' }}>━</span> Rota do projeto</span>
                        </div>
                    </section>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {ABAS.map((a) => botaoAba(a.id, a.label))}
                    </div>

                    {carregando && <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--th-muted)' }}>Carregando...</p>}

                    {aba === 'objetos' && (
                        <section style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <h3 style={titleStyle}>Objetos do projeto ({objetos.length})</h3>
                            {podeEditar && (
                                <Button variant={modo === 'objeto' ? 'primary' : 'secondary'} onClick={() => alternarModo('objeto')} disabled={salvando}>
                                    {modo === 'objeto' ? 'Cancelar posicionamento' : '+ Adicionar objeto no mapa'}
                                </Button>
                            )}
                            {modo === 'objeto' && (
                                <p style={{ margin: 0, fontSize: '0.75rem', color: '#2563eb' }}>Clique no mapa onde o objeto deve ficar.</p>
                            )}

                            {podeEditar && !rascunhoObjeto && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={labelStyle}>Ou cole as coordenadas (lat, lng)</label>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <input type="text" value={colarObjeto} placeholder="-3.8914, -38.4483" onChange={(e) => setColarObjeto(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                                        <Button variant="secondary" onClick={criarObjetoPelasCoordenadas} disabled={!colarObjeto.trim()}>Criar aqui</Button>
                                    </div>
                                </div>
                            )}

                            {rascunhoObjeto && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', border: '1px solid var(--th-border-strong)', borderRadius: '6px', padding: '10px' }}>
                                    <label style={labelStyle}>Nome</label>
                                    <input type="text" value={rascunhoObjeto.nome} disabled={!podeEditar} onChange={(e) => setRascunho({ ...rascunhoObjeto, nome: e.target.value })} style={inputStyle} />

                                    <label style={labelStyle}>Tipo</label>
                                    <select value={rascunhoObjeto.categoria} disabled={!podeEditar} onChange={(e) => setRascunho({ ...rascunhoObjeto, categoria: e.target.value })} style={inputStyle}>
                                        <option value="CPD">CPD</option>
                                        <option value="COLO">COLO</option>
                                        <option value="OUTRO">Outro</option>
                                    </select>

                                    <label style={labelStyle}>Ícone</label>
                                    <ProjectIconPicker
                                        value={rascunhoObjeto.icone || ICONE_TIPO[rascunhoObjeto.categoria]}
                                        onChange={(v) => setRascunho({ ...rascunhoObjeto, icone: v })}
                                    />

                                    <label style={labelStyle}>Descrição</label>
                                    <input type="text" value={rascunhoObjeto.descricao} disabled={!podeEditar} onChange={(e) => setRascunho({ ...rascunhoObjeto, descricao: e.target.value })} style={inputStyle} />

                                    <label style={labelStyle}>Coordenadas (lat, lng)</label>
                                    <input
                                        type="text"
                                        value={rascunhoObjeto.coordTexto}
                                        disabled={!podeEditar}
                                        onChange={(e) => {
                                            const c = lerCoordenadas(e.target.value);
                                            setRascunho({ ...rascunhoObjeto, coordTexto: e.target.value, ...(c ? { lat: c.lat, lng: c.lng } : {}) });
                                        }}
                                        style={inputStyle}
                                    />
                                    {!lerCoordenadas(rascunhoObjeto.coordTexto) && (
                                        <span style={{ fontSize: '0.7rem', color: '#b91c1c' }}>Coordenadas inválidas. Use: latitude, longitude.</span>
                                    )}

                                    {podeEditar && (
                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                            {rascunhoObjeto.id && (
                                                <Button variant="danger" onClick={() => excluirObjeto(rascunhoObjeto.id)} disabled={salvando}>Excluir</Button>
                                            )}
                                            <Button variant="secondary" onClick={() => setRascunho(null)} disabled={salvando}>Cancelar</Button>
                                            <Button variant="primary" onClick={salvarObjeto} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</Button>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                {objetos.length === 0 && <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--th-muted)' }}>Nenhum objeto cadastrado.</p>}
                                {objetos.map((o) => (
                                    <div key={o.id} style={itemStyle} onClick={() => editarObjeto(o)}>
                                        <i className={iconeDoObjeto(o)} style={{ color: corDoObjeto(o), width: '16px', textAlign: 'center' }}></i>
                                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.nome}</span>
                                        <span style={{ fontSize: '0.68rem', color: 'var(--th-muted)' }}>{o.tipo}</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {aba === 'anotacoes' && (
                        <section style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <h3 style={titleStyle}>Anotações no mapa ({anotacoes.length})</h3>
                            {podeEditar && (
                                <Button variant={modo === 'anotacao' ? 'primary' : 'secondary'} onClick={() => alternarModo('anotacao')} disabled={salvando}>
                                    {modo === 'anotacao' ? 'Cancelar posicionamento' : '+ Adicionar anotação no mapa'}
                                </Button>
                            )}
                            {modo === 'anotacao' && (
                                <p style={{ margin: 0, fontSize: '0.75rem', color: '#2563eb' }}>Clique no mapa onde a anotação deve ficar.</p>
                            )}

                            {podeEditar && !rascunhoAnotacao && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={labelStyle}>Ou cole as coordenadas (lat, lng)</label>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <input type="text" value={colarAnotacao} placeholder="-3.8914, -38.4483" onChange={(e) => setColarAnotacao(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                                        <Button variant="secondary" onClick={criarAnotacaoPelasCoordenadas} disabled={!colarAnotacao.trim()}>Criar aqui</Button>
                                    </div>
                                </div>
                            )}

                            {rascunhoAnotacao && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', border: '1px solid var(--th-border-strong)', borderRadius: '6px', padding: '10px' }}>
                                    <label style={labelStyle}>Texto</label>
                                    <textarea value={rascunhoAnotacao.texto} disabled={!podeEditar} onChange={(e) => setRascunho({ ...rascunhoAnotacao, texto: e.target.value })} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />

                                    <label style={labelStyle}>Coordenadas (lat, lng)</label>
                                    <input
                                        type="text"
                                        value={rascunhoAnotacao.coordTexto}
                                        disabled={!podeEditar}
                                        onChange={(e) => {
                                            const c = lerCoordenadas(e.target.value);
                                            setRascunho({ ...rascunhoAnotacao, coordTexto: e.target.value, ...(c ? { lat: c.lat, lng: c.lng } : {}) });
                                        }}
                                        style={inputStyle}
                                    />
                                    {!lerCoordenadas(rascunhoAnotacao.coordTexto) && (
                                        <span style={{ fontSize: '0.7rem', color: '#b91c1c' }}>Coordenadas inválidas. Use: latitude, longitude.</span>
                                    )}

                                    <label style={labelStyle}>Cor</label>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        {CORES_ANOTACAO.map((cor) => (
                                            <button
                                                key={cor}
                                                type="button"
                                                disabled={!podeEditar}
                                                onClick={() => setRascunho({ ...rascunhoAnotacao, cor })}
                                                aria-label={`Cor ${cor}`}
                                                style={{ width: '22px', height: '22px', borderRadius: '50%', background: cor, cursor: 'pointer', border: rascunhoAnotacao.cor === cor ? '3px solid var(--th-text)' : '1px solid var(--th-border)' }}
                                            />
                                        ))}
                                    </div>

                                    {podeEditar && (
                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                            {rascunhoAnotacao.id && (
                                                <Button variant="danger" onClick={() => excluirAnotacao(rascunhoAnotacao.id)} disabled={salvando}>Excluir</Button>
                                            )}
                                            <Button variant="secondary" onClick={() => setRascunho(null)} disabled={salvando}>Cancelar</Button>
                                            <Button variant="primary" onClick={salvarAnotacao} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</Button>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                {anotacoes.length === 0 && <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--th-muted)' }}>Nenhuma anotação.</p>}
                                {anotacoes.map((n) => (
                                    <div key={n.id} style={itemStyle} onClick={() => editarAnotacao(n)}>
                                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: n.cor, flexShrink: 0 }}></span>
                                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.texto}</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {aba === 'rotas' && (
                        <section style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <h3 style={titleStyle}>Rotas do projeto ({rotas.length})</h3>
                            {podeEditar && (
                                <form onSubmit={salvarRota} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={labelStyle}>Nome da rota</label>
                                    <input type="text" value={rotaForm.nome} onChange={(e) => setRotaForm({ ...rotaForm, nome: e.target.value })} style={inputStyle} />

                                    <label style={labelStyle}>Origem (opcional)</label>
                                    <select value={rotaForm.origemId} onChange={(e) => setRotaForm({ ...rotaForm, origemId: e.target.value })} style={inputStyle}>
                                        <option value="">Nenhuma</option>
                                        {objetos.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
                                    </select>

                                    <label style={labelStyle}>Destino (opcional)</label>
                                    <select value={rotaForm.destinoId} onChange={(e) => setRotaForm({ ...rotaForm, destinoId: e.target.value })} style={inputStyle}>
                                        <option value="">Nenhum</option>
                                        {objetos.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
                                    </select>

                                    <label style={labelStyle}>Detalhes</label>
                                    <input type="text" value={rotaForm.descricao} onChange={(e) => setRotaForm({ ...rotaForm, descricao: e.target.value })} style={inputStyle} />

                                    <label style={labelStyle}>Arquivo KMZ / KML (até 10 MB)</label>
                                    <input key={fileKey} type="file" accept=".kmz,.kml" onChange={(e) => setRotaForm({ ...rotaForm, file: e.target.files[0] || null })} style={{ fontSize: '0.75rem' }} />

                                    <Button type="submit" variant="primary" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar rota'}</Button>
                                </form>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                {rotas.length === 0 && <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--th-muted)' }}>Nenhuma rota cadastrada.</p>}
                                {rotas.map((r) => {
                                    const origem = objetos.find((o) => o.id === r.origem_id);
                                    const destino = objetos.find((o) => o.id === r.destino_id);
                                    return (
                                        <div key={r.id} style={{ ...itemStyle, cursor: 'default' }}>
                                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {r.nome}
                                                {(origem || destino) && <span style={{ color: 'var(--th-muted)' }}> ({origem?.nome || '?'} → {destino?.nome || '?'})</span>}
                                            </span>
                                            {podeEditar && (
                                                <button type="button" title="Excluir rota" onClick={() => excluirRota(r)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>
                                                    <i className="fa-solid fa-trash"></i>
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {aba === 'viabilidade' && (
                        <section style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <h3 style={titleStyle}>Verificar viabilidade</h3>

                            <label style={labelStyle}>Origem</label>
                            <select value={viab.origemTipo} onChange={(e) => setViab({ ...viab, origemTipo: e.target.value })} style={inputStyle}>
                                <option value="coords">Coordenadas (lat, lng)</option>
                                <option value="objeto">Objeto do projeto</option>
                            </select>

                            {viab.origemTipo === 'coords' ? (
                                <input type="text" value={viab.coords} placeholder="Ex: -3.8945, -38.4621" onChange={(e) => setViab({ ...viab, coords: e.target.value })} style={inputStyle} />
                            ) : (
                                <select value={viab.origemObjetoId} onChange={(e) => setViab({ ...viab, origemObjetoId: e.target.value })} style={inputStyle}>
                                    <option value="">Selecione...</option>
                                    {objetos.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
                                </select>
                            )}

                            <label style={labelStyle}>Destino</label>
                            <select value={viab.destinoKey} onChange={(e) => setViab({ ...viab, destinoKey: e.target.value })} style={inputStyle}>
                                <option value="">Selecione...</option>
                                <optgroup label="Objetos do projeto">
                                    {objetos.map((o) => <option key={o.id} value={`obj:${o.id}`}>{o.nome}</option>)}
                                </optgroup>
                                <optgroup label="CPDs do mapa oficial">
                                    {oficiais.filter((d) => d.tipo === 'CPD').map((d) => <option key={d.nome} value={`oficial:${d.nome}`}>{d.nome}</option>)}
                                </optgroup>
                            </select>

                            <Button variant="primary" onClick={calcularViabilidade} disabled={calculando || !pronto}>
                                {calculando ? 'Calculando...' : 'Calcular rota e distância'}
                            </Button>

                            {resultado && (
                                <div style={{ fontSize: '0.8rem', color: 'var(--th-text-2)', background: 'var(--th-tint-blue)', padding: '8px', borderRadius: '4px' }}>
                                    <div><strong>Destino:</strong> {resultado.destino}</div>
                                    <div><strong>Distância:</strong> {resultado.distancia} metros</div>
                                </div>
                            )}
                        </section>
                    )}

                </aside>

                <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
                    <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
                    {!pronto && !erro && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--th-surface-2)', color: 'var(--th-muted)', zIndex: 500 }}>
                            Carregando mapa...
                        </div>
                    )}
                    {modo && (
                        <div style={{ position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)', zIndex: 600, background: '#1e293b', color: '#fff', padding: '8px 14px', borderRadius: '8px', fontSize: '0.8rem', boxShadow: '0 4px 14px rgba(0,0,0,0.25)' }}>
                            {modo === 'objeto' ? 'Clique no mapa para posicionar o objeto' : 'Clique no mapa para posicionar a anotação'}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
