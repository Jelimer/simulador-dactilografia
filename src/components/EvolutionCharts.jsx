import { useState, useMemo } from 'react';
import { 
    Zap, Trophy, Target, BarChart3, Clock, AlertCircle, Calendar 
} from 'lucide-react';

import { 
    formatDur, 
    formatFullTimestamp, 
    computeEvolutionSummary, 
    getVisibleLabelIndices, 
    getCubicBezierPath, 
    getPrecisionColor,
    parseMetric,
    safeMin,
    safeMax
} from './evolutionChartsUtils.js';

// ==========================================
// SUBCOMPONENTES VISUALES
// ==========================================

/**
 * Barra superior de resumen estadístico (R3)
 */
const SummaryPanel = ({ summary }) => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full mb-6">
            {/* PPM Promedio */}
            <div className="bg-white dark:bg-slate-800 backdrop-blur-md supports-[backdrop-filter]:bg-white/80 supports-[backdrop-filter]:dark:bg-slate-800/80 rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center space-x-3 transition-all hover:shadow-md">
                <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 shrink-0">
                    <Zap className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 block truncate">PPM Promedio</span>
                    <div className="text-xl font-bold font-mono text-slate-800 dark:text-slate-100 flex items-baseline gap-1">
                        {summary.avgWpm}
                        <span className="text-[10px] font-normal text-slate-400">PPM</span>
                    </div>
                </div>
            </div>

            {/* PPM Máximo (Récord) */}
            <div className="bg-white dark:bg-slate-800 backdrop-blur-md supports-[backdrop-filter]:bg-white/80 supports-[backdrop-filter]:dark:bg-slate-800/80 rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center space-x-3 transition-all hover:shadow-md">
                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40 shrink-0">
                    <Trophy className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 block truncate">PPM Máximo (Récord)</span>
                    <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 flex items-baseline gap-1">
                        {summary.maxWpm}
                        <span className="text-[10px] font-normal text-slate-400">PPM</span>
                    </div>
                </div>
            </div>

            {/* Precisión Promedio */}
            <div className="bg-white dark:bg-slate-800 backdrop-blur-md supports-[backdrop-filter]:bg-white/80 supports-[backdrop-filter]:dark:bg-slate-800/80 rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center space-x-3 transition-all hover:shadow-md">
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 shrink-0">
                    <Target className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 block truncate">Precisión Promedio</span>
                    <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 flex items-baseline gap-1">
                        {summary.avgPrecision}%
                    </div>
                </div>
            </div>

            {/* Total de Prácticas */}
            <div className="bg-white dark:bg-slate-800 backdrop-blur-md supports-[backdrop-filter]:bg-white/80 supports-[backdrop-filter]:dark:bg-slate-800/80 rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center space-x-3 transition-all hover:shadow-md">
                <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 shrink-0">
                    <BarChart3 className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 block truncate">Total de Prácticas</span>
                    <div className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400 flex items-baseline gap-1">
                        {summary.totalPractices}
                        <span className="text-[10px] font-normal text-slate-400">sesiones</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * Tooltip Flotante Estilizado Glassmorphism (R3)
 * Con anclaje direccional dinámico para evitar desbordes laterales en móviles (320px/480px).
 */
const FloatingTooltip = ({ attempt, index, xPercent, yPercent }) => {
    if (!attempt || index === null) return null;

    const x = Number.isFinite(Number(xPercent)) ? Number(xPercent) : 50;
    const y = Number.isFinite(Number(yPercent)) ? Number(yPercent) : 35;

    // Anclaje horizontal adaptativo según proximidad a los bordes
    let alignClass = "-translate-x-1/2";
    let leftPos = `${x}%`;

    if (x < 25) {
        // Cerca del borde izquierdo: anclar a la izquierda expandiendo a la derecha
        alignClass = "translate-x-0";
        leftPos = `${Math.max(2, x)}%`;
    } else if (x > 75) {
        // Cerca del borde derecho: anclar a la derecha expandiendo a la izquierda
        alignClass = "-translate-x-full";
        leftPos = `${Math.min(98, x)}%`;
    }

    const topPos = `${Math.max(25, y)}%`;

    const wpmVal = Math.round(parseMetric(attempt.wpm, 0));
    const precVal = Math.round(parseMetric(attempt.precision ?? attempt.accuracy, 0));
    const errorsVal = Math.round(parseMetric(attempt.errorChars ?? attempt.errors ?? attempt.fallos, 0));

    return (
        <div 
            className={`absolute z-30 pointer-events-none transition-all duration-150 ease-out transform -translate-y-full mb-3 ${alignClass}`}
            style={{ left: leftPos, top: topPos }}
        >
            <div className="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-xl border border-slate-700/80 dark:border-slate-800 rounded-xl p-3 shadow-2xl text-white text-xs w-60 max-w-[calc(100vw-2rem)] space-y-2 select-none">
                {/* Cabecera: Intento y Lección */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                    <span className="font-bold text-sky-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-sky-400 motion-safe:animate-pulse inline-block shrink-0"></span>
                        Intento #{index + 1}
                    </span>
                    <span className="text-[10px] font-medium text-slate-300 px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/50 truncate max-w-[120px]">
                        {attempt.lessonTitle || `Lección ${attempt.lessonId || 1}`}
                    </span>
                </div>

                {/* Fecha y Hora exacta (R1 & R3) */}
                <div className="text-[10px] text-slate-300 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{formatFullTimestamp(attempt)}</span>
                </div>

                {/* Grid 2x2 de métricas detalladas */}
                <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                    <div className="bg-slate-800/60 p-1.5 rounded border border-slate-700/40">
                        <div className="text-[9px] text-slate-400 flex items-center gap-1">
                            <Zap className="w-2.5 h-2.5 text-sky-400 shrink-0" /> Velocidad
                        </div>
                        <div className="text-xs font-mono font-bold text-sky-300 mt-0.5">
                            {wpmVal} <span className="text-[9px] font-normal text-slate-400">PPM</span>
                        </div>
                    </div>

                    <div className="bg-slate-800/60 p-1.5 rounded border border-slate-700/40">
                        <div className="text-[9px] text-slate-400 flex items-center gap-1">
                            <Target className="w-2.5 h-2.5 text-emerald-400 shrink-0" /> Precisión
                        </div>
                        <div className="text-xs font-mono font-bold text-emerald-300 mt-0.5">
                            {precVal}%
                        </div>
                    </div>

                    <div className="bg-slate-800/60 p-1.5 rounded border border-slate-700/40">
                        <div className="text-[9px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 text-amber-400 shrink-0" /> Duración
                        </div>
                        <div className="text-xs font-mono font-bold text-amber-300 mt-0.5">
                            {formatDur(attempt.duration)}
                        </div>
                    </div>

                    <div className="bg-slate-800/60 p-1.5 rounded border border-slate-700/40">
                        <div className="text-[9px] text-slate-400 flex items-center gap-1">
                            <AlertCircle className="w-2.5 h-2.5 text-rose-400 shrink-0" /> Errores
                        </div>
                        <div className="text-xs font-mono font-bold text-rose-300 mt-0.5">
                            {errorsVal}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ==========================================
// 1. GRÁFICO DE VELOCIDAD PPM (BARRAS ESTILIZADAS CON GRADIENTE)
// ==========================================
const SpeedChart = ({ validAttempts, hoveredIndex, setHoveredIndex, activeChart, setActiveChart, isDark }) => {
    const N = validAttempts.length;
    const paddingLeft = 45;
    const paddingRight = 20;
    const paddingTop = 25;
    const paddingBottom = 35;
    const svgW = 600;
    const svgH = 220;
    const chartW = svgW - paddingLeft - paddingRight;
    const chartH = svgH - paddingTop - paddingBottom;
    const yBase = paddingTop + chartH;

    const wpms = validAttempts.map(a => Math.max(0, parseMetric(a?.wpm, 0)));
    const maxVal = Math.max(safeMax(wpms, 0), 20);
    const maxScale = Math.max(30, Math.ceil(maxVal / 10) * 10);

    const visibleLabels = useMemo(() => new Set(getVisibleLabelIndices(N, 10)), [N]);
    const slotW = chartW / (N || 1);
    // Ancho adaptativo que previene colisión y superposición física de barras para cualquier N
    const barW = Math.min(32, Math.max(2, slotW * 0.65));

    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    const isThisChartActive = activeChart === 'speed';
    const activeAttempt = isThisChartActive && hoveredIndex !== null && hoveredIndex < N ? validAttempts[hoveredIndex] : null;
    const activePercentX = activeAttempt ? ((paddingLeft + (hoveredIndex + 0.5) * slotW) / svgW) * 100 : 50;

    return (
        <div className="bg-white dark:bg-slate-800/80 backdrop-blur-md p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex flex-col relative transition-all">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                        Velocidad PPM
                    </h4>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">PPM por sesión</span>
            </div>

            <div 
                className="relative w-full overflow-visible"
                onMouseLeave={() => { setHoveredIndex(null); setActiveChart(null); }}
                onClick={(e) => {
                    if (e.target.tagName !== 'rect') {
                        setHoveredIndex(null);
                        setActiveChart(null);
                    }
                }}
            >
                {activeAttempt && (
                    <FloatingTooltip 
                        attempt={activeAttempt} 
                        index={hoveredIndex} 
                        xPercent={activePercentX} 
                        yPercent={35} 
                    />
                )}

                <svg 
                    viewBox={`0 0 ${svgW} ${svgH}`} 
                    preserveAspectRatio="xMidYMid meet" 
                    className="w-full h-auto overflow-visible select-none"
                    role="img"
                    aria-label="Gráfico de evolución de velocidad en PPM por sesión"
                >
                    <defs>
                        <linearGradient id="speedBarGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#38bdf8" />
                            <stop offset="100%" stopColor="#2563eb" />
                        </linearGradient>
                        <linearGradient id="speedBarActiveGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#67e8f9" />
                            <stop offset="100%" stopColor="#0284c7" />
                        </linearGradient>
                        <filter id="barGlow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>

                    {/* Líneas de Guía Horizontales */}
                    {[0, 0.33, 0.66, 1].map((ratio, i) => {
                        const yPos = yBase - ratio * chartH;
                        const labelVal = Math.round(ratio * maxScale);
                        return (
                            <g key={i}>
                                <line 
                                    x1={paddingLeft} 
                                    y1={yPos} 
                                    x2={paddingLeft + chartW} 
                                    y2={yPos} 
                                    stroke={gridColor} 
                                    strokeDasharray={ratio === 0 ? undefined : "3 3"} 
                                />
                                <text 
                                    x={paddingLeft - 8} 
                                    y={yPos + 3} 
                                    fontSize="9" 
                                    fill={textColor} 
                                    textAnchor="end" 
                                    className="font-mono"
                                >
                                    {labelVal}
                                </text>
                            </g>
                        );
                    })}

                    {/* Barras de datos */}
                    {validAttempts.map((att, idx) => {
                        const wpmVal = Math.max(0, parseMetric(att?.wpm, 0));
                        const h = Math.max(4, (wpmVal / maxScale) * chartH);
                        const cx = paddingLeft + (idx + 0.5) * slotW;
                        const x = cx - barW / 2;
                        const y = yBase - h;
                        const isHovered = hoveredIndex === idx;

                        return (
                            <g key={idx} className="transition-all duration-200">
                                {/* Barra */}
                                <rect 
                                    x={x} 
                                    y={y} 
                                    width={barW} 
                                    height={h} 
                                    rx={Math.min(4, barW / 2)} 
                                    ry={Math.min(4, barW / 2)} 
                                    fill={isHovered ? "url(#speedBarActiveGradient)" : "url(#speedBarGradient)"} 
                                    opacity={hoveredIndex === null || isHovered ? 1 : 0.55}
                                    filter={isHovered ? "url(#barGlow)" : undefined}
                                    className="cursor-pointer transition-all duration-150"
                                />

                                {/* Valor numérico superior */}
                                {(slotW >= 22 || isHovered) && (
                                    <text 
                                        x={cx} 
                                        y={y - 5} 
                                        fontSize={isHovered ? "10" : "8.5"} 
                                        fontWeight={isHovered ? "bold" : "600"} 
                                        fill={isHovered ? (isDark ? "#38bdf8" : "#0284c7") : textColor} 
                                        textAnchor="middle" 
                                        className="font-mono"
                                    >
                                        {Math.round(wpmVal)}
                                    </text>
                                )}

                                {/* Tick y Etiqueta Eje X (Anti-solapamiento estricto) */}
                                <line 
                                    x1={cx} 
                                    y1={yBase} 
                                    x2={cx} 
                                    y2={yBase + 4} 
                                    stroke={gridColor} 
                                />
                                {visibleLabels.has(idx) && (
                                    <text 
                                        x={cx} 
                                        y={yBase + 16} 
                                        fontSize="9" 
                                        fontWeight="500" 
                                        fill={isHovered ? (isDark ? "#f8fafc" : "#0f172a") : textColor} 
                                        textAnchor="middle" 
                                        className="font-mono select-none"
                                    >
                                        #{idx + 1}
                                    </text>
                                )}

                                {/* Área de interacción táctil/ratón/teclado accesible */}
                                <rect 
                                    x={cx - slotW / 2} 
                                    y={paddingTop} 
                                    width={slotW} 
                                    height={chartH + paddingBottom} 
                                    fill="transparent" 
                                    className="cursor-pointer focus:outline-none"
                                    tabIndex="0"
                                    role="button"
                                    aria-label={`Intento ${idx + 1}: ${Math.round(wpmVal)} PPM`}
                                    onMouseEnter={() => { setHoveredIndex(idx); setActiveChart('speed'); }}
                                    onFocus={() => { setHoveredIndex(idx); setActiveChart('speed'); }}
                                    onBlur={() => { setHoveredIndex(null); setActiveChart(null); }}
                                    onTouchStart={(e) => {
                                        if (e.touches && e.touches.length > 1) return;
                                        e.stopPropagation();
                                        if (hoveredIndex === idx && activeChart === 'speed') {
                                            setHoveredIndex(null);
                                            setActiveChart(null);
                                        } else {
                                            setHoveredIndex(idx);
                                            setActiveChart('speed');
                                        }
                                    }}
                                />
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
};

// ==========================================
// 2. GRÁFICO DE PRECISIÓN % (LOLLIPOP MODERNO CON CÓDIGO DE COLORES)
// ==========================================
const PrecisionChart = ({ validAttempts, hoveredIndex, setHoveredIndex, activeChart, setActiveChart, isDark }) => {
    const N = validAttempts.length;
    const paddingLeft = 45;
    const paddingRight = 20;
    const paddingTop = 25;
    const paddingBottom = 35;
    const svgW = 600;
    const svgH = 220;
    const chartW = svgW - paddingLeft - paddingRight;
    const chartH = svgH - paddingTop - paddingBottom;
    const yBase = paddingTop + chartH;

    const precisions = validAttempts.map(a => Math.max(0, Math.min(100, parseMetric(a?.precision ?? a?.accuracy, 0))));
    const minVal = safeMin(precisions, 100);
    const minScale = Math.max(0, Math.min(80, Math.floor((minVal - 5) / 10) * 10));
    const maxScale = 100;
    const range = (maxScale - minScale) || 1;

    const visibleLabels = useMemo(() => new Set(getVisibleLabelIndices(N, 10)), [N]);
    const slotW = chartW / (N || 1);

    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    const isThisChartActive = activeChart === 'precision';
    const activeAttempt = isThisChartActive && hoveredIndex !== null && hoveredIndex < N ? validAttempts[hoveredIndex] : null;
    const activePercentX = activeAttempt ? ((paddingLeft + (hoveredIndex + 0.5) * slotW) / svgW) * 100 : 50;

    return (
        <div className="bg-white dark:bg-slate-800/80 backdrop-blur-md p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex flex-col relative transition-all">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                        Precisión %
                    </h4>
                </div>
                <div className="flex items-center space-x-3 text-[10px]">
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> ≥95%
                    </span>
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> 90-94%
                    </span>
                    <span className="flex items-center gap-1 text-rose-500 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> &lt;90%
                    </span>
                </div>
            </div>

            <div 
                className="relative w-full overflow-visible"
                onMouseLeave={() => { setHoveredIndex(null); setActiveChart(null); }}
                onClick={(e) => {
                    if (e.target.tagName !== 'circle' && e.target.tagName !== 'line') {
                        setHoveredIndex(null);
                        setActiveChart(null);
                    }
                }}
            >
                {activeAttempt && (
                    <FloatingTooltip 
                        attempt={activeAttempt} 
                        index={hoveredIndex} 
                        xPercent={activePercentX} 
                        yPercent={35} 
                    />
                )}

                <svg 
                    viewBox={`0 0 ${svgW} ${svgH}`} 
                    preserveAspectRatio="xMidYMid meet" 
                    className="w-full h-auto overflow-visible select-none"
                    role="img"
                    aria-label="Gráfico de evolución de precisión porcentual"
                >
                    {/* Líneas de Guía de Referencia */}
                    {[100, 95, 90, minScale].filter((v, i, a) => a.indexOf(v) === i).map((lvl, i) => {
                        const yPos = yBase - ((lvl - minScale) / range) * chartH;
                        let lineStroke = gridColor;
                        if (lvl === 95) lineStroke = isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.25)';
                        if (lvl === 90) lineStroke = isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.25)';
                        
                        return (
                            <g key={i}>
                                <line 
                                    x1={paddingLeft} 
                                    y1={yPos} 
                                    x2={paddingLeft + chartW} 
                                    y2={yPos} 
                                    stroke={lineStroke} 
                                    strokeDasharray={lvl === 100 || lvl === minScale ? undefined : "3 3"} 
                                />
                                <text 
                                    x={paddingLeft - 8} 
                                    y={yPos + 3} 
                                    fontSize="9" 
                                    fill={textColor} 
                                    textAnchor="end" 
                                    className="font-mono"
                                >
                                    {lvl}%
                                </text>
                            </g>
                        );
                    })}

                    {/* Indicadores Lollipop */}
                    {validAttempts.map((att, idx) => {
                        const precVal = Math.max(0, Math.min(100, parseMetric(att?.precision ?? att?.accuracy, 0)));
                        const cy = yBase - ((precVal - minScale) / range) * chartH;
                        const cx = paddingLeft + (idx + 0.5) * slotW;
                        const color = getPrecisionColor(precVal);
                        const isHovered = hoveredIndex === idx;
                        // Radio proporcional adaptativo para que las esferas nunca se solapen en colecciones densas
                        const circleR = isHovered ? 6.5 : Math.min(4.5, Math.max(2, slotW * 0.35));

                        return (
                            <g key={idx} className="transition-all duration-200">
                                {/* Tallo del lollipop */}
                                <line 
                                    x1={cx} 
                                    y1={yBase} 
                                    x2={cx} 
                                    y2={cy} 
                                    stroke={color.fill} 
                                    strokeWidth={isHovered ? "2.5" : "1.8"} 
                                    opacity={hoveredIndex === null || isHovered ? 0.85 : 0.4}
                                />

                                {/* Halo de selección en hover (R2.2) */}
                                {isHovered && (
                                    <circle 
                                        cx={cx} 
                                        cy={cy} 
                                        r="12" 
                                        fill={color.fill} 
                                        fillOpacity="0.22" 
                                        className="motion-safe:animate-pulse"
                                    />
                                )}

                                {/* Cabeza del lollipop */}
                                <circle 
                                    cx={cx} 
                                    cy={cy} 
                                    r={circleR} 
                                    fill={color.fill} 
                                    stroke="#ffffff" 
                                    strokeWidth={isHovered ? "2" : "1.5"} 
                                    className="cursor-pointer transition-all duration-150"
                                />

                                {/* Valor % encima de la cabeza */}
                                {(slotW >= 22 || isHovered) && (
                                    <text 
                                        x={cx} 
                                        y={cy - 9} 
                                        fontSize={isHovered ? "10" : "8.5"} 
                                        fontWeight={isHovered ? "bold" : "600"} 
                                        fill={isHovered ? color.fill : textColor} 
                                        textAnchor="middle" 
                                        className="font-mono"
                                    >
                                        {Math.round(precVal)}%
                                    </text>
                                )}

                                {/* Tick y Etiqueta Eje X (Anti-solapamiento estricto) */}
                                <line 
                                    x1={cx} 
                                    y1={yBase} 
                                    x2={cx} 
                                    y2={yBase + 4} 
                                    stroke={gridColor} 
                                />
                                {visibleLabels.has(idx) && (
                                    <text 
                                        x={cx} 
                                        y={yBase + 16} 
                                        fontSize="9" 
                                        fontWeight="500" 
                                        fill={isHovered ? (isDark ? "#f8fafc" : "#0f172a") : textColor} 
                                        textAnchor="middle" 
                                        className="font-mono select-none"
                                    >
                                        #{idx + 1}
                                    </text>
                                )}

                                {/* Área de interacción táctil/ratón/teclado accesible */}
                                <rect 
                                    x={cx - slotW / 2} 
                                    y={paddingTop} 
                                    width={slotW} 
                                    height={chartH + paddingBottom} 
                                    fill="transparent" 
                                    className="cursor-pointer focus:outline-none"
                                    tabIndex="0"
                                    role="button"
                                    aria-label={`Intento ${idx + 1}: ${Math.round(precVal)}% de precisión`}
                                    onMouseEnter={() => { setHoveredIndex(idx); setActiveChart('precision'); }}
                                    onFocus={() => { setHoveredIndex(idx); setActiveChart('precision'); }}
                                    onBlur={() => { setHoveredIndex(null); setActiveChart(null); }}
                                    onTouchStart={(e) => {
                                        if (e.touches && e.touches.length > 1) return;
                                        e.stopPropagation();
                                        if (hoveredIndex === idx && activeChart === 'precision') {
                                            setHoveredIndex(null);
                                            setActiveChart(null);
                                        } else {
                                            setHoveredIndex(idx);
                                            setActiveChart('precision');
                                        }
                                    }}
                                />
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
};

// ==========================================
// 3. GRÁFICO COMBINADO DE VELOCIDAD Y PRECISIÓN (CURVAS BÉZIER SUAVES)
// ==========================================
const CombinedChart = ({ validAttempts, hoveredIndex, setHoveredIndex, activeChart, setActiveChart, isDark }) => {
    const N = validAttempts.length;
    const paddingLeft = 45;
    const paddingRight = 45;
    const paddingTop = 30;
    const paddingBottom = 40;
    const svgW = 640;
    const svgH = 320;
    const chartW = svgW - paddingLeft - paddingRight;
    const chartH = svgH - paddingTop - paddingBottom;
    const yBase = paddingTop + chartH;

    const wpms = validAttempts.map(a => Math.max(0, parseMetric(a?.wpm, 0)));
    const precisions = validAttempts.map(a => Math.max(0, Math.min(100, parseMetric(a?.precision ?? a?.accuracy, 0))));

    // Escala WPM (Eje Izquierdo)
    const minWpmVal = safeMin(wpms, 0);
    const maxWpmVal = safeMax(wpms, 0);
    let minW = Math.max(0, minWpmVal - 5);
    let maxW = maxWpmVal + 5;
    if (maxW - minW < 10) {
        minW = Math.max(0, minW - 5);
        maxW = minW + 10;
    }
    const wpmRange = (maxW - minW) || 1;

    // Escala Precisión (Eje Derecho)
    const minPrecVal = safeMin(precisions, 100);
    const maxPrecVal = safeMax(precisions, 100);
    let minP = Math.max(0, minPrecVal - 3);
    let maxP = Math.min(100, maxPrecVal + 3);
    if (maxP - minP < 10) {
        minP = Math.max(0, maxP - 10);
        maxP = Math.min(100, minP + 10);
    }
    const precRange = (maxP - minP) || 1;

    // Puntos geométricos calculados con proporción perfecta
    const points = validAttempts.map((att, idx) => {
        const x = N === 1 
            ? paddingLeft + chartW / 2 
            : paddingLeft + (idx / (N - 1 || 1)) * chartW;
        
        const wpm = Math.max(0, parseMetric(att?.wpm, 0));
        const prec = Math.max(0, Math.min(100, parseMetric(att?.precision ?? att?.accuracy, 0)));

        const yWpm = yBase - ((wpm - minW) / wpmRange) * chartH;
        const yPrec = yBase - ((prec - minP) / precRange) * chartH;

        return { x, yWpm, yPrec, wpm, prec, attempt: att, idx };
    });

    // Curvas Bézier Suaves (Cubic Bézier Splines) (R2.3)
    const wpmSmoothPath = getCubicBezierPath(points.map(p => ({ x: p.x, y: p.yWpm })));
    const precSmoothPath = getCubicBezierPath(points.map(p => ({ x: p.x, y: p.yPrec })));
    
    // Área sombreada con degradado translúcido bajo la curva de velocidad
    const wpmAreaPath = points.length > 1 
        ? `${wpmSmoothPath} L ${points[points.length - 1].x} ${yBase} L ${points[0].x} ${yBase} Z`
        : '';

    const visibleLabels = useMemo(() => new Set(getVisibleLabelIndices(N, 10)), [N]);
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    const isThisChartActive = activeChart === 'combined';
    const activeAttempt = isThisChartActive && hoveredIndex !== null && hoveredIndex < N ? validAttempts[hoveredIndex] : null;
    const activePoint = isThisChartActive && hoveredIndex !== null && hoveredIndex < points.length ? points[hoveredIndex] : null;
    const activePercentX = activePoint ? (activePoint.x / svgW) * 100 : 50;

    return (
        <div className="bg-white dark:bg-slate-800/80 backdrop-blur-md p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex flex-col w-full relative transition-all">
            <div className="flex flex-wrap items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3 mb-4 gap-2">
                <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                        Velocidad y Precisión Combinadas
                    </h4>
                    <span className="text-[10px] text-slate-400">
                        Curvas suaves continuas comparando PPM y Precisión (%) en la misma escala temporal
                    </span>
                </div>

                {/* Leyenda distintiva */}
                <div className="flex items-center space-x-5 text-xs font-semibold">
                    <div className="flex items-center space-x-1.5">
                        <span className="w-3 h-3 bg-sky-500 rounded-full inline-block shadow-sm"></span>
                        <span className="text-slate-600 dark:text-slate-300">Velocidad (PPM)</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                        <span className="w-3 h-3 bg-emerald-500 rounded-full inline-block shadow-sm"></span>
                        <span className="text-slate-600 dark:text-slate-300">Precisión (%)</span>
                    </div>
                </div>
            </div>

            <div 
                className="relative w-full overflow-visible"
                onMouseLeave={() => { setHoveredIndex(null); setActiveChart(null); }}
                onClick={(e) => {
                    if (e.target.tagName !== 'circle' && e.target.tagName !== 'path' && e.target.tagName !== 'rect') {
                        setHoveredIndex(null);
                        setActiveChart(null);
                    }
                }}
            >
                {activeAttempt && (
                    <FloatingTooltip 
                        attempt={activeAttempt} 
                        index={hoveredIndex} 
                        xPercent={activePercentX} 
                        yPercent={30} 
                    />
                )}

                <svg 
                    viewBox={`0 0 ${svgW} ${svgH}`} 
                    preserveAspectRatio="xMidYMid meet" 
                    className="w-full h-auto overflow-visible select-none"
                    role="img"
                    aria-label="Gráfico combinado de evolución de velocidad y precisión con curvas suaves Bézier"
                >
                    <defs>
                        {/* Gradiente translúcido premium bajo la curva de velocidad (R2.3) */}
                        <linearGradient id="combinedSpeedGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0284c7" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
                        </linearGradient>

                        {/* Filtro de brillo sutil para puntos destacados */}
                        <filter id="pointPulse" x="-30%" y="-30%" width="160%" height="160%">
                            <feGaussianBlur stdDeviation="2.5" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>

                    {/* Líneas de guía horizontales de cuadrícula */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                        const yPos = yBase - ratio * chartH;
                        const wpmVal = Math.round(minW + ratio * wpmRange);
                        const precVal = Math.round(minP + ratio * precRange);
                        return (
                            <g key={i}>
                                <line 
                                    x1={paddingLeft} 
                                    y1={yPos} 
                                    x2={paddingLeft + chartW} 
                                    y2={yPos} 
                                    stroke={gridColor} 
                                    strokeDasharray={ratio === 0 ? undefined : "3 3"} 
                                />
                                {/* Eje Izquierdo: PPM */}
                                <text 
                                    x={paddingLeft - 8} 
                                    y={yPos + 3} 
                                    fontSize="8.5" 
                                    fill="#0284c7" 
                                    fontWeight="600" 
                                    textAnchor="end" 
                                    className="font-mono"
                                >
                                    {wpmVal}
                                </text>
                                {/* Eje Derecho: Precisión % */}
                                <text 
                                    x={paddingLeft + chartW + 8} 
                                    y={yPos + 3} 
                                    fontSize="8.5" 
                                    fill="#059669" 
                                    fontWeight="600" 
                                    textAnchor="start" 
                                    className="font-mono"
                                >
                                    {precVal}%
                                </text>
                            </g>
                        );
                    })}

                    {/* Área sombreada con degradado bajo la curva de velocidad */}
                    {wpmAreaPath && (
                        <path d={wpmAreaPath} fill="url(#combinedSpeedGradient)" />
                    )}

                    {/* Curva Bézier Suave de Velocidad (Línea continua elegante) */}
                    {wpmSmoothPath && (
                        <path 
                            d={wpmSmoothPath} 
                            fill="none" 
                            stroke="#0284c7" 
                            strokeWidth="3.2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                        />
                    )}

                    {/* Curva Bézier Suave de Precisión (Línea punteada fina de contraste) */}
                    {precSmoothPath && (
                        <path 
                            d={precSmoothPath} 
                            fill="none" 
                            stroke="#10b981" 
                            strokeWidth="2" 
                            strokeDasharray="4 3" 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            opacity="0.85"
                        />
                    )}

                    {/* Guía vertical de cursor (crosshair) al pasar el ratón */}
                    {activePoint && (
                        <line 
                            x1={activePoint.x} 
                            y1={paddingTop} 
                            x2={activePoint.x} 
                            y2={yBase} 
                            stroke={isDark ? "rgba(255, 255, 255, 0.25)" : "rgba(15, 23, 42, 0.2)"} 
                            strokeDasharray="2 2" 
                            strokeWidth="1.2"
                        />
                    )}

                    {/* Puntos de datos y etiquetas */}
                    {points.map((p, idx) => {
                        const isHovered = hoveredIndex === idx;
                        const pointR = isHovered ? 6 : Math.min(4, Math.max(2, (chartW / (N - 1 || 1)) * 0.25));

                        return (
                            <g key={idx}>
                                {/* Halo de foco al pasar el ratón (R2.3) */}
                                {isHovered && (
                                    <>
                                        <circle 
                                            cx={p.x} 
                                            cy={p.yWpm} 
                                            r="11" 
                                            fill="#0284c7" 
                                            fillOpacity="0.25" 
                                            className="motion-safe:animate-pulse"
                                        />
                                        <circle 
                                            cx={p.x} 
                                            cy={p.yPrec} 
                                            r="11" 
                                            fill="#10b981" 
                                            fillOpacity="0.25" 
                                            className="motion-safe:animate-pulse"
                                        />
                                    </>
                                )}

                                {/* Punto de Velocidad */}
                                <circle 
                                    cx={p.x} 
                                    cy={p.yWpm} 
                                    r={pointR} 
                                    fill="#0284c7" 
                                    stroke="#ffffff" 
                                    strokeWidth={isHovered ? "2" : "1.5"} 
                                    filter={isHovered ? "url(#pointPulse)" : undefined}
                                    className="cursor-pointer transition-all duration-150"
                                />

                                {/* Punto de Precisión */}
                                <circle 
                                    cx={p.x} 
                                    cy={p.yPrec} 
                                    r={pointR} 
                                    fill="#10b981" 
                                    stroke="#ffffff" 
                                    strokeWidth={isHovered ? "2" : "1.5"} 
                                    filter={isHovered ? "url(#pointPulse)" : undefined}
                                    className="cursor-pointer transition-all duration-150"
                                />

                                {/* Etiquetas numéricas anti-colisión vertical y anti-solapamiento con eje X */}
                                {(N <= 15 || isHovered) && (() => {
                                    const yDiff = p.yWpm - p.yPrec;
                                    const isClose = Math.abs(yDiff) < 22;
                                    let wpmTextY, precTextY;

                                    if (isClose) {
                                        const lowerY = Math.max(p.yWpm, p.yPrec);
                                        const higherY = Math.min(p.yWpm, p.yPrec);

                                        // Si los puntos están cerca del fondo (yBase), apilar AMBAS etiquetas HACIA ARRIBA
                                        // para evitar que la etiqueta inferior aterrice en yBase + 17 colisionando con el eje X (#1, #2...)
                                        if (lowerY > yBase - 26) {
                                            if (p.yWpm <= p.yPrec) {
                                                wpmTextY = higherY - 20;
                                                precTextY = lowerY - 8;
                                            } else {
                                                precTextY = higherY - 20;
                                                wpmTextY = lowerY - 8;
                                            }
                                        } 
                                        // Si los puntos están cerca del techo (paddingTop), apilar AMBAS etiquetas HACIA ABAJO
                                        else if (higherY < paddingTop + 22) {
                                            if (p.yWpm <= p.yPrec) {
                                                wpmTextY = higherY + 12;
                                                precTextY = lowerY + 24;
                                            } else {
                                                precTextY = higherY + 12;
                                                wpmTextY = lowerY + 24;
                                            }
                                        } 
                                        // Rango intermedio: superior arriba y la inferior abajo con separación segura
                                        else {
                                            if (p.yWpm <= p.yPrec) {
                                                wpmTextY = p.yWpm - 9;
                                                precTextY = p.yPrec + 16;
                                            } else {
                                                precTextY = p.yPrec - 9;
                                                wpmTextY = p.yPrec + 16;
                                            }
                                        }
                                    } else {
                                        wpmTextY = p.yWpm - 8;
                                        precTextY = p.yPrec - 8;
                                    }

                                    return (
                                        <>
                                            <text 
                                                x={p.x} 
                                                y={wpmTextY} 
                                                fontSize={isHovered ? "10" : "8"} 
                                                fontWeight="bold" 
                                                fill="#0284c7" 
                                                textAnchor="middle" 
                                                className="font-mono"
                                            >
                                                {Math.round(p.wpm)}
                                            </text>
                                            <text 
                                                x={p.x} 
                                                y={precTextY} 
                                                fontSize={isHovered ? "10" : "8"} 
                                                fontWeight="bold" 
                                                fill="#059669" 
                                                textAnchor="middle" 
                                                className="font-mono"
                                            >
                                                {Math.round(p.prec)}%
                                            </text>
                                        </>
                                    );
                                })()}

                                {/* Tick y Etiqueta Eje X (Anti-solapamiento estricto) */}
                                <line 
                                    x1={p.x} 
                                    y1={yBase} 
                                    x2={p.x} 
                                    y2={yBase + 4} 
                                    stroke={gridColor} 
                                />
                                {visibleLabels.has(idx) && (
                                    <text 
                                        x={p.x} 
                                        y={yBase + 17} 
                                        fontSize="9" 
                                        fontWeight="500" 
                                        fill={isHovered ? (isDark ? "#f8fafc" : "#0f172a") : textColor} 
                                        textAnchor="middle" 
                                        className="font-mono select-none"
                                    >
                                        #{idx + 1}
                                    </text>
                                )}

                                {/* Área de interacción vertical accesible por ratón, toque y teclado */}
                                <rect 
                                    x={N === 1 ? paddingLeft : p.x - (chartW / (N - 1 || 1)) / 2} 
                                    y={paddingTop} 
                                    width={N === 1 ? chartW : chartW / (N - 1 || 1)} 
                                    height={chartH + paddingBottom} 
                                    fill="transparent" 
                                    className="cursor-pointer focus:outline-none"
                                    tabIndex="0"
                                    role="button"
                                    aria-label={`Intento ${idx + 1}: ${Math.round(p.wpm)} PPM, ${Math.round(p.prec)}% de precisión`}
                                    onMouseEnter={() => { setHoveredIndex(idx); setActiveChart('combined'); }}
                                    onFocus={() => { setHoveredIndex(idx); setActiveChart('combined'); }}
                                    onBlur={() => { setHoveredIndex(null); setActiveChart(null); }}
                                    onTouchStart={(e) => {
                                        if (e.touches && e.touches.length > 1) return;
                                        e.stopPropagation();
                                        if (hoveredIndex === idx && activeChart === 'combined') {
                                            setHoveredIndex(null);
                                            setActiveChart(null);
                                        } else {
                                            setHoveredIndex(idx);
                                            setActiveChart('combined');
                                        }
                                    }}
                                />
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
};

// ==========================================
// COMPONENTE PRINCIPAL: EVOLUTION CHARTS
// ==========================================
export default function EvolutionCharts({ filteredAttempts, theme }) {
    const validAttempts = useMemo(() => {
        return (Array.isArray(filteredAttempts) ? filteredAttempts : [])
            .filter(a => a && typeof a === 'object');
    }, [filteredAttempts]);

    const [hoveredIndex, setHoveredIndex] = useState(null);
    const [activeChart, setActiveChart] = useState(null);

    // Detección robusta de modo oscuro tanto por prop como por DOM
    const isDark = useMemo(() => {
        if (theme === 'dark') return true;
        if (theme === 'light') return false;
        if (typeof document !== 'undefined') {
            return document.documentElement.classList.contains('dark') ||
                   !!document.querySelector('.bg-premium-dark') ||
                   !!document.querySelector('.premium-redesign');
        }
        return false;
    }, [theme]);

    // Resumen estadístico
    const summary = useMemo(() => {
        return computeEvolutionSummary(validAttempts);
    }, [validAttempts]);

    // Inmunidad ante colecciones vacías o no válidas
    if (!validAttempts || validAttempts.length === 0) {
        return null;
    }

    return (
        <div className="w-full space-y-6 mt-8">
            {/* R3. Panel superior de resumen estadístico */}
            <SummaryPanel summary={summary} />

            {/* R2. Gráficos de Velocidad y Precisión en Grid Responsivo */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
                <SpeedChart 
                    validAttempts={validAttempts} 
                    hoveredIndex={hoveredIndex} 
                    setHoveredIndex={setHoveredIndex} 
                    activeChart={activeChart} 
                    setActiveChart={setActiveChart} 
                    isDark={isDark} 
                />
                <PrecisionChart 
                    validAttempts={validAttempts} 
                    hoveredIndex={hoveredIndex} 
                    setHoveredIndex={setHoveredIndex} 
                    activeChart={activeChart} 
                    setActiveChart={setActiveChart} 
                    isDark={isDark} 
                />
            </div>

            {/* R2.3. Gráfico Combinado con Curvas Bézier Suaves y Área Translúcida */}
            <CombinedChart 
                validAttempts={validAttempts} 
                hoveredIndex={hoveredIndex} 
                setHoveredIndex={setHoveredIndex} 
                activeChart={activeChart} 
                setActiveChart={setActiveChart} 
                isDark={isDark} 
            />
        </div>
    );
}
