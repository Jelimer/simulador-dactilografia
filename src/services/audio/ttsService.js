/**
 * @file ttsService.js
 * @description Controlador unificado de Text-To-Speech (TTS) para el módulo de Preparación Teórica.
 * Integra de forma transparente:
 * 1. Web Speech API (síntesis local del navegador para textos extensos de hasta 100.000 caracteres)
 * 2. Endpoint Vercel /api/tts (voz neuronal de Google Translate con generación de MP3 descargable)
 * 
 * Correcciones críticas incorporadas:
 * - P0-4: Revocación estricta y automática de Blob URLs mediante `URL.revokeObjectURL` para evitar fugas de RAM.
 * - P1-4: Pausa y reanudación precisa conservando `currentChunkIdx` sin reiniciar desde el inicio.
 * - V8 Bugfix: Anclaje de la referencia `SpeechSynthesisUtterance` en el objeto global `window` para evitar que el GC de Chromium la destruya prematuramente durante la locución.
 */

/**
 * Convierte código HTML enriquecido en texto plano legible.
 * 
 * @param {string} html - Fragmento HTML o texto simple.
 * @returns {string} Texto plano sanitizado.
 */
export const stripHtml = (html) => {
    if (!html) return "";
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return (tmp.textContent || tmp.innerText || "").replace(/\s+/g, ' ').trim();
};

/**
 * Divide un texto extenso en fragmentos (chunks) oracionales respetando signos de puntuación y límites de longitud.
 * 
 * @param {string} text - Texto plano de entrada.
 * @param {number} [maxLength=180] - Longitud máxima recomendada por fragmento.
 * @returns {string[]} Arreglo de fragmentos oracionales.
 */
export const splitTextIntoChunks = (text, maxLength = 180) => {
    const cleanText = text.replace(/\s+/g, ' ').trim();
    if (!cleanText) return [];
    if (cleanText.length <= maxLength) return [cleanText];

    const chunks = [];
    let currentChunk = "";

    // Separación por signos de puntuación fuertes
    const sentences = cleanText.match(/[^.!?]+[.!?]+|[^.!?]+/g) || [cleanText];

    for (let sentence of sentences) {
        sentence = sentence.trim();
        if (!sentence) continue;

        if (currentChunk.length + sentence.length + 1 <= maxLength) {
            currentChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
        } else {
            if (currentChunk) {
                chunks.push(currentChunk);
                currentChunk = "";
            }

            if (sentence.length > maxLength) {
                const words = sentence.split(' ');
                let subChunk = "";
                for (const word of words) {
                    if (subChunk.length + word.length + 1 <= maxLength) {
                        subChunk = subChunk ? `${subChunk} ${word}` : word;
                    } else {
                        if (subChunk) chunks.push(subChunk);
                        subChunk = word;
                    }
                }
                if (subChunk) currentChunk = subChunk;
            } else {
                currentChunk = sentence;
            }
        }
    }

    if (currentChunk) chunks.push(currentChunk);
    return chunks;
};

/**
 * Busca y retorna la voz preferida en español (priorizando es-AR sobre otras variantes de es-*).
 * 
 * @param {SpeechSynthesisVoice[]} [voices] - Lista opcional de voces disponibles.
 * @returns {SpeechSynthesisVoice|null}
 */
export const getPreferredSpanishVoice = (voices = null) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return null;

    const availableVoices = voices || window.speechSynthesis.getVoices();
    if (!availableVoices || availableVoices.length === 0) return null;

    // Prioridad 1: Español Argentina (es-AR o es_AR)
    let voice = availableVoices.find(v => {
        const lang = v.lang.toLowerCase().replace('_', '-');
        return lang === 'es-ar';
    });

    // Prioridad 2: Cualquier variante de español (es-ES, es-US, es-MX, etc.)
    if (!voice) {
        voice = availableVoices.find(v => v.lang.toLowerCase().startsWith('es'));
    }

    return voice || null;
};

/**
 * Factory que crea una instancia del controlador unificado de TTS.
 * 
 * @param {Object} [config={}] - Configuración inicial y suscripciones a eventos.
 * @param {(currentIdx: number, totalChunks: number) => void} [config.onChunkChange] - Callback invocado al avanzar de fragmento.
 * @param {(state: 'idle'|'playing'|'paused'|'generating') => void} [config.onStateChange] - Callback de estado del reproductor.
 * @param {(error: Error|string) => void} [config.onError] - Callback para captura de excepciones.
 * @param {(charIndex: number) => void} [config.onBoundary] - Callback en límites de palabra o caracter.
 */
export const createTtsController = (config = {}) => {
    let state = 'idle'; // 'idle' | 'playing' | 'paused' | 'generating'
    let currentChunks = [];
    let currentChunkIdx = 0;
    let currentRate = 1.0;
    let preferredVoice = null;
    let activeBlobUrl = null;
    let activeAudioElement = null;

    const setState = (newState) => {
        state = newState;
        if (typeof config.onStateChange === 'function') {
            config.onStateChange(newState);
        }
    };

    const notifyChunkChange = () => {
        if (typeof config.onChunkChange === 'function') {
            config.onChunkChange(currentChunkIdx, currentChunks.length);
        }
    };

    const cleanupUtterance = () => {
        if (typeof window !== 'undefined' && window.__activeTtsUtterance) {
            window.__activeTtsUtterance.onend = null;
            window.__activeTtsUtterance.onerror = null;
            window.__activeTtsUtterance.onboundary = null;
            delete window.__activeTtsUtterance;
        }
    };

    /**
     * Reproduce recursivamente la cola de fragmentos en el motor local SpeechSynthesis.
     */
    const playCurrentChunkNative = () => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;

        if (currentChunkIdx >= currentChunks.length) {
            cleanupUtterance();
            currentChunkIdx = 0;
            notifyChunkChange();
            setState('idle');
            return;
        }

        if (state !== 'playing') return;

        notifyChunkChange();

        const chunkText = currentChunks[currentChunkIdx];
        const utterance = new SpeechSynthesisUtterance(chunkText);

        const voice = preferredVoice || getPreferredSpanishVoice();
        if (voice) {
            utterance.voice = voice;
        } else {
            utterance.lang = 'es-AR';
        }

        utterance.rate = currentRate;

        // PREVENCIÓN DE V8 GC: Anclar en el objeto window global
        window.__activeTtsUtterance = utterance;

        utterance.onend = () => {
            if (state === 'playing') {
                currentChunkIdx++;
                cleanupUtterance();
                playCurrentChunkNative();
            }
        };

        utterance.onerror = (e) => {
            cleanupUtterance();
            if (e.error !== 'interrupted' && e.error !== 'canceled') {
                if (typeof config.onError === 'function') {
                    config.onError(new Error(`SpeechSynthesis Error: ${e.error}`));
                }
                setState('idle');
            }
        };

        if (typeof config.onBoundary === 'function') {
            utterance.onboundary = (e) => {
                config.onBoundary(e.charIndex);
            };
        }

        window.speechSynthesis.speak(utterance);
    };

    return {
        /**
         * Asigna la voz preferida para síntesis nativa.
         * @param {SpeechSynthesisVoice} voice
         */
        setVoice(voice) {
            preferredVoice = voice;
        },

        /**
         * Asocia un elemento <audio> HTML5 para reproducción de MP3 generado por la API de Vercel.
         * @param {HTMLAudioElement} audioElement
         */
        setAudioElement(audioElement) {
            activeAudioElement = audioElement;
        },

        /**
         * Inicia la lectura de un texto con la síntesis nativa del navegador.
         * 
         * @param {string} text - Texto plano o HTML a sintetizar.
         * @param {number} [rate=1.0] - Velocidad de reproducción (0.5 a 2.0).
         * @param {(charIndex: number) => void} [onBoundary] - Callback en límite de palabra.
         * @returns {Promise<void>}
         */
        async speak(text, rate = 1.0, onBoundary = null) {
            if (typeof window === 'undefined' || !window.speechSynthesis) {
                throw new Error("SpeechSynthesis no está disponible en este entorno.");
            }

            this.stop();

            const plainText = stripHtml(text);
            currentChunks = splitTextIntoChunks(plainText, 180);
            currentChunkIdx = 0;
            currentRate = Math.max(0.5, Math.min(2.0, parseFloat(rate) || 1.0));

            if (onBoundary) {
                config.onBoundary = onBoundary;
            }

            if (currentChunks.length === 0) {
                setState('idle');
                return;
            }

            setState('playing');
            playCurrentChunkNative();
        },

        /**
         * Pausa la locución conservando estrictamente el fragmento actual (`currentChunkIdx`).
         */
        pause() {
            if (state !== 'playing') return;

            if (activeAudioElement && !activeAudioElement.paused) {
                activeAudioElement.pause();
                setState('paused');
                return;
            }

            if (typeof window !== 'undefined' && window.speechSynthesis) {
                // En Chrome, pause() nativo tiene bugs de timeout; cancelamos pero PRESERVAMOS currentChunkIdx
                window.speechSynthesis.cancel();
                cleanupUtterance();
                setState('paused');
            }
        },

        /**
         * Reanuda la locución exactamente desde el fragmento en que se pausó.
         */
        resume() {
            if (state !== 'paused') return;

            if (activeAudioElement) {
                activeAudioElement.play().catch(err => {
                    if (typeof config.onError === 'function') config.onError(err);
                });
                setState('playing');
                return;
            }

            if (typeof window !== 'undefined' && window.speechSynthesis) {
                setState('playing');
                playCurrentChunkNative();
            }
        },

        /**
         * Detiene completamente la reproducción y resetea el cursor de fragmentos al inicio.
         */
        stop() {
            if (activeAudioElement) {
                activeAudioElement.pause();
                activeAudioElement.currentTime = 0;
            }

            if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
                cleanupUtterance();
            }

            currentChunkIdx = 0;
            notifyChunkChange();
            setState('idle');
        },

        /**
         * Solicita la síntesis neuronal a la API serverless de Vercel y retorna un Blob URL seguro.
         * Revoca de forma inmediata cualquier Blob URL previo para evitar fugas de memoria.
         * 
         * @param {string} text - Texto a procesar (máximo 15.000 caracteres recomendados para voz neuronal).
         * @param {string|number} [speed='1.0'] - Velocidad ('1.0' o '0.8').
         * @returns {Promise<string>} Blob URL utilizable en un elemento <audio> o descarga.
         */
        async generateMp3(text, speed = '1.0') {
            this.stop();
            this.revokeAudioUrl();

            const plainText = stripHtml(text);
            if (!plainText) {
                throw new Error("El texto a convertir en audio no puede estar vacío.");
            }

            if (plainText.length > 15000) {
                throw new Error("Para voz neuronal de servidor, el texto no debe superar los 15.000 caracteres.");
            }

            setState('generating');

            try {
                const response = await fetch('/api/tts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: plainText,
                        speed: String(speed)
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `Error del servidor de voz: HTTP ${response.status}`);
                }

                const blob = await response.blob();
                activeBlobUrl = URL.createObjectURL(blob);
                setState('idle');
                return activeBlobUrl;
            } catch (err) {
                setState('idle');
                throw err;
            }
        },

        /**
         * Revoca y libera explícitamente el Blob URL activo en el heap del navegador.
         */
        revokeAudioUrl() {
            if (activeBlobUrl && typeof URL !== 'undefined' && URL.revokeObjectURL) {
                try {
                    URL.revokeObjectURL(activeBlobUrl);
                } catch {
                    // Ignorar errores en revocación
                }
                activeBlobUrl = null;
            }
        },

        /**
         * Retorna el estado actual del controlador.
         * @returns {'idle'|'playing'|'paused'|'generating'}
         */
        getState() {
            return state;
        },

        /**
         * Retorna el índice del fragmento activo y el total.
         * @returns {{ current: number, total: number }}
         */
        getProgress() {
            return {
                current: currentChunkIdx,
                total: currentChunks.length
            };
        }
    };
};
