// Carrega o Leaflet e os leitores de KMZ/KML pelo CDN, uma única vez
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const JSZIP_JS = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
const OMNIVORE_JS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet-omnivore/0.3.4/leaflet-omnivore.min.js';

let libsPromise = null;

function addStylesheet(href) {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
}

function addScript(src) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
        document.head.appendChild(script);
    });
}

// Resolve com o objeto L (Leaflet) quando tudo estiver pronto
export function loadMapLibs() {
    if (!libsPromise) {
        addStylesheet(LEAFLET_CSS);
        libsPromise = addScript(LEAFLET_JS)
            .then(() => addScript(JSZIP_JS))
            .then(() => addScript(OMNIVORE_JS))
            .then(() => window.L)
            .catch((err) => {
                libsPromise = null;
                throw err;
            });
    }
    return libsPromise;
}

// Lê um arquivo .kmz (zip com um KML dentro) ou .kml e devolve uma camada do Leaflet
export async function parseRouteFile(blob, nomeArquivo) {
    const nome = nomeArquivo.toLowerCase();
    let kml;

    if (nome.endsWith('.kmz')) {
        const zip = await window.JSZip.loadAsync(blob);
        const entrada = Object.values(zip.files).find((f) => !f.dir && f.name.toLowerCase().endsWith('.kml'));
        if (!entrada) throw new Error('KMZ sem arquivo KML interno.');
        kml = await entrada.async('string');
    } else {
        kml = await blob.text();
    }

    if (!window.omnivore || !window.omnivore.kml || !window.omnivore.kml.parse) {
        throw new Error('Leitor de KML indisponível.');
    }
    return window.omnivore.kml.parse(kml);
}
