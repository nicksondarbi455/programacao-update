import { useEffect, useRef } from 'react';

// Versões fixas. O Vanta 0.5.24 é compatível com o Three.js r134.
const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js';
const VANTA_URL = 'https://cdn.jsdelivr.net/npm/vanta@0.5.24/dist/vanta.net.min.js';

let loadPromise = null;

const loadScript = (src) => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
    document.head.appendChild(script);
});

// Carrega Three.js e Vanta apenas uma vez, e só quando a tela de login é aberta
const loadVanta = () => {
    if (window.VANTA) return Promise.resolve(window.VANTA);
    if (!loadPromise) {
        loadPromise = (window.THREE ? Promise.resolve() : loadScript(THREE_URL))
            .then(() => loadScript(VANTA_URL))
            .then(() => window.VANTA)
            .catch((err) => {
                loadPromise = null; // permite tentar de novo na próxima montagem
                throw err;
            });
    }
    return loadPromise;
};

export function VantaBackground() {
    const ref = useRef(null);

    useEffect(() => {
        let effect = null;
        let cancelled = false;

        loadVanta()
            .then((VANTA) => {
                if (cancelled || !ref.current) return;
                effect = VANTA.NET({
                    el: ref.current,
                    mouseControls: true,
                    touchControls: true,
                    gyroControls: false,
                    minHeight: 200.0,
                    minWidth: 200.0,
                    scale: 1.0,
                    scaleMobile: 1.0,
                    color: 0x553fff,
                    backgroundColor: 0x0e0e0f
                });
            })
            .catch((err) => console.error('Fundo Vanta não carregou:', err));

        return () => {
            cancelled = true;
            if (effect) effect.destroy();
        };
    }, []);

    return <div ref={ref} className="vanta-bg" aria-hidden="true" />;
}
