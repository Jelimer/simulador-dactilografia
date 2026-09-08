/**
 * @file ambientAudio.js
 * @description Generador estocástico de sonido ambiente de sala de examen judicial.
 * Simula el murmullo de fondo de múltiples postulantes escribiendo simultáneamente en teclados mecánicos.
 * 
 * Corrección crítica P1-7:
 * Implementa poda activa (active pruning) de temporizadores en tiempo O(1) mediante `Set`.
 * Erradica la acumulación indefinida de IDs en memoria que sufría el array original.
 */

/**
 * Crea una nueva instancia del generador de sonido ambiente judicial.
 * 
 * @returns {{
 *   start: () => void,
 *   stop: () => void,
 *   isRunning: () => boolean,
 *   getActiveTimersCount: () => number
 * }} Controlador del audio ambiente.
 */
export const createAmbientTyping = () => {
    let ctx = null;
    /** @type {Set<ReturnType<typeof setTimeout>>} */
    const activeTimers = new Set();
    let running = false;
    let resumeListener = null;

    /**
     * Programa un timeout con auto-poda inmediata al ejecutarse.
     * Mantiene el conjunto en tamaño acotado O(N_concurrent) en lugar de O(tiempo).
     * 
     * @param {() => void} fn - Función a ejecutar.
     * @param {number} delay - Retardo en milisegundos.
     * @returns {ReturnType<typeof setTimeout>}
     */
    const scheduleTimeout = (fn, delay) => {
        let timerId = null;
        timerId = setTimeout(() => {
            activeTimers.delete(timerId);
            if (running) {
                fn();
            }
        }, delay);
        activeTimers.add(timerId);
        return timerId;
    };

    /**
     * Cancela y purga todos los temporizadores pendientes.
     */
    const clearAllTimers = () => {
        for (const timerId of activeTimers) {
            clearTimeout(timerId);
        }
        activeTimers.clear();
    };

    /**
     * Sintetiza un click individual con dos componentes acústicos:
     * 1. Click de alta frecuencia (impacto superficial de tecla/switch)
     * 2. Clack de baja frecuencia (resonancia del chasis y fondo del teclado)
     */
    const playClick = () => {
        if (!running || !ctx || ctx.state === 'closed') return;

        try {
            if (ctx.state === 'suspended') {
                ctx.resume().catch(() => {});
            }

            const now = ctx.currentTime;

            // 1. CLICK DE ALTA FRECUENCIA (Contacto metálico/plástico)
            const clickSize = Math.floor(ctx.sampleRate * 0.015);
            const clickBuffer = ctx.createBuffer(1, clickSize, ctx.sampleRate);
            const clickData = clickBuffer.getChannelData(0);

            for (let i = 0; i < clickSize; i++) {
                clickData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (clickSize * 0.08));
            }

            const clickSource = ctx.createBufferSource();
            clickSource.buffer = clickBuffer;
            clickSource.playbackRate.value = 0.85 + Math.random() * 0.3;

            const clickFilter = ctx.createBiquadFilter();
            clickFilter.type = 'highpass';
            clickFilter.frequency.value = 2800 + Math.random() * 1200;

            const clickGain = ctx.createGain();
            clickGain.gain.setValueAtTime(0.02 + Math.random() * 0.03, now);
            clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.012);

            clickSource.connect(clickFilter);
            clickFilter.connect(clickGain);
            clickGain.connect(ctx.destination);

            // 2. CLACK DE BAJA FRECUENCIA (Golpe en el fondo del teclado)
            const osc = ctx.createOscillator();
            const oscGain = ctx.createGain();

            osc.type = 'triangle';
            const baseFreq = 140 + Math.random() * 150;
            osc.frequency.setValueAtTime(baseFreq, now);
            osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.45, now + 0.03);

            const oscFilter = ctx.createBiquadFilter();
            oscFilter.type = 'bandpass';
            oscFilter.frequency.value = 900 + Math.random() * 700;
            oscFilter.Q.value = 0.8 + Math.random() * 0.6;

            oscGain.gain.setValueAtTime(0.05 + Math.random() * 0.06, now);
            oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

            osc.connect(oscFilter);
            oscFilter.connect(oscGain);
            oscGain.connect(ctx.destination);

            clickSource.start(now);
            osc.start(now);
            osc.stop(now + 0.035);
        } catch {
            // Silencioso ante excepciones menores de síntesis transitoria
        }
    };

    /**
     * Simula el ritmo estocástico de un postulante en la sala.
     * 
     * @param {number} avgDelay - Retardo promedio entre pulsaciones en ms.
     */
    const scheduleTypist = (avgDelay) => {
        const next = () => {
            if (!running) return;

            const delay = avgDelay * (0.35 + Math.random() * 1.3);

            scheduleTimeout(() => {
                if (!running) return;
                playClick();

                // Ráfagas ocasionales de tipeo rápido (dobles clics o secuencias ágiles)
                if (Math.random() > 0.6) {
                    const burst = 1 + Math.floor(Math.random() * 2);
                    for (let i = 0; i < burst; i++) {
                        const burstDelay = (i + 1) * (35 + Math.random() * 45);
                        scheduleTimeout(() => {
                            if (running) playClick();
                        }, burstDelay);
                    }
                }

                next();
            }, delay);
        };

        next();
    };

    return {
        /**
         * Inicia la síntesis del ambiente de sala con 10 postulantes virtuales.
         */
        start() {
            if (running) return;
            running = true;

            if (typeof window === 'undefined') return;

            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return;

            ctx = new AudioContextClass();

            const resumeAudio = () => {
                if (ctx && ctx.state === 'suspended') {
                    ctx.resume().catch(() => {});
                }
            };

            // Intentar reanudar de inmediato si ya hubo user gesture
            resumeAudio();

            // Desbloquear con la primera interacción del usuario en la ventana
            resumeListener = resumeAudio;
            window.addEventListener('keydown', resumeListener, { passive: true });
            window.addEventListener('click', resumeListener, { passive: true });

            // Simulación de 10 personas con ritmos de tipeo escalonados (desde rápido hasta metronómico)
            const typistPaces = [120, 155, 190, 225, 260, 300, 340, 380, 430, 500];
            typistPaces.forEach(pace => scheduleTypist(pace));
        },

        /**
         * Detiene inmediatamente la simulación, poda todos los temporizadores y libera el AudioContext.
         */
        stop() {
            running = false;
            clearAllTimers();

            if (resumeListener && typeof window !== 'undefined') {
                window.removeEventListener('keydown', resumeListener);
                window.removeEventListener('click', resumeListener);
                resumeListener = null;
            }

            if (ctx && ctx.state !== 'closed') {
                try {
                    ctx.close();
                } catch {
                    // Ignorar errores en cierre forzado
                }
            }
            ctx = null;
        },

        /**
         * Indica si el generador de sonido ambiente está en ejecución.
         * @returns {boolean}
         */
        isRunning() {
            return running;
        },

        /**
         * Retorna la cantidad de temporizadores activos en memoria (para telemetría y verificación de poda).
         * @returns {number}
         */
        getActiveTimersCount() {
            return activeTimers.size;
        }
    };
};
