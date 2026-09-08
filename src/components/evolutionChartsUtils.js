/**
 * Utilidades puras para el cálculo geométrico, matemático y de formato
 * de los gráficos de evolución (EvolutionCharts).
 * 
 * Funciones puras desacopladas de React para permitir máxima testeabilidad,
 * determinismo y rendimiento en cálculos en tiempo real.
 */

/**
 * Parsea de forma resiliente cualquier valor numérico, admitiendo números,
 * cadenas con unidades ("50 PPM", "98%"), comas decimales ("95,5%") y valores nulos.
 * @param {any} val - Valor a parsear
 * @param {number} fallback - Valor por defecto si es inválido
 * @returns {number} Número finito seguro
 */
export function parseMetric(val, fallback = 0) {
    if (typeof val === 'number') {
        return Number.isFinite(val) ? val : fallback;
    }
    if (typeof val === 'string') {
        const trimmed = val.trim();
        if (!trimmed) return fallback;
        const normalized = trimmed.replace(',', '.');
        const match = normalized.match(/[-+]?\d*\.?\d+/);
        if (match) {
            const parsed = parseFloat(match[0]);
            return Number.isFinite(parsed) ? parsed : fallback;
        }
        return fallback;
    }
    return fallback;
}

/**
 * Retorna el valor máximo de un arreglo numérico sin usar spread operator,
 * protegiendo contra RangeError: Maximum call stack size exceeded en arreglos masivos.
 * @param {number[]} arr - Arreglo de números
 * @param {number} fallback - Valor de fallback si está vacío
 * @returns {number} Valor máximo
 */
export function safeMax(arr, fallback = 0) {
    if (!Array.isArray(arr) || arr.length === 0) return fallback;
    return arr.reduce((max, v) => {
        const n = Number(v);
        return Number.isFinite(n) ? Math.max(max, n) : max;
    }, fallback);
}

/**
 * Retorna el valor mínimo de un arreglo numérico sin usar spread operator.
 * @param {number[]} arr - Arreglo de números
 * @param {number} fallback - Valor de fallback si está vacío
 * @returns {number} Valor mínimo
 */
export function safeMin(arr, fallback = 0) {
    if (!Array.isArray(arr) || arr.length === 0) return fallback;
    return arr.reduce((min, v) => {
        const n = Number(v);
        return Number.isFinite(n) ? Math.min(min, n) : min;
    }, fallback);
}

/**
 * Extrae la precisión porcentual de un intento de forma tolerante a múltiples esquemas.
 * @param {object} attempt - Intento de práctica o simulador
 * @returns {number} Precisión entre 0 y 100
 */
export function getAttemptPrecision(attempt) {
    if (!attempt || typeof attempt !== 'object') return 0;
    if (attempt.precision !== undefined || attempt.accuracy !== undefined) {
        return parseMetric(attempt.precision ?? attempt.accuracy, 0);
    }
    if (attempt.correctChars !== undefined && attempt.errorChars !== undefined) {
        const correct = parseMetric(attempt.correctChars, 0);
        const errors = parseMetric(attempt.errorChars, 0);
        const total = correct + errors;
        return total > 0 ? (correct / total) * 100 : 0;
    }
    if (attempt.enteredWords !== undefined && parseMetric(attempt.enteredWords, 0) > 0) {
        const entered = parseMetric(attempt.enteredWords, 1);
        const correct = parseMetric(attempt.correct, 0);
        return (correct / entered) * 100;
    }
    return 0;
}

/**
 * Formatea una duración en segundos a formato legible MM:SS
 * @param {number|string} secs - Duración en segundos o preformateada
 * @returns {string} Formato MM:SS
 */
export function formatDur(secs) {
    if (typeof secs === 'string' && secs.includes(':')) {
        return secs.trim();
    }
    const s = typeof secs === 'string' ? parseFloat(secs) : Number(secs);
    if (!Number.isFinite(s) || s <= 0) return "0:00";
    const m = Math.floor(s / 60);
    const rem = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${rem}`;
}

/**
 * Formatea la marca de tiempo completa (fecha y hora exacta)
 * Soporta objetos Date, timestamps ISO, epoch numéricos, strings con hora separada y claves alternativas.
 * @param {object} attempt - Objeto de intento
 * @returns {string} Fecha y hora legible
 */
export function formatFullTimestamp(attempt) {
    if (!attempt || typeof attempt !== 'object') return 'Fecha no registrada';
    
    let rawVal = attempt.timestamp ?? attempt.createdAt;
    if (!rawVal && (attempt.date || attempt.fecha)) {
        const d = attempt.date || attempt.fecha;
        const t = attempt.time || attempt.hora || attempt.timeOnly;
        rawVal = t ? `${d} ${t}` : d;
    }

    // Instancia de Date válida
    if (rawVal instanceof Date && !isNaN(rawVal.getTime())) {
        return rawVal.toLocaleString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    // Timestamp numérico (milisegundos epoch e.g. Date.now())
    if (typeof rawVal === 'number' && Number.isFinite(rawVal) && rawVal > 0) {
        const d = new Date(rawVal);
        if (!isNaN(d.getTime())) {
            return d.toLocaleString('es-AR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }
    }

    if (typeof rawVal === 'string' && rawVal.trim()) {
        const raw = rawVal.trim();
        // Si ya es una fecha formateada en formato DD/MM/AAAA o contiene comas y dos puntos
        if (raw.includes('/') || (raw.includes(':') && raw.includes(',')) || raw.includes(' - ')) {
            return raw;
        }
        // Timestamp epoch en formato string (e.g. "1725800000000")
        if (/^\d{10,13}$/.test(raw)) {
            const num = Number(raw);
            const d = new Date(num);
            if (!isNaN(d.getTime())) {
                return d.toLocaleString('es-AR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
            }
        }
        const d = new Date(raw);
        if (!isNaN(d.getTime())) {
            return d.toLocaleString('es-AR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }
        return raw;
    }

    if (attempt.timeOnly || attempt.time || attempt.hora) {
        return `Hora: ${attempt.timeOnly || attempt.time || attempt.hora}`;
    }

    return 'Fecha no disponible';
}

/**
 * Calcula el resumen estadístico para el panel superior (R3)
 * Resiliente ante valores NaN, infinitos, unidades string y arreglos masivos (evita stack overflow)
 * @param {Array} attempts - Arreglo de intentos
 * @returns {{ totalPractices: number, avgWpm: number, maxWpm: number, avgPrecision: number }}
 */
export function computeEvolutionSummary(attempts) {
    const valid = (Array.isArray(attempts) ? attempts : []).filter(a => a && typeof a === 'object');
    if (valid.length === 0) {
        return {
            totalPractices: 0,
            avgWpm: 0,
            maxWpm: 0,
            avgPrecision: 0
        };
    }

    const wpms = valid.map(a => {
        const n = parseMetric(a?.wpm, 0);
        return Math.max(0, n);
    });
    const precisions = valid.map(a => {
        const n = getAttemptPrecision(a);
        return Math.max(0, Math.min(100, n));
    });

    const totalPractices = valid.length;
    const avgWpm = Math.round(wpms.reduce((acc, v) => acc + v, 0) / totalPractices);
    const maxWpm = safeMax(wpms, 0);
    const avgPrecision = Math.round(precisions.reduce((acc, v) => acc + v, 0) / totalPractices);

    return {
        totalPractices,
        avgWpm,
        maxWpm,
        avgPrecision
    };
}

/**
 * Determina los índices de etiquetas visibles en el eje X para garantizar anti-solapamiento estricto (R1).
 * Garantiza que cuando totalCount > maxLabels, ninguna etiqueta contigua tenga distancia < 2,
 * previniendo colisiones físicas de texto en el eje horizontal.
 * Inmune a bucles infinitos ante maxLabels <= 0, null, o tipos anómalos.
 * @param {number} totalCount - Cantidad total de puntos
 * @param {number} maxLabels - Límite de etiquetas simultáneas (por defecto 10)
 * @returns {number[]} Índices visibles
 */
export function getVisibleLabelIndices(totalCount, maxLabels = 10) {
    const rawTotal = Number(totalCount);
    if (!Number.isFinite(rawTotal) || rawTotal <= 0) return [];
    const total = Math.floor(rawTotal);
    if (total <= 0) return [];

    const safeMax = Math.max(2, Number.isFinite(Number(maxLabels)) ? Math.floor(Number(maxLabels)) : 10);
    if (total <= safeMax) {
        return Array.from({ length: total }, (_, i) => i);
    }

    const step = Math.max(2, Math.ceil((total - 1) / (safeMax - 1)));
    const indices = [0];
    let curr = 0;

    while (curr + step < total - 1) {
        // Si el siguiente paso dejaría una separación menor al 75% del paso hasta el final,
        // nos detenemos para conectar limpiamente con el último índice sin solapamiento
        if ((total - 1) - (curr + step) < Math.ceil(step * 0.75)) {
            break;
        }
        curr += step;
        indices.push(curr);
    }

    indices.push(total - 1);
    return indices;
}

/**
 * Genera el camino de curva suave Bézier cúbica (Catmull-Rom spline adaptativo) (R2.3)
 * @param {Array<{x: number, y: number}>} points - Coordenadas geométricas
 * @param {number} tension - Factor de tensión del spline (0.25 por defecto)
 * @returns {string} Comando SVG d
 */
export function getCubicBezierPath(points, tension = 0.25) {
    if (!points || !Array.isArray(points) || points.length === 0) return '';
    
    const rawTension = Number.isFinite(Number(tension)) ? Number(tension) : 0.25;
    const safeTension = Math.max(0, Math.min(1, rawTension));

    const sanitized = points
        .filter(p => p && typeof p === 'object')
        .map(p => ({
            x: Number.isFinite(Number(p?.x)) ? Number(p.x) : 0,
            y: Number.isFinite(Number(p?.y)) ? Number(p.y) : 0
        }));

    if (sanitized.length === 0) return '';
    if (sanitized.length === 1) {
        return `M ${sanitized[0].x.toFixed(1)},${sanitized[0].y.toFixed(1)}`;
    }
    if (sanitized.length === 2) {
        return `M ${sanitized[0].x.toFixed(1)},${sanitized[0].y.toFixed(1)} L ${sanitized[1].x.toFixed(1)},${sanitized[1].y.toFixed(1)}`;
    }

    let path = `M ${sanitized[0].x.toFixed(1)},${sanitized[0].y.toFixed(1)}`;

    for (let i = 0; i < sanitized.length - 1; i++) {
        const pPrev = i > 0 ? sanitized[i - 1] : sanitized[i];
        const pCurr = sanitized[i];
        const pNext = sanitized[i + 1];
        const pAfter = i + 2 < sanitized.length ? sanitized[i + 2] : pNext;

        // Puntos de control tangenciales del spline cúbico
        const cp1x = pCurr.x + (pNext.x - pPrev.x) * safeTension;
        const cp1y = pCurr.y + (pNext.y - pPrev.y) * safeTension;

        const cp2x = pNext.x - (pAfter.x - pCurr.x) * safeTension;
        const cp2y = pNext.y - (pAfter.y - pCurr.y) * safeTension;

        path += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${pNext.x.toFixed(1)},${pNext.y.toFixed(1)}`;
    }

    return path;
}

/**
 * Asigna colores de precisión según el porcentaje (R2.2: verde ≥95%, ámbar 90-94%, coral <90%)
 * Redondea consistentemente para asegurar que el porcentaje mostrado coincida exactamente con el color.
 * Admite cadenas como "98%", "95,5%", etc.
 * @param {number|string} precision - Porcentaje de precisión
 * @returns {object} Configuración de color y badges
 */
export function getPrecisionColor(precision) {
    const p = Math.round(parseMetric(precision, 0));
    if (p >= 95) {
        return {
            tier: 'high',
            fill: '#10b981',       // esmeralda
            stroke: '#059669',
            glow: 'rgba(16, 185, 129, 0.4)',
            gradStart: '#34d399',
            gradEnd: '#059669',
            badgeBg: 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
            label: 'Excelente'
        };
    } else if (p >= 90) {
        return {
            tier: 'medium',
            fill: '#f59e0b',       // ámbar
            stroke: '#d97706',
            glow: 'rgba(245, 158, 11, 0.4)',
            gradStart: '#fbbf24',
            gradEnd: '#d97706',
            badgeBg: 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30',
            label: 'Aceptable'
        };
    } else {
        return {
            tier: 'low',
            fill: '#f43f5e',       // coral/rosa
            stroke: '#e11d48',
            glow: 'rgba(244, 63, 94, 0.4)',
            gradStart: '#fb7185',
            gradEnd: '#e11d48',
            badgeBg: 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30',
            label: 'A mejorar'
        };
    }
}
