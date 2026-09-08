/**
 * typingEvaluator.js
 * Servicio puro para evaluación judicial de dactilografía y cálculo de métricas.
 * 
 * Reglas Judiciales Oficiales:
 * - Acierto exacto: 1 palabra correcta (+1 a correct).
 * - Error leve (acento, diacrítico, puntuación, mayúscula/minúscula): +1 minorErrors, computa 0.5 palabras contabilizadas.
 * - Error grave (palabra mal escrita, discrepancia sustancial, palabra extra): +1 majorErrors, 0 palabras contabilizadas.
 * - Palabra omitida: +1 omitted, no computa.
 * - Palabras contabilizadas: correct + (minorErrors * 0.5)
 */

/**
 * Normaliza una palabra removiendo diacríticos (acentos) y convirtiendo a minúsculas.
 * @param {string} word 
 * @returns {string}
 */
export const normalizeWord = (word) => {
    if (!word || typeof word !== 'string') return '';
    return word.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
};

/**
 * Remueve signos de puntuación comunes preservando caracteres alfanuméricos.
 * Nota: El guión (-) se coloca al final de la clase de caracteres para evitar escapes innecesarios.
 * @param {string} word 
 * @returns {string}
 */
export const removePunctuation = (word) => {
    if (!word || typeof word !== 'string') return '';
    return word.replace(/[.,;!?()-]/g, '');
};

/**
 * Calcula métricas temporales de tipeo (PPM, Errores por minuto y estado de aprobación).
 * @param {number} accountedWords 
 * @param {number} totalErrors 
 * @param {number} timeSpentSec 
 * @param {number} requiredWords 
 * @returns {{ wpm: string, errorsPerMinute: string, passed: boolean }}
 */
export const calculateTypingMetrics = (accountedWords, totalErrors, timeSpentSec = 0, requiredWords = 0) => {
    const timeSpentMinutes = timeSpentSec > 0 ? (timeSpentSec / 60) : 0;
    const safeTime = timeSpentMinutes > 0 ? timeSpentMinutes : (1 / 60);

    const wpm = timeSpentSec > 0 ? (accountedWords / safeTime).toFixed(1) : '0.0';
    const errorsPerMinute = timeSpentSec > 0 ? (totalErrors / safeTime).toFixed(1) : '0.0';
    const passed = requiredWords > 0 ? (accountedWords >= requiredWords) : false;

    return { wpm, errorsPerMinute, passed };
};

/**
 * Evalúa el texto escrito por el postulante contra el texto judicial oficial.
 * Función pura, determinista y testeable sin efectos secundarios.
 * 
 * @param {string} originalText - Texto judicial de referencia.
 * @param {string} typedText - Texto escrito por el usuario.
 * @param {number} [timeSpentSec=0] - Tiempo transcurrido en segundos.
 * @param {number} [requiredWords=0] - Palabras mínimas requeridas para aprobar.
 * @returns {{
 *   totalWords: number,
 *   enteredWords: number,
 *   correct: number,
 *   minorErrors: number,
 *   majorErrors: number,
 *   omitted: number,
 *   accountedWords: number,
 *   wpm: string,
 *   errorsPerMinute: string,
 *   passed: boolean,
 *   evaluatedOrig: Array<{ text: string, status: 'correct' | 'minor' | 'major' | 'omitted' }>,
 *   evaluatedTyped: Array<{ text: string, status: 'correct' | 'minor' | 'major' | 'extra' }>
 * }}
 */
export const evaluateTyping = (originalText, typedText, timeSpentSec = 0, requiredWords = 0) => {
    const safeOrig = typeof originalText === 'string' ? originalText : '';
    const safeTyped = typeof typedText === 'string' ? typedText : '';

    const origWords = safeOrig.trim().split(/\s+/).filter(w => w.length > 0);
    const typedWords = safeTyped.trim().split(/\s+/).filter(w => w.length > 0);

    let correct = 0;
    let minorErrors = 0;
    let majorErrors = 0;
    let omitted = 0;

    const evaluatedOrig = [];
    const evaluatedTyped = [];

    let oIdx = 0;
    let tIdx = 0;

    while (oIdx < origWords.length || tIdx < typedWords.length) {
        const oWord = origWords[oIdx];
        const tWord = typedWords[tIdx];

        if (!tWord && oWord) {
            // El usuario terminó antes o no escribió más palabras
            omitted++;
            evaluatedOrig.push({ text: oWord, status: 'omitted' });
            oIdx++;
        } else if (!oWord && tWord) {
            // El usuario escribió más palabras que las originales
            majorErrors++;
            evaluatedTyped.push({ text: tWord, status: 'extra' });
            tIdx++;
        } else {
            if (oWord === tWord) {
                // Coincidencia exacta
                correct++;
                evaluatedOrig.push({ text: oWord, status: 'correct' });
                evaluatedTyped.push({ text: tWord, status: 'correct' });
                oIdx++;
                tIdx++;
            } else {
                const cleanO = removePunctuation(oWord);
                const cleanT = removePunctuation(tWord);
                const normO = normalizeWord(oWord);
                const normT = normalizeWord(tWord);

                // Error leve: sólo difieren en mayúsculas, acentos o signos de puntuación
                const isMinor = oWord.toLowerCase() === tWord.toLowerCase() ||
                                normO === normT ||
                                (cleanO === cleanT && cleanO.length > 0);

                if (isMinor) {
                    minorErrors++;
                    evaluatedOrig.push({ text: oWord, status: 'minor' });
                    evaluatedTyped.push({ text: tWord, status: 'minor' });
                    oIdx++;
                    tIdx++;
                } else {
                    // Lookahead de 1 palabra para sincronización
                    if (oIdx + 1 < origWords.length && origWords[oIdx + 1] === tWord) {
                        // El postulante omitió oWord
                        omitted++;
                        evaluatedOrig.push({ text: oWord, status: 'omitted' });
                        oIdx++;
                    } else if (tIdx + 1 < typedWords.length && typedWords[tIdx + 1] === oWord) {
                        // El postulante insertó tWord como palabra extra
                        majorErrors++;
                        evaluatedTyped.push({ text: tWord, status: 'extra' });
                        tIdx++;
                    } else {
                        // Error grave de sustitución
                        majorErrors++;
                        evaluatedOrig.push({ text: oWord, status: 'major' });
                        evaluatedTyped.push({ text: tWord, status: 'major' });
                        oIdx++;
                        tIdx++;
                    }
                }
            }
        }
    }

    const accountedWords = correct + (minorErrors * 0.5);
    const totalErrors = majorErrors + minorErrors;

    const { wpm, errorsPerMinute, passed } = calculateTypingMetrics(
        accountedWords,
        totalErrors,
        timeSpentSec,
        requiredWords
    );

    return {
        totalWords: origWords.length,
        enteredWords: typedWords.length,
        correct,
        minorErrors,
        majorErrors,
        omitted,
        accountedWords,
        wpm,
        errorsPerMinute,
        passed,
        evaluatedOrig,
        evaluatedTyped
    };
};

export default {
    normalizeWord,
    removePunctuation,
    calculateTypingMetrics,
    evaluateTyping
};
