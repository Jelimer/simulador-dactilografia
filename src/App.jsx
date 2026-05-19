import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    Play, RotateCcw, CheckCircle, Clock, User, BookOpen, Settings,
    Star, Volume2, VolumeX, Award, ArrowLeft
} from 'lucide-react';

// ==========================================
// AUDIO SYNTH GENERATOR (Sin archivos externos para evitar CSP/errores)
// ==========================================
const playTypingSound = (isCorrect, isMuted) => {
    if (isMuted) return;
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        
        if (isCorrect) {
            // Sonido de máquina de escribir física / teclado mecánico sutil ("Click")
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1200, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.04);
            
            gain.gain.setValueAtTime(0.04, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.04);
        } else {
            // Sonido sordo / error de pulsación ("Buzzer" bajo)
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(160, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.12);
            
            gain.gain.setValueAtTime(0.07, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.12);
        }
    } catch (e) {
        // Silencioso si el navegador bloquea AudioContext temporalmente
    }
};

// ==========================================
// 1. DATOS DEL SIMULADOR JUDICIAL
// ==========================================
const LEGAL_TEXTS = [
    {
        id: 1,
        title: "Constitución Provincial (Corrientes) - Art. 41 y ss.",
        content: "Artículo 41.- Las disposiciones de este Título serán aplicables a todo el personal judicial comprendiéndose en esta denominación los Magistrados, Funcionarios, Secretarios, Técnicos Profesionales, empleados administrativos y personal de servicio y maestranza de todas las reparticiones dependientes del Poder Judicial de la Provincia, con las excepciones que en cada caso se determine."
    },
    {
        id: 2,
        title: "Código Civil y Comercial - Obligaciones",
        content: "Artículo 724.- Obligación. La obligación es una relación jurídica en virtud de la cual el acreedor tiene el derecho a exigir del deudor una prestación destinada a satisfacer un interés lícito y, ante el incumplimiento, a obtener forzadamente la satisfacción de dicho interés."
    }
];

// Lógica de evaluación del simulador
const normalizeWord = (word) => word.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const removePunctuation = (word) => word.replace(/[.,;!?()\-]/g, '');

const evaluateTyping = (originalText, typedText) => {
    const origWords = originalText.trim().split(/\s+/).filter(w => w.length > 0);
    const typedWords = typedText.trim().split(/\s+/).filter(w => w.length > 0);
    let correct = 0, minorErrors = 0, majorErrors = 0, omitted = 0;
    const evaluatedOrig = [], evaluatedTyped = [];
    let oIdx = 0, tIdx = 0;

    while (oIdx < origWords.length || tIdx < typedWords.length) {
        const oWord = origWords[oIdx];
        const tWord = typedWords[tIdx];

        if (!tWord && oWord) {
            omitted++; evaluatedOrig.push({ text: oWord, status: 'omitted' }); oIdx++;
        } else if (!oWord && tWord) {
            majorErrors++; evaluatedTyped.push({ text: tWord, status: 'extra' }); tIdx++;
        } else {
            if (oWord === tWord) {
                correct++; evaluatedOrig.push({ text: oWord, status: 'correct' }); evaluatedTyped.push({ text: tWord, status: 'correct' }); oIdx++; tIdx++;
            } else {
                const cleanO = removePunctuation(oWord);
                const cleanT = removePunctuation(tWord);
                const normO = normalizeWord(oWord);
                const normT = normalizeWord(tWord);

                if (oWord.toLowerCase() === tWord.toLowerCase() || normO === normT || (cleanO === cleanT && cleanO.length > 0)) {
                    minorErrors++; evaluatedOrig.push({ text: oWord, status: 'minor' }); evaluatedTyped.push({ text: tWord, status: 'minor' }); oIdx++; tIdx++;
                } else {
                    if (oIdx + 1 < origWords.length && origWords[oIdx + 1] === tWord) {
                        omitted++; evaluatedOrig.push({ text: oWord, status: 'omitted' }); oIdx++;
                    } else if (tIdx + 1 < typedWords.length && typedWords[tIdx + 1] === oWord) {
                        majorErrors++; evaluatedTyped.push({ text: tWord, status: 'extra' }); tIdx++;
                    } else {
                        majorErrors++; evaluatedOrig.push({ text: oWord, status: 'major' }); evaluatedTyped.push({ text: tWord, status: 'major' }); oIdx++; tIdx++;
                    }
                }
            }
        }
    }
    const accountedWords = correct + (minorErrors * 0.5);
    return { totalWords: origWords.length, enteredWords: typedWords.length, correct, minorErrors, majorErrors, omitted, accountedWords, evaluatedOrig, evaluatedTyped };
};

// ==========================================
// 2. DATOS DE ENTRENAMIENTO (TypingClub style)
// ==========================================
const TRAINING_LESSONS = [
    { id: 1, title: 'Básico: F y J', text: 'f j f j ff jj fj jf fff jjj f j f j ff jj fj jf fff jjj f j' },
    { id: 2, title: 'Agregando: D y K', text: 'd k d k dd kk dk kd ddd kkk f d j k fd jk dk fd kj jk fd dk' },
    { id: 3, title: 'Agregando: S y L', text: 's l s l ss ll sl ls sss lll d s k l ds kl sl ls ds lk sk dl' },
    { id: 4, title: 'Agregando: A y Ñ', text: 'a ñ a ñ aa ññ añ ña aaa ñññ s a l ñ sa lñ as ña as ñs la ña' },
    { id: 5, title: 'Fila Guía Completa', text: 'a s d f j k l ñ asdf jklñ as df jk lñ f d s a j k l ñ asdf' },
    { id: 6, title: 'Centro: G y H', text: 'f g f g j h j h fg jh g f h j g h g h fgh jhk g h g h' },
    { id: 7, title: 'Combinando G y H', text: 'a s d f g ñ l k j h asdfg ñlkjh g f d s a h j k l ñ gh gh' },
    { id: 8, title: 'Palabras fila guía', text: 'la sal las alas salsa falsa faja gafa hala jala asada' },
];

const KEYBOARD_ROWS = [
    ['q','w','e','r','t','y','u','i','o','p'],
    ['a','s','d','f','g','h','j','k','l','ñ'],
    ['z','x','c','v','b','n','m',',','.','-']
];

const getFingerForKey = (char) => {
    if (!char) return null;
    const c = char.toLowerCase();
    const map = {
        'q': 'L-Pinky', 'a': 'L-Pinky', 'z': 'L-Pinky', '1': 'L-Pinky',
        'w': 'L-Ring', 's': 'L-Ring', 'x': 'L-Ring', '2': 'L-Ring',
        'e': 'L-Middle', 'd': 'L-Middle', 'c': 'L-Middle', '3': 'L-Middle',
        'r': 'L-Index', 'f': 'L-Index', 't': 'L-Index', 'g': 'L-Index', 'v': 'L-Index', 'b': 'L-Index',
        'y': 'R-Index', 'h': 'R-Index', 'u': 'R-Index', 'j': 'R-Index', 'n': 'R-Index', 'm': 'R-Index',
        'i': 'R-Middle', 'k': 'R-Middle', ',': 'R-Middle', '8': 'R-Middle',
        'o': 'R-Ring', 'l': 'R-Ring', '.': 'R-Ring', '9': 'R-Ring',
        'p': 'R-Pinky', 'ñ': 'R-Pinky', '-': 'R-Pinky', '0': 'R-Pinky',
        ' ': 'Thumb'
    };
    return map[c] || null;
};

// ==========================================
// 3. COMPONENTES COMPARTIDOS
// ==========================================
const Header = ({ activeTab, setActiveTab }) => (
    <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
                <div className="flex items-center space-x-3">
                    <div className="bg-[#002B5C] text-white p-2 rounded flex flex-col items-center leading-none">
                        <span className="font-bold text-lg">SI</span>
                        <span className="font-bold text-lg">PJ</span>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Plataforma de Ingreso</div>
                        <div className="text-xl font-black text-[#002B5C] leading-none">PODER JUDICIAL</div>
                    </div>
                </div>
                <nav className="hidden md:flex space-x-8">
                    <button 
                        onClick={() => setActiveTab('simulador')}
                        className={`font-semibold px-1 py-5 border-b-2 transition-colors ${activeTab === 'simulador' ? 'text-[#002B5C] border-[#002B5C]' : 'text-gray-400 border-transparent hover:text-[#002B5C]'}`}>
                        Simulador Judicial
                    </button>
                    <button 
                        onClick={() => setActiveTab('entrenamiento')}
                        className={`font-semibold px-1 py-5 border-b-2 transition-colors flex items-center ${activeTab === 'entrenamiento' ? 'text-blue-600 border-blue-600' : 'text-gray-400 border-transparent hover:text-blue-600'}`}>
                        <Star className="w-4 h-4 mr-1" fill="currentColor"/> Entrenamiento de Dedos
                    </button>
                </nav>
            </div>
        </div>
        <div className="bg-[#001f40] text-white text-center py-2 text-sm font-medium tracking-wide">
            {activeTab === 'simulador' ? 'Simulador de Examen de Dactilografía' : 'Entrenamiento Interactivo de Dedos (Estilo TypingClub)'}
        </div>
    </header>
);

const UserBar = () => (
    <div className="bg-[#e6f0fa] border border-[#b3d4f5] rounded-md p-3 flex flex-wrap justify-between items-center text-sm text-[#002B5C] mb-6 shadow-sm">
        <div className="flex items-center space-x-6">
            <span className="flex items-center"><User className="w-4 h-4 mr-2"/> POSTULANTE_001</span>
            <span className="flex items-center font-bold text-blue-600"><CheckCircle className="w-4 h-4 mr-1"/> Acceso de Práctica Ilimitado</span>
            <span className="flex items-center"><Clock className="w-4 h-4 mr-1"/> {new Date().toLocaleDateString('es-AR')}</span>
        </div>
    </div>
);

// ==========================================
// 4. MÓDULO: SIMULADOR (EXAMEN OFICIAL)
// ==========================================
const Simulador = () => {
    const [phase, setPhase] = useState('config');
    const [selectedTextId, setSelectedTextId] = useState(1);
    const [timeLimitMinutes, setTimeLimitMinutes] = useState(5);
    const [requiredWords, setRequiredWords] = useState(140);
    const [typedText, setTypedText] = useState('');
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const [results, setResults] = useState(null);
    const textareaRef = useRef(null);

    const selectedTextObject = LEGAL_TEXTS.find(t => t.id === selectedTextId);

    useEffect(() => {
        let interval = null;
        if (isActive && timeRemaining > 0) {
            interval = setInterval(() => setTimeRemaining(t => t - 1), 1000);
        } else if (isActive && timeRemaining === 0) {
            handleFinish();
        }
        return () => clearInterval(interval);
    }, [isActive, timeRemaining]);

    const handleStart = () => {
        setTypedText(''); setTimeRemaining(timeLimitMinutes * 60); setIsActive(true); setPhase('typing');
        setTimeout(() => textareaRef.current?.focus(), 100);
    };

    const handleFinish = () => {
        setIsActive(false);
        const evalResult = evaluateTyping(selectedTextObject.content, typedText);
        const timeSpentMinutes = (timeLimitMinutes * 60 - timeRemaining) / 60;
        const safeTime = timeSpentMinutes > 0 ? timeSpentMinutes : (1/60); 
        const wpm = (evalResult.accountedWords / safeTime).toFixed(1);
        const errorsPerMinute = ((evalResult.majorErrors + evalResult.minorErrors) / safeTime).toFixed(1);

        setResults({ ...evalResult, wpm, errorsPerMinute, timeSpentMinutes, passed: evalResult.accountedWords >= requiredWords });
        setPhase('results');
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    return (
        <div className="w-full">
            {phase === 'config' && (
                <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
                    <h2 className="text-2xl font-bold text-[#002B5C] mb-6 flex items-center">
                        <Settings className="w-6 h-6 mr-2" /> Configuración Examen Oficial
                    </h2>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Texto a copiar:</label>
                            <select className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-[#002B5C]" value={selectedTextId} onChange={(e) => setSelectedTextId(Number(e.target.value))}>
                                {LEGAL_TEXTS.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Minutos:</label>
                                <input type="number" min="1" max="15" className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-[#002B5C]" value={timeLimitMinutes} onChange={(e) => setTimeLimitMinutes(Number(e.target.value))} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Palabras mínimas:</label>
                                <input type="number" min="10" max="1000" className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-[#002B5C]" value={requiredWords} onChange={(e) => setRequiredWords(Number(e.target.value))} />
                            </div>
                        </div>
                        <button onClick={handleStart} className="w-full bg-[#002B5C] hover:bg-blue-900 text-white font-bold py-4 px-6 rounded-lg text-lg flex justify-center items-center transition-colors shadow">
                            <Play className="w-5 h-5 mr-2" /> Iniciar Simulador
                        </button>
                    </div>
                </div>
            )}

            {phase === 'typing' && (
                 <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex justify-between items-center mb-4 bg-gray-50 p-4 rounded border">
                        <h3 className="font-bold text-[#002B5C] flex items-center"><BookOpen className="w-5 h-5 mr-2"/> {selectedTextObject.title}</h3>
                        <div className="text-2xl font-mono font-bold bg-[#002B5C] text-white px-4 py-2 rounded">{formatTime(timeRemaining)}</div>
                    </div>
                    <div className="mb-6 p-4 bg-[#f8fafc] border rounded text-justify font-serif text-gray-800 select-none">
                        {selectedTextObject.content}
                    </div>
                    <textarea
                        ref={textareaRef}
                        className="w-full h-48 p-4 border-2 border-[#002B5C] rounded-lg focus:ring-4 focus:ring-blue-100 font-serif text-gray-800"
                        placeholder="Escriba aquí..."
                        value={typedText}
                        onChange={(e) => setTypedText(e.target.value)}
                        onPaste={(e) => e.preventDefault()}
                        spellCheck="false"
                    />
                    <div className="mt-4 flex justify-end">
                        <button onClick={handleFinish} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-bold flex items-center transition-colors">
                            <CheckCircle className="w-4 h-4 mr-2" /> Terminar Intento
                        </button>
                    </div>
                </div>
            )}

            {phase === 'results' && results && (
                <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 max-w-2xl mx-auto">
                    <div className="text-center mb-6">
                        <h2 className={`text-4xl font-black tracking-wide ${results.passed ? 'text-green-600' : 'text-red-600'}`}>
                            {results.passed ? 'APROBADO' : 'NO ALCANZADO'}
                        </h2>
                        <p className="text-gray-500 mt-1">Resultado de la evaluación judicial de dactilografía</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-8">
                        <div className="bg-slate-50 p-4 rounded-lg border">
                            <span className="text-xs text-gray-500 uppercase block font-semibold">Palabras Computadas</span>
                            <span className="text-2xl font-bold text-slate-800">{results.accountedWords}</span>
                            <span className="text-[10px] text-gray-400 block">Min. req: {requiredWords}</span>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg border">
                            <span className="text-xs text-gray-500 uppercase block font-semibold">Velocidad</span>
                            <span className="text-2xl font-bold text-slate-800">{results.wpm} PPM</span>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg border">
                            <span className="text-xs text-gray-500 uppercase block font-semibold">Errores Graves</span>
                            <span className="text-2xl font-bold text-red-600">{results.majorErrors}</span>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg border">
                            <span className="text-xs text-gray-500 uppercase block font-semibold">Errores Leves</span>
                            <span className="text-2xl font-bold text-amber-500">{results.minorErrors}</span>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg border text-sm text-slate-700 space-y-2 mb-8">
                        <div className="flex justify-between border-b pb-2">
                            <span>Palabras en el texto original:</span>
                            <span className="font-bold">{results.totalWords}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span>Palabras ingresadas:</span>
                            <span className="font-bold">{results.enteredWords}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span>Palabras correctas:</span>
                            <span className="font-bold text-green-600">{results.correct}</span>
                        </div>
                        <div className="flex justify-between pb-1">
                            <span>Palabras omitidas / extras:</span>
                            <span className="font-bold text-red-500">{results.omitted}</span>
                        </div>
                    </div>

                    <div className="flex justify-center space-x-4">
                        <button onClick={() => setPhase('config')} className="px-6 py-3 bg-[#002B5C] hover:bg-blue-900 text-white rounded-lg font-bold transition-colors shadow">
                            Volver al menú
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// ==========================================
// 5. MÓDULO: ENTRENAMIENTO
// ==========================================

const KeyboardLayout = ({ expectedChar }) => {
    return (
        <div className="bg-gray-200 p-4 rounded-xl shadow-inner mt-6 max-w-3xl mx-auto border border-gray-300">
            {KEYBOARD_ROWS.map((row, rIdx) => (
                <div key={rIdx} className={`flex justify-center mb-1.5 space-x-1 ${rIdx === 1 ? 'ml-6' : rIdx === 2 ? 'ml-12' : ''}`}>
                    {row.map(key => {
                        const isExpected = expectedChar && key.toLowerCase() === expectedChar.toLowerCase();
                        let baseColor = 'bg-white text-gray-700';
                        const finger = getFingerForKey(key);
                        if (finger?.includes('Pinky')) baseColor = 'bg-blue-50 text-blue-800 border-blue-200';
                        if (finger?.includes('Ring')) baseColor = 'bg-green-50 text-green-800 border-green-200';
                        if (finger?.includes('Middle')) baseColor = 'bg-yellow-50 text-yellow-800 border-yellow-200';
                        if (finger?.includes('Index')) baseColor = 'bg-purple-50 text-purple-800 border-purple-200';

                        return (
                            <div key={key} className={`
                                relative w-11 h-11 flex items-center justify-center rounded-lg font-bold text-base uppercase
                                border-b-4 transition-colors duration-100 select-none
                                ${isExpected ? 'bg-blue-600 text-white border-blue-800 z-10 shadow-lg' : `${baseColor} border-gray-300`}
                            `}>
                                {key}
                                {(key === 'f' || key === 'j') && <div className="absolute bottom-1 w-3 h-0.5 bg-gray-400 rounded-full opacity-60"></div>}
                            </div>
                        );
                    })}
                </div>
            ))}
            {/* Barra espaciadora */}
            <div className="flex justify-center mt-2">
                <div className={`
                    w-64 h-11 rounded-lg border-b-4 flex items-center justify-center transition-colors duration-100
                    ${expectedChar === ' ' ? 'bg-blue-600 border-blue-800 shadow-lg' : 'bg-gray-100 border-gray-300'}
                `}></div>
            </div>
        </div>
    );
};

const HandsGuide = ({ expectedChar }) => {
    const targetFinger = getFingerForKey(expectedChar);
    
    const renderHand = (isLeft) => {
        const pfx = isLeft ? 'L-' : 'R-';
        const colors = {
            Pinky: targetFinger === `${pfx}Pinky` ? 'bg-blue-500 h-16' : 'bg-gray-300 h-12',
            Ring: targetFinger === `${pfx}Ring` ? 'bg-green-500 h-18' : 'bg-gray-300 h-14',
            Middle: targetFinger === `${pfx}Middle` ? 'bg-yellow-500 h-20' : 'bg-gray-300 h-16',
            Index: targetFinger === `${pfx}Index` ? 'bg-purple-500 h-18' : 'bg-gray-300 h-14',
            Thumb: targetFinger === 'Thumb' && isLeft ? 'bg-blue-500 h-12 rotate-45 mt-8' : (targetFinger === 'Thumb' && !isLeft ? 'bg-blue-500 h-12 -rotate-45 mt-8' : 'bg-gray-300 h-10 mt-8 ' + (isLeft?'rotate-45':'-rotate-45')),
        };

        return (
            <div className={`flex items-end space-x-1 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}>
                <div className={`w-5 rounded-t-full transition-all duration-300 ${colors.Pinky}`}></div>
                <div className={`w-5 rounded-t-full transition-all duration-300 ${colors.Ring}`}></div>
                <div className={`w-5 rounded-t-full transition-all duration-300 ${colors.Middle}`}></div>
                <div className={`w-5 rounded-t-full transition-all duration-300 ${colors.Index}`}></div>
                <div className={`w-5 rounded-t-full transition-all duration-300 origin-bottom ${colors.Thumb}`}></div>
            </div>
        );
    };

    return (
        <div className="flex justify-center space-x-32 mt-6 opacity-90">
            {renderHand(true)}
            {renderHand(false)}
        </div>
    );
};

// ==========================================
// COMPONENTE: GRÁFICOS DE EVOLUCIÓN
// ==========================================
const EvolutionCharts = ({ history, currentLessonId }) => {
    const lessonAttempts = useMemo(() => {
        return history.filter(item => item.lessonId === currentLessonId).slice(-5);
    }, [history, currentLessonId]);

    if (lessonAttempts.length === 0) {
        return (
            <div className="bg-white p-6 rounded-xl border border-gray-200 text-center text-gray-500 text-sm mt-8">
                Realiza más intentos de esta lección para registrar la gráfica de evolución.
            </div>
        );
    }

    const maxWpm = Math.max(...lessonAttempts.map(a => a.wpm), 30);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 w-full">
            {/* Gráfico de Velocidad */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                <h4 className="text-center text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Velocidad PPM</h4>
                <div className="h-32 flex items-end justify-around border-b border-gray-200 relative mt-4">
                    <div className="absolute left-0 right-0 border-t border-dashed border-gray-100 top-0 pointer-events-none"></div>
                    <div className="absolute left-0 right-0 border-t border-dashed border-gray-100 top-1/2 pointer-events-none"></div>
                    
                    {lessonAttempts.map((attempt, idx) => {
                        const pctHeight = Math.max(5, (attempt.wpm / maxWpm) * 100);
                        return (
                            <div key={attempt.id || idx} className="h-full w-8 flex flex-col justify-end items-center group relative z-10">
                                <span className="absolute -top-8 bg-gray-800 text-white text-[11px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md pointer-events-none">
                                    {Math.round(attempt.wpm)} PPM
                                </span>
                                <div 
                                    style={{ height: `${pctHeight}%` }} 
                                    className="w-full bg-[#3e5c76] rounded-t hover:bg-blue-600 transition-all duration-500 shadow-sm"
                                ></div>
                            </div>
                        );
                    })}
                </div>
                <div className="flex justify-around mt-2">
                    {lessonAttempts.map((att, idx) => (
                        <span key={idx} className="w-8 text-center text-[10px] text-gray-400 whitespace-nowrap overflow-visible">
                            {att.timeOnly}
                        </span>
                    ))}
                </div>
            </div>

            {/* Gráfico de Precisión */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                <h4 className="text-center text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Precisión %</h4>
                <div className="h-32 flex items-end justify-around border-b border-gray-200 relative mt-4">
                    <div className="absolute left-0 right-0 border-t border-dashed border-gray-100 top-0 pointer-events-none"></div>
                    <div className="absolute left-0 right-0 border-t border-dashed border-gray-100 top-1/2 pointer-events-none"></div>
                    
                    {lessonAttempts.map((attempt, idx) => {
                        const pctHeight = attempt.precision; 
                        return (
                            <div key={attempt.id || idx} className="h-full w-8 flex flex-col justify-end items-center group relative z-10">
                                <span className="absolute -top-8 bg-gray-800 text-white text-[11px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md pointer-events-none">
                                    {Math.round(attempt.precision)}%
                                </span>
                                <div className="absolute w-full h-full flex flex-col justify-end items-center pointer-events-none">
                                    <div style={{ bottom: `${pctHeight}%` }} className="absolute w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow transform translate-y-1/2"></div>
                                    <div style={{ height: `${pctHeight}%` }} className="w-0.5 bg-blue-100"></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="flex justify-around mt-2">
                    {lessonAttempts.map((att, idx) => (
                        <span key={idx} className="w-8 text-center text-[10px] text-gray-400 whitespace-nowrap overflow-visible">
                            {att.timeOnly}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ==========================================
// COMPONENTE: PANTALLA DE RESULTADOS DETALLADOS
// ==========================================
const TrainingResultsUI = ({ metrics, onRetry, onNext, onBack, lessonAttempts, onPlayReplay }) => {
    const bgDark = '#3e5c76'; 
    const circleYellow = '#f4b41a';

    const formatDur = (secs) => {
        if (!secs) return "0:00";
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    if (!metrics) {
        return (
            <div className="w-full bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-white px-6 py-4 border-b flex justify-between items-center">
                    <button onClick={onBack} className="text-gray-600 hover:text-[#002B5C] font-semibold flex items-center transition-colors text-sm">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Volver a las lecciones
                    </button>
                    <span className="text-sm font-bold text-gray-500 uppercase">Sin Intentos</span>
                </div>
                <div className="p-12 text-center flex flex-col items-center">
                    <div className="bg-blue-50 text-blue-600 p-4 rounded-full mb-4">
                        <Award className="w-12 h-12 opacity-40" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Aún no has practicado esta lección</h3>
                    <p className="text-gray-500 max-w-md mb-6 text-sm">Completa el ejercicio por primera vez para ver tus estadísticas detalladas, precisión de dedos y gráficos de evolución.</p>
                    <button onClick={onRetry} className="bg-blue-600 text-white px-8 py-3 rounded-full font-bold shadow hover:bg-blue-700 transition flex items-center">
                        <Play className="w-4 h-4 mr-2" /> INICIAR ENTRENAMIENTO
                    </button>
                </div>
            </div>
        );
    }

    const accuracy = metrics.precision;
    let stars = 0;
    if (accuracy >= 98) stars = 5;
    else if (accuracy >= 95) stars = 4;
    else if (accuracy >= 90) stars = 3;
    else if (accuracy >= 80) stars = 2;
    else if (accuracy > 0) stars = 1;

    // Generar marcas de medidores (ticks) dinámicamente
    const precisionTicks = [];
    for (let i = 0; i < 40; i++) {
        const angle = (i * 360) / 40;
        const radians = (angle * Math.PI) / 180;
        const x1 = 70 + 50 * Math.cos(radians);
        const y1 = 70 + 50 * Math.sin(radians);
        const x2 = 70 + 44 * Math.cos(radians);
        const y2 = 70 + 44 * Math.sin(radians);
        precisionTicks.push(<line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.25)" strokeWidth="1" />);
    }

    const speedTicks = [];
    for (let i = 0; i < 40; i++) {
        const angle = (i * 360) / 40;
        const radians = (angle * Math.PI) / 180;
        const x1 = 70 + 50 * Math.cos(radians);
        const y1 = 70 + 50 * Math.sin(radians);
        const x2 = 70 + 44 * Math.cos(radians);
        const y2 = 70 + 44 * Math.sin(radians);
        speedTicks.push(<line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.25)" strokeWidth="1" />);
    }

    const durationTicks = [];
    for (let i = 0; i < 12; i++) {
        const angle = (i * 360) / 12;
        const radians = (angle * Math.PI) / 180;
        const x1 = 70 + 50 * Math.cos(radians);
        const y1 = 70 + 50 * Math.sin(radians);
        const x2 = 70 + 40 * Math.cos(radians);
        const y2 = 70 + 40 * Math.sin(radians);
        durationTicks.push(<line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.35)" strokeWidth="2.5" />);
    }

    return (
        <div className="w-full bg-[#f3f4f6] rounded-xl overflow-hidden shadow-xl border border-gray-200">
            {/* Barra superior con botón de volver */}
            <div className="bg-white px-6 py-4 border-b flex justify-between items-center">
                <button onClick={onBack} className="text-gray-600 hover:text-[#002B5C] font-semibold flex items-center transition-colors text-sm">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Volver a las lecciones
                </button>
                <span className="text-sm font-bold text-gray-500 uppercase">Estadísticas de Lección</span>
            </div>

            <div style={{ backgroundColor: bgDark }} className="py-10 px-6 flex flex-col items-center text-white relative">
                
                {/* Estrellas */}
                <div className="flex space-x-2 mb-8">
                    {[1,2,3,4,5].map(i => (
                        <Star key={i} className={`w-10 h-10 ${i <= stars ? 'text-yellow-400 fill-yellow-400 filter drop-shadow-[0_2px_6px_rgba(234,179,8,0.4)]' : 'text-slate-500 opacity-30'} transform ${i===3?'-translate-y-4':(i===2||i===4)?'-translate-y-2':''}`} />
                    ))}
                </div>

                {/* Recuadro de Estadísticas Detalladas */}
                <div className="bg-black/25 backdrop-blur-sm border border-white/10 rounded-xl py-3 px-8 mb-8 flex justify-center space-x-8 text-center text-sm w-full max-w-lg">
                    <div>
                        <span className="block text-gray-300 text-xs uppercase tracking-wider">Letras Escritas</span>
                        <strong className="text-xl font-bold text-white">{metrics.correctChars + metrics.errorChars}</strong>
                    </div>
                    <div className="w-px bg-white/10 my-1"></div>
                    <div>
                        <span className="block text-gray-300 text-xs uppercase tracking-wider">Letras Acertadas</span>
                        <strong className="text-xl font-bold text-green-400">{metrics.correctChars}</strong>
                    </div>
                    <div className="w-px bg-white/10 my-1"></div>
                    <div>
                        <span className="block text-gray-300 text-xs uppercase tracking-wider">Letras Erradas</span>
                        <strong className="text-xl font-bold text-red-400">{metrics.errorChars}</strong>
                    </div>
                </div>

                {/* Medidores */}
                <div className="flex flex-col md:flex-row justify-center items-center space-y-8 md:space-y-0 md:space-x-8 lg:space-x-12 w-full max-w-4xl px-4 mt-6">
                    {/* Medidor de Precisión */}
                    <div className="flex items-center">
                        <div className="hidden lg:flex flex-col items-end text-right mr-4 text-white/80 max-w-[120px]">
                            <span className="text-sm font-bold text-yellow-400">80%</span>
                            <span className="text-[10px] leading-tight uppercase font-medium">precisión mínima</span>
                            <div className="w-10 h-px bg-white/30 mt-1"></div>
                        </div>

                        <div className="relative w-36 h-36 flex flex-col items-center justify-center">
                            <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 140 140">
                                <circle cx="70" cy="70" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                                <circle cx="70" cy="70" r="50" fill="none" stroke={circleYellow} strokeWidth="6" 
                                        strokeDasharray="314.16" strokeDashoffset={314.16 - (314.16 * Math.min(100, Math.max(0, metrics.precision))) / 100}
                                        strokeLinecap="round" />
                                {precisionTicks}
                            </svg>
                            <div className="z-10 text-center">
                                <div className="text-3xl font-black">{Math.round(metrics.precision)}%</div>
                                <div className="text-[9px] uppercase tracking-widest mt-0.5 text-white/70">precisión real</div>
                                <div className="text-[10px] font-semibold text-yellow-400/90">{Math.round(metrics.precision)}%</div>
                            </div>
                            <div className="absolute -bottom-8 font-bold uppercase tracking-widest text-[11px] text-gray-300">precisión</div>
                        </div>
                    </div>

                    {/* Medidor de Duración */}
                    <div className="relative w-32 h-32 flex flex-col items-center justify-center">
                        <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 140 140">
                            {durationTicks}
                        </svg>
                        <div className="z-10 text-center">
                            <div className="text-2xl font-bold">{formatDur(metrics.duration)}</div>
                            <div className="text-[8px] uppercase tracking-widest text-white/60">min:segundos</div>
                        </div>
                        <div className="absolute -bottom-10 font-bold uppercase tracking-widest text-[11px] text-gray-300">duración</div>
                    </div>

                    {/* Medidor de Velocidad */}
                    <div className="flex items-center">
                        <div className="relative w-36 h-36 flex flex-col items-center justify-center">
                            <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 140 140">
                                <circle cx="70" cy="70" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                                <circle cx="70" cy="70" r="50" fill="none" stroke={circleYellow} strokeWidth="6" 
                                        strokeDasharray="314.16" strokeDashoffset={314.16 - (314.16 * Math.min(100, (metrics.wpm / 60) * 100)) / 100}
                                        strokeLinecap="round" />
                                {speedTicks}
                            </svg>
                            <div className="z-10 text-center">
                                <div className="text-3xl font-black">{Math.round(metrics.wpm)}</div>
                                <div className="text-[9px] uppercase tracking-widest mt-0.5 text-white/70">ppm</div>
                            </div>
                            <div className="absolute -bottom-8 font-bold uppercase tracking-widest text-[11px] text-gray-300">velocidad</div>
                        </div>

                        <div className="hidden lg:flex flex-col items-start text-left ml-4 text-white/80 max-w-[120px]">
                            <span className="text-sm font-bold text-yellow-400">10 ppm</span>
                            <span className="text-[10px] leading-tight uppercase font-medium">Requisito: 3 ppm</span>
                            <div className="w-10 h-px bg-white/30 mt-1"></div>
                        </div>
                    </div>
                </div>

                {/* Puntuación */}
                <div className="mt-14 text-center">
                    <div className="text-5xl font-black tracking-tight">
                        {Math.round((metrics.wpm * (metrics.precision / 100) * 100))}
                    </div>
                    <div className="h-0.5 w-48 bg-white/20 mx-auto my-1.5"></div>
                    <div className="text-xs font-bold tracking-widest uppercase text-yellow-400">PUNTUACIÓN OBTENIDA</div>
                </div>
            </div>

            {/* Sección Inferior Clara */}
            <div className="bg-gray-50 p-8">
                <div className="text-center text-gray-400 font-bold tracking-widest text-xs mb-6 uppercase">
                    Reproducción de la práctica actual
                </div>
                
                <div className="bg-white rounded-xl p-6 shadow-inner border border-gray-200 mb-8 font-mono text-2xl leading-loose text-center whitespace-pre-wrap break-all">
                     {metrics.text.split('').map((char, idx) => {
                        const hasError = metrics.errorIndices && metrics.errorIndices[idx];
                        const charToShow = char === ' ' ? '␣' : char;
                        const charClass = hasError 
                            ? "bg-red-100 text-red-700 border-b-2 border-red-500 font-semibold" 
                            : "bg-green-50 text-green-700";
                        return (
                            <span key={idx} className={`${charClass} px-0.5 mx-[1px] rounded inline-block`}>
                                {charToShow}
                            </span>
                        );
                     })}
                </div>


                <div className="flex justify-center space-x-4 mb-8">
                    <button onClick={onRetry} className="bg-white text-gray-700 px-8 py-3 rounded-full font-bold shadow-sm hover:shadow transition flex items-center border border-gray-300">
                        <RotateCcw className="w-4 h-4 mr-2" /> REPETIR INTENTO
                    </button>
                    <button onClick={onNext} className="bg-blue-600 text-white px-8 py-3 rounded-full font-bold shadow hover:bg-blue-700 transition flex items-center">
                        SIGUIENTE LECCIÓN <Play className="w-4 h-4 ml-2" />
                    </button>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mt-8">
                    <h4 className="text-gray-600 font-bold tracking-wider text-xs mb-4 uppercase text-center">
                        Tus intentos anteriores en esta lección:
                    </h4>
                    
                    {lessonAttempts.length === 0 ? (
                        <p className="text-center text-gray-400 text-sm py-4">No hay registros previos para esta lección.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead>
                                    <tr className="text-gray-400 font-bold text-left text-xs uppercase tracking-wider">
                                        <th className="pb-3">Cuando</th>
                                        <th className="pb-3 text-center">Estrellas</th>
                                        <th className="pb-3 text-center">Puntuación</th>
                                        <th className="pb-3 text-center">Velocidad</th>
                                        <th className="pb-3 text-center">Precisión</th>
                                        <th className="pb-3 text-center">Duración</th>
                                        <th className="pb-3 text-center">Ver</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {lessonAttempts.map((att, index) => {
                                        return (
                                            <tr key={att.id || index} className="text-gray-700 hover:bg-gray-50/50">
                                                <td className="py-3 font-medium text-gray-500">{att.timestamp}</td>
                                                <td className="py-3 text-center">
                                                    <div className="flex justify-center text-yellow-400">
                                                        {[1,2,3,4,5].map(starNum => (
                                                            <Star key={starNum} className={`w-4 h-4 ${starNum <= att.stars ? 'fill-yellow-400' : 'text-gray-200'}`} />
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="py-3 text-center font-bold text-gray-800">
                                                    {Math.round(att.wpm * (att.precision/100) * 100)}
                                                </td>
                                                <td className="py-3 text-center font-semibold text-gray-900">{Math.round(att.wpm)} ppm</td>
                                                <td className="py-3 text-center font-medium text-green-600">{Math.round(att.precision)}%</td>
                                                <td className="py-3 text-center font-mono text-gray-600">{formatDur(att.duration)}</td>
                                                <td className="py-3 text-center">
                                                    <button onClick={() => onPlayReplay(att)} className="text-blue-500 hover:text-blue-700">
                                                        <Play className="w-4 h-4 mx-auto" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const Entrenamiento = ({ history, onAddHistory }) => {
    const [lessonId, setLessonId] = useState(1);
    const [phase, setPhase] = useState('menu'); // menu, typing, results, replay
    const [soundMuted, setSoundMuted] = useState(false);
    
    // Typing state
    const [typedCount, setTypedCount] = useState(0); 
    const [errors, setErrors] = useState(0);
    const [startTime, setStartTime] = useState(null);
    const [metrics, setMetrics] = useState(null);
    const [replayData, setReplayData] = useState(null);
    const [charsWithErrors, setCharsWithErrors] = useState({});

    const lesson = TRAINING_LESSONS.find(l => l.id === lessonId);
    const containerRef = useRef(null);

    // Auto-focus container al iniciar la lección
    useEffect(() => {
        if (phase === 'typing' && containerRef.current) {
            containerRef.current.focus();
        }
    }, [phase]);

    const handleKeyDown = (e) => {
        if (phase !== 'typing') return;
        
        // Ignorar teclas modificadoras/especiales
        if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta' || e.key === 'CapsLock') return;
        if (e.key === ' ') e.preventDefault(); // Prevenir desplazamiento de pantalla

        const expectedChar = lesson.text[typedCount];

        if (!startTime) setStartTime(Date.now());

        if (e.key === expectedChar) {
            // Reproducir sonido de acierto
            playTypingSound(true, soundMuted);
            
            const newCount = typedCount + 1;
            setTypedCount(newCount);
            
            // ¿Completó todo el texto?
            if (newCount === lesson.text.length) {
                const endTime = Date.now();
                const durationSecs = (endTime - startTime) / 1000;
                const totalChars = lesson.text.length;
                
                const wpm = (totalChars / 5) / (durationSecs / 60);
                const precision = Math.max(0, ((totalChars - errors) / totalChars) * 100);

                let calculatedStars = 1;
                if (precision >= 98) calculatedStars = 5;
                else if (precision >= 95) calculatedStars = 4;
                else if (precision >= 90) calculatedStars = 3;
                else if (precision >= 80) calculatedStars = 2;

                const newResult = {
                    id: crypto.randomUUID(),
                    lessonId: lesson.id,
                    lessonTitle: lesson.title,
                    timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date().toLocaleDateString('es-AR', {day: 'numeric', month: 'short'}),
                    timeOnly: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
                    wpm: Math.round(wpm),
                    precision: Math.round(precision),
                    stars: calculatedStars,
                    duration: durationSecs,
                    correctChars: totalChars,
                    errorChars: errors,
                    text: lesson.text,
                    errorIndices: charsWithErrors
                };

                // Agregar al historial de la sesión
                onAddHistory(newResult);

                setMetrics({
                    wpm, 
                    precision, 
                    duration: durationSecs, 
                    text: lesson.text,
                    correctChars: totalChars,
                    errorChars: errors,
                    errorIndices: charsWithErrors
                });
                setPhase('results');
            }
        } else {
            // Reproducir sonido de error
            playTypingSound(false, soundMuted);
            setErrors(e => e + 1);
            setCharsWithErrors(prev => ({ ...prev, [typedCount]: true }));
            
            // Retroalimentación visual rápida de parpadeo de error
            if (containerRef.current) {
                containerRef.current.classList.add('bg-red-50');
                setTimeout(() => containerRef.current?.classList.remove('bg-red-50'), 120);
            }
        }
    };

    const startLesson = (id) => {
        setLessonId(id);
        setTypedCount(0);
        setErrors(0);
        setStartTime(null);
        setCharsWithErrors({});
        setPhase('typing');
    };

    // Filtrar intentos previos solo de la lección seleccionada
    const currentLessonAttempts = useMemo(() => {
        return history.filter(item => item.lessonId === lessonId);
    }, [history, lessonId]);

    const handlePlayReplay = (attempt) => {
        setReplayData(attempt);
        setPhase('replay');
    };

    return (
        <div className="w-full max-w-5xl mx-auto flex flex-col items-center">
            
            {phase === 'menu' && (
                <div className="w-full bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-6 border-b pb-4">
                        <div className="flex items-center">
                            <div className="bg-blue-100 p-3 rounded-full text-blue-600 mr-4">
                                <Award className="w-8 h-8" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">Curso Guiado de Dedos</h2>
                                <p className="text-gray-500">Mecanografía al tacto. Adquiere memoria muscular presionando la tecla sugerida.</p>
                            </div>
                        </div>
                        {/* Botón Sonido global */}
                        <button 
                            onClick={() => setSoundMuted(!soundMuted)}
                            className={`p-3 rounded-full border transition-all ${!soundMuted ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-gray-100 text-gray-400'}`}
                            title={soundMuted ? "Activar Sonido" : "Silenciar"}
                        >
                            {soundMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </button>
                    </div>
                    
                    <div className="grid gap-4">
                        {TRAINING_LESSONS.map((l, idx) => {
                            const attempts = history.filter(h => h.lessonId === l.id);
                            const bestAttempt = attempts.reduce((max, curr) => curr.wpm > max ? curr.wpm : max, 0);
                            const latestAttempt = attempts.length > 0 ? attempts[attempts.length - 1] : null;

                            const handleCardClick = (e) => {
                                // Evitar que se active si hacen clic en un botón directamente
                                if (e.target.closest('button')) return;
                                setLessonId(l.id);
                                setMetrics(latestAttempt);
                                setPhase('results');
                            };

                            return (
                                <div 
                                    key={l.id}
                                    onClick={handleCardClick}
                                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 border rounded-xl bg-gray-50 hover:bg-blue-50/40 hover:border-blue-200 cursor-pointer transition-all text-left group"
                                >
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center font-bold text-blue-600 shadow mr-4 group-hover:scale-110 transition-transform">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-800 text-base">{l.title}</h3>
                                            <p className="text-xs text-gray-400 font-mono mt-1">{l.text.substring(0, 36)}...</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-6 mt-4 sm:mt-0">
                                        {bestAttempt > 0 && (
                                            <div className="text-right">
                                                <span className="block text-[10px] text-gray-400 uppercase font-bold">Mejor Velocidad</span>
                                                <span className="text-sm font-bold text-gray-700">{bestAttempt} PPM</span>
                                            </div>
                                        )}
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                startLesson(l.id);
                                            }}
                                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm flex items-center shadow transition-all group-hover:scale-105"
                                        >
                                            Entrenar <Play className="w-4 h-4 ml-2" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {phase === 'typing' && (
                <div 
                    ref={containerRef}
                    tabIndex="0"
                    onKeyDown={handleKeyDown}
                    className="w-full focus:outline-none flex flex-col items-center py-6 px-8 transition-colors rounded-xl bg-white shadow-sm border border-gray-200"
                >
                    <div className="flex justify-between w-full mb-6 text-gray-500 font-bold uppercase tracking-wider text-xs border-b pb-4">
                        <span className="text-blue-700">Lección {lesson.id}: {lesson.title}</span>
                        <div className="flex items-center space-x-4">
                            <button 
                                onClick={() => setSoundMuted(!soundMuted)}
                                className="text-gray-400 hover:text-gray-700"
                            >
                                {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                            </button>
                            <button onClick={() => setPhase('menu')} className="hover:text-red-500 font-semibold">Abandonar</button>
                        </div>
                    </div>

                    <div className="w-full p-6 bg-slate-50 rounded-xl border border-gray-150 font-mono text-2xl tracking-wide leading-relaxed text-center mb-6 select-none focus:outline-none shadow-inner whitespace-pre-wrap break-all">
                        {lesson.text.split('').map((char, index) => {
                            let charClass = "text-gray-400";
                            const hasError = charsWithErrors[index];
                            if (index < typedCount) {
                                charClass = hasError ? "text-red-600 bg-red-100 font-semibold border-b border-red-400" : "text-green-600 bg-green-50";
                            } else if (index === typedCount) {
                                charClass = "text-white bg-blue-600 px-1 rounded animate-pulse";
                            }
                            return (
                                <span key={index} className={`${charClass} transition-colors duration-100 px-0.5 mx-[1px] rounded`}>
                                    {char === ' ' ? '␣' : char}
                                </span>
                            );
                        })}
                    </div>

                    <div className="text-sm text-gray-500 mb-2 font-medium">
                        Presiona la tecla resaltada en tu teclado físico:
                    </div>

                    <KeyboardLayout expectedChar={lesson.text[typedCount]} />
                    <HandsGuide expectedChar={lesson.text[typedCount]} />
                </div>
            )}

            {phase === 'results' && (
                <div className="w-full">
                    <TrainingResultsUI 
                        metrics={metrics} 
                        onRetry={() => startLesson(lessonId)} 
                        onNext={() => {
                            const nextId = lessonId + 1;
                            if (TRAINING_LESSONS.find(l => l.id === nextId)) {
                                startLesson(nextId);
                            } else {
                                setPhase('menu');
                            }
                        }} 
                        onBack={() => setPhase('menu')}
                        lessonAttempts={currentLessonAttempts} 
                        onPlayReplay={handlePlayReplay} 
                    />
                    <EvolutionCharts history={history} currentLessonId={lessonId} />
                </div>
            )}

            {phase === 'replay' && replayData && (
                <div className="w-full bg-white p-8 rounded-2xl shadow-sm border border-gray-200 text-center">
                    <div className="flex justify-between items-center mb-6 border-b pb-4">
                        <h3 className="font-bold text-gray-800 text-lg">Reproducción de Intento - Lección {replayData.lessonId}</h3>
                        <button onClick={() => setPhase('results')} className="text-blue-600 hover:text-blue-800 font-semibold flex items-center">
                            <ArrowLeft className="w-4 h-4 mr-1"/> Volver a Resultados
                        </button>
                    </div>
                    <div className="text-sm text-gray-500 mb-4">
                        Mostrando estadísticas registradas el {replayData.timestamp}
                    </div>
                    <div className="bg-slate-50 p-6 rounded-xl border border-gray-100 font-mono text-xl mb-6 shadow-inner whitespace-pre-wrap break-all">
                        {replayData.text.split('').map((char, index) => {
                            const hasError = replayData.errorIndices && replayData.errorIndices[index];
                            const charToShow = char === ' ' ? '␣' : char;
                            const charClass = hasError 
                                ? "bg-red-100 text-red-700 border-b-2 border-red-500 font-semibold" 
                                : "bg-green-50 text-green-700";
                            return (
                                <span key={index} className={`${charClass} px-0.5 mx-[1px] rounded inline-block`}>
                                    {charToShow}
                                </span>
                            );
                        })}
                    </div>
                    <div className="grid grid-cols-3 gap-6 max-w-md mx-auto mb-6">
                        <div className="p-4 bg-blue-50 rounded-xl border">
                            <span className="block text-xs text-gray-500 uppercase font-semibold">Velocidad</span>
                            <strong className="text-xl text-blue-700">{replayData.wpm} PPM</strong>
                        </div>
                        <div className="p-4 bg-green-50 rounded-xl border">
                            <span className="block text-xs text-gray-500 uppercase font-semibold">Precisión</span>
                            <strong className="text-xl text-green-700">{replayData.precision}%</strong>
                        </div>
                        <div className="p-4 bg-purple-50 rounded-xl border">
                            <span className="block text-xs text-gray-500 uppercase font-semibold">Duración</span>
                            <strong className="text-xl text-purple-700">{Math.round(replayData.duration)}s</strong>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ==========================================
// 6. COMPONENTE PRINCIPAL (APP)
// ==========================================
export default function App() {
    const [activeTab, setActiveTab] = useState('simulador');
    const [history, setHistory] = useState(() => {
        try {
            const saved = localStorage.getItem('dactilografia_historial');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('dactilografia_historial', JSON.stringify(history));
        } catch (e) {}
    }, [history]);

    const handleAddHistory = (item) => {
        setHistory(prev => [...prev, item]);
    };

    return (
        <div className="min-h-screen bg-slate-50 text-gray-800 font-sans antialiased">
            <Header activeTab={activeTab} setActiveTab={setActiveTab} />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <UserBar />
                {activeTab === 'simulador' ? (
                    <Simulador />
                ) : (
                    <Entrenamiento history={history} onAddHistory={handleAddHistory} />
                )}
            </main>
        </div>
    );
}
