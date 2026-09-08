/**
 * @file typingAudio.js
 * @description Síntesis de sonido de máquina de escribir y teclado mecánico utilizando Web Audio API.
 * Proporciona feedback acústico en tiempo real para pulsaciones correctas y erróneas,
 * con gestión segura de AudioContext frente a políticas de reproducción automática (autoplay) de navegadores modernos.
 */

let globalAudioCtx = null;
let isGloballyMuted = false;
let globalVolume = 1.0;

/**
 * Obtiene o inicializa de forma perezosa (lazy singleton) la instancia de AudioContext.
 * Maneja prefijos de navegadores antiguos (webkitAudioContext) y estados 'suspended'.
 * 
 * @returns {AudioContext|null} La instancia activa de AudioContext o null si la API no está soportada.
 */
export const getAudioContext = () => {
    if (typeof window === 'undefined') return null;

    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return null;

        if (!globalAudioCtx || globalAudioCtx.state === 'closed') {
            globalAudioCtx = new AudioContextClass();
        }

        if (globalAudioCtx.state === 'suspended') {
            globalAudioCtx.resume().catch(() => {
                // Silencioso: se reanudará en la siguiente interacción de usuario
            });
        }

        return globalAudioCtx;
    } catch {
        return null;
    }
};

/**
 * Intenta desbloquear y reanudar el AudioContext durante un gesto de usuario (click, keydown).
 * Recomendado invocar al iniciar una sesión de tipeo o en el primer evento de teclado.
 * 
 * @returns {Promise<boolean>} True si el AudioContext está activo ('running'), False de lo contrario.
 */
export const resumeAudioContext = async () => {
    const ctx = getAudioContext();
    if (!ctx) return false;

    if (ctx.state === 'suspended') {
        try {
            await ctx.resume();
            return ctx.state === 'running';
        } catch {
            return false;
        }
    }
    return ctx.state === 'running';
};

/**
 * Configura el estado global de silencio del audio de tipeo.
 * 
 * @param {boolean} muted - True para silenciar todo el feedback de tipeo.
 */
export const setGlobalTypingMuted = (muted) => {
    isGloballyMuted = Boolean(muted);
};

/**
 * Configura el volumen global del feedback de tipeo.
 * 
 * @param {number} volume - Factor de volumen entre 0.0 (silencio) y 2.0 (máximo). Por defecto 1.0.
 */
export const setTypingVolume = (volume) => {
    globalVolume = Math.max(0, Math.min(2.0, Number(volume) || 1.0));
};

/**
 * Reproduce el sonido de máquina de escribir sintetizado para una pulsación de tecla.
 * 
 * @param {boolean} [isCorrect=true] - True para sonido de click metálico fino; False para golpe sordo de error.
 * @param {boolean} [isMuted=false] - Silenciamiento a nivel de llamada individual.
 * @param {Object} [options={}] - Opciones adicionales (volumen específico, etc.).
 * @param {number} [options.volume] - Multiplicador de volumen para esta pulsación.
 */
export const playTypingSound = (isCorrect = true, isMuted = false, options = {}) => {
    if (isGloballyMuted || isMuted) return;

    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        // Si el contexto sigue suspendido, intentar reanudarlo asíncronamente para la próxima tecla
        if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
        }

        const now = ctx.currentTime;
        const callVolume = typeof options.volume === 'number' ? Math.max(0, options.volume) : 1.0;
        const effectiveVolume = globalVolume * callVolume;

        if (effectiveVolume <= 0.0001) return;

        if (isCorrect) {
            // Sonido de máquina de escribir física / teclado mecánico sutil ("Click")
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1200, now);
            osc.frequency.exponentialRampToValueAtTime(180, now + 0.04);

            const peakGain = 0.04 * effectiveVolume;
            gain.gain.setValueAtTime(peakGain, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.04);
        } else {
            // Sonido sordo / error de pulsación ("Buzzer" bajo)
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(160, now);
            osc.frequency.linearRampToValueAtTime(80, now + 0.12);

            const peakGain = 0.07 * effectiveVolume;
            gain.gain.setValueAtTime(peakGain, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.12);
        }
    } catch {
        // Silencioso ante restricciones transitorias de permisos de audio
    }
};

/**
 * Cierra y libera la instancia global de AudioContext.
 * Útil para pruebas automatizadas o liberación de recursos al salir de la aplicación.
 */
export const closeAudioContext = async () => {
    if (globalAudioCtx && globalAudioCtx.state !== 'closed') {
        try {
            await globalAudioCtx.close();
        } catch {
            // Ignorar errores al cerrar
        }
    }
    globalAudioCtx = null;
};
