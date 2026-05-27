import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    Play, RotateCcw, CheckCircle, Clock, User, BookOpen, Settings,
    Star, Volume2, VolumeX, Award, ArrowLeft, History, Eye, Trash,
    Search, Coffee, Keyboard, HelpCircle, Bold, Italic, Underline,
    AlignLeft, AlignCenter, AlignRight, AlignJustify, Highlighter, Save, FileText
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
    },
    {
        id: 3,
        title: "Acuerdo Nº 20/24 (Punto 14º) - Bus Federal de Justicia",
        content: "DECIMO CUARTO: Visto: El Expte. 09-E-1374-2023, donde se propone la actualización del \"Convenio de Comunicación Electrónica Interjurisdiccional\"; su \"Protocolo Técnico\" y la implementación del sistema Bus Federal de Justicia para el envío y recepción de comunicaciones interjurisdiccionales; Y CONSIDERANDO: Que por Acuerdo Nº 17/16, de fecha 23 de junio de 2016, punto 7º, se dispuso la adhesión del Poder Judicial de la Provincia de Corrientes, a la \"Actualización del Convenio de Comunicación Electrónica Interjurisdiccional\" y su \"Protocolo Técnico\", propuesto por la Junta Federal de Cortes y Superiores Tribunales de Justicia de las Provincias Argentinas y Ciudad Autónoma de Buenos Aires (JU.FE.JUS.). Con posterioridad, en fecha 2 de junio de 2023, la JU.FE.JUS. dispuso actualizar el Convenio de Comunicación Electrónica Interjurisdiccional y su Protocolo Técnico, a fin de incorporar una solución tecnológica denominada \"Bus Federal de Justicia\", que, entre otras funciones, permitirá una comunicación y un intercambio ágil y seguro de documental, de forma electrónica, entre todos los organismos integrados a dicha plataforma, sin necesidad de establecer canales individuales, evitando así múltiples desarrollos redundantes; brindar seguridad transaccional; integración sencilla con los sistemas de los organismos usuarios; posibilidad de integrar con los mecanismos de autenticación de cada organismo; certificación mediante función Escribano Digital y registro preciso y seguro de las transacciones integrado implementaciones de Blockchain. Que el Poder Judicial de la Provincia está en condiciones técnicas de unirse e implementar el Bus Federal de Justicia, dado que ya se han realizado las tareas de instalación de los componentes requeridos para su funcionamiento. Por ello y oído el Sr. Fiscal General; SE RESUELVE: 1º) Adherir a la \"Actualización del Convenio de Comunicación Electrónica Interjurisdiccional\" y su \"Protocolo Técnico\" que como Anexo forma parte del presente. 2º) Designar como referentes para la implementación, administración y funcionamiento de la plataforma Bus Federal de Justicia, a las Dras. Mirta Allende y María Andrea Ferreira. 3º) Hacer saber la presente a la Junta Federal de Cortes y Superiores Tribunales de Justicia de las Provincias Argentinas y Ciudad Autónoma de Buenos Aires. 4º) Publicar en la página web del Poder Judicial para su difusión."
    },
    {
        id: 4,
        title: "Acuerdo Nº 27/25 (Punto 13º) - Cédulas y Mandamientos",
        content: "DECIMO TERCERO: Visto: Que por Acuerdo Nº 20/24, punto 14º, el Poder Judicial de Corrientes adhirió a la \"Actualización del Convenio de Comunicación Electrónica Interjurisdiccional\" y su \"Protocolo Técnico\" con el fin de incorporar progresivamente las tecnologías en las comunicaciones jurisdiccionales a través del Bus Federal de Justicia. Considerando: Que el Bus Federal de Justicia permite un intercambio ágil y seguro de documentos de forma electrónica entre los poderes judiciales adheridos. A tal fin, se dispuso que la Mesa Receptora Informatizada de Expedientes de la Primera Circunscripción sería el único órgano en toda la provincia encargado de la recepción y envío de documentos electrónicos a través del Bus Federal de Justicia. Que a fin de optimizar la comunicación interjurisdiccional y brindar mayor eficiencia en la tramitación de cédulas y mandamientos, se hace necesaria la modificación de los circuitos operativos actuales. Esto permitirá una gestión más eficiente y una mejor trazabilidad de las notificaciones, cumpliendo con los objetivos del Convenio de Comunicación Electrónica Interjurisdiccional. Por todo ello y oído el Sr. Fiscal General; SE RESUELVE: 1º) Disponer a partir del 01 de octubre de 2025, la modificación de los circuitos operativos internos de recepción y envíos de Cédulas y Mandamientos Ley Convenio 22.172 a través de la plataforma del Bus Federal de Justicia. 2º) Ordenar el registro de alta para la Dirección General de Mandamientos y Notificaciones como nuevo organismo de la provincia de Corrientes en la plataforma Bus Federal. 3º) Establecer que a partir de la implementación de este nuevo circuito, la Dirección General de Mandamientos y Notificaciones será el único organismo encargado de recibir y enviar cédulas y mandamientos Ley Nº 22172 a través de la plataforma Bus Federal. 4º) Mantener el circuito operativo de la Mesa Receptora Informatizada de Expedientes exclusivamente para la recepción y envío de oficios Ley 22172 a través de la plataforma Bus Federal. 5º) Establecer que los juzgados y tribunales de toda la provincia enviarán y recibirán los oficios, cédulas y mandamientos Ley 22172 a la Mesa Receptora Informatizada y/o a la Dirección General de Mandamientos y Notificaciones -según corresponda- a través de la plataforma Forum."
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
    // Fila guía
    { id: 1, title: 'Introducción', text: 'f j f j ff jj f j f j ff jj', section: 'Fila guía' },
    { id: 2, title: 'Teclas f & j', text: 'f j f j ff jj fj jf fff jjj f j f j ff jj fj jf fff jjj f j', section: 'Fila guía' },
    { id: 3, title: 'Barra de espacio', text: 'f j f j ff jj fj jf fff jjj f j f j ff jj fj jf fff jjj f j', section: 'Fila guía' },
    { id: 4, title: 'Revisión: f & j', text: 'f j j f ff jj fj jf jf fj ff jj fj jf f j j f ff jj fj jf', section: 'Fila guía' },
    { id: 5, title: 'Teclas d & k', text: 'd k d k dd kk dk kd ddd kkk f d j k fd jk dk fd kj jk fd dk', section: 'Fila guía' },
    { id: 6, title: 'Revisión: d & k', text: 'f d j k fd jk dk fd kj jk fd dk d k d k dd kk dk kd ddd kkk', section: 'Fila guía' },
    { id: 7, title: 'Práctica: d & k', text: 'dd kk dd kk dk kd fd jk fd jk dd kk dk kd fd jk fd jk dd kk', section: 'Fila guía' },
    // 8: Juego fjdk - omitido
    { id: 9, title: 'Teclas s & l', text: 's l s l ss ll sl ls sss lll d s k l ds kl sl ls ds lk sk dl', section: 'Fila guía' },
    { id: 10, title: 'Revisión: s & l', text: 'ds kl sl ls ds lk sk dl ss ll sl ls ds kl sl ls ds lk sk dl', section: 'Fila guía' },
    { id: 11, title: 'Práctica: s & l', text: 'sl ls sl ls ds kl ds kl ss ll sl ls sl ls sl ls ds kl ds kl', section: 'Fila guía' },
    { id: 12, title: 'Teclas a & ñ', text: 'a ñ a ñ aa ññ añ ña aaa ñññ s a l ñ sa lñ as ña as ñs la ña', section: 'Fila guía' },
    { id: 13, title: 'Revisión: a & ñ', text: 'sa lñ as ña as ñs la ña aa ññ añ ña sa lñ as ña as ñs la ña', section: 'Fila guía' },
    { id: 14, title: 'Primeras 8 teclas', text: 'a s d f j k l ñ asdf jklñ as df jk lñ f d s a j k l ñ asdf', section: 'Fila guía' },
    // 15: Juego Las primeras 8 - omitido
    { id: 16, title: 'Fila guía: Izquierda', text: 'a s d f g asdfg asdfg asdf asdf a s d f a s d f g asdfg asdfg', section: 'Fila guía' },
    { id: 17, title: 'Fila guía: Derecha', text: 'j k l ñ h jklñh jklñh jklñ jklñ j k l ñ j k l ñ h jklñh jklñh', section: 'Fila guía' },
    { id: 18, title: 'Teclas g & h', text: 'f g f g j h j h fg jh g f h j g h g h fgh jhk g h g h fg jh', section: 'Fila guía' },
    { id: 19, title: 'Revisión: g & h', text: 'f g f g j h j h fg jh g f h j g h g h fgh jhk g h g h fg jh', section: 'Fila guía' },
    { id: 20, title: 'Práctica: g & h', text: 'a s d f g ñ l k j h asdfg ñlkjh g f d s a h j k l ñ gh gh', section: 'Fila guía' },
    { id: 21, title: 'Revisión: Fila guía', text: 'a s d f g h j k l ñ asdfg hjklñ asdfg hjklñ a s d f g h j k l ñ', section: 'Fila guía' },
    // 22: Juego Fila guía - omitido

    // Fila superior
    { id: 23, title: 'Teclas r & u', text: 'r u r u rr uu ru ur rrr uuu fr ju ru ur fr ju ru ur fr ju', section: 'Fila superior' },
    { id: 24, title: 'Revisión: r & u', text: 'fr ju ru ur fr uj ur ju rr uu ru ur fr ju ru ur fr uj ur ju', section: 'Fila superior' },
    { id: 25, title: 'Práctica: r & u', text: 'fur jur dru kur rud urd rudy jury fur jur dru kur rud urd', section: 'Fila superior' },
    { id: 26, title: 'Teclas e & i', text: 'e i e i ee ii ei ie eee iii de ki ei ie de ki ei ie de ki', section: 'Fila superior' },
    { id: 27, title: 'Revisión: e & i', text: 'de ki ei ie de ik ie ki ee ii ei ie de ki ei ie de ik ie ki', section: 'Fila superior' },
    { id: 28, title: 'Práctica: e & i', text: 'diente kiko elfo idea irene elias kilo diente kiko elfo idea', section: 'Fila superior' },
    { id: 29, title: '¡Postura saludable!', text: 'mantener la espalda recta y los pies apoyados en el suelo', section: 'Fila superior' },
    { id: 30, title: 'Revisión Base + ruei', text: 'f j d k s l a ñ r u e i ruei ruei fjdk f j d k s l a ñ r u e i', section: 'Fila superior' },
    { id: 31, title: 'Fila superior: Izquierda', text: 'q w e r t qwert qwert qwert qwert q w e r t q w e r t qwert', section: 'Fila superior' },
    { id: 32, title: 'Fila superior: Derecha', text: 'y u i o p yuiop yuiop yuiop yuiop y u i o p y u i o p yuiop', section: 'Fila superior' },
    // 33: Juego ruei - omitido
    { id: 34, title: 'Teclas w & o', text: 'w o w o ww oo wo ow www ooo sw lo wo ow sw lo wo ow sw lo', section: 'Fila superior' },
    { id: 35, title: 'Revisión: w & o', text: 'sw lo wo ow sw ol ow lo ww oo wo ow sw lo wo ow sw ol ow', section: 'Fila superior' },
    { id: 36, title: 'Práctica: w & o', text: 'show wolf wool solo slow look wood door show wolf wool solo', section: 'Fila superior' },
    // 37: Juego Teclas superior - omitido
    { id: 38, title: 'Teclas q & y', text: 'q y q y qq yy qy yq qqq yyy aq jy qy yq aq jy qy yq aq jy', section: 'Fila superior' },
    { id: 39, title: 'Revisión: q & y', text: 'aq jy qy yq aq yj yq jy qq yy qy yq aq jy qy yq aq yj yq', section: 'Fila superior' },
    { id: 40, title: 'Práctica: q & y', text: 'aquí ayer queso yema quito yate raya aquí ayer queso yema', section: 'Fila superior' },
    { id: 41, title: 'Teclas t & p', text: 't p t p tt pp tp pt ttt ppp ft jp tp pt ft jp tp pt ft jp', section: 'Fila superior' },
    { id: 42, title: 'Revisión: t & p', text: 'ft jp tp pt ft pj pt jp tt pp tp pt ft jp tp pt ft pj pt jp', section: 'Fila superior' },
    { id: 43, title: 'Práctica: t & p', text: 'tapa pato apto tipo paso tela piso tres tapa pato apto tipo', section: 'Fila superior' },
    // 44: Juego Fila superior - omitido
    { id: 45, title: '¡Piensa ideas, no en letras!', text: 'escribir sin mirar el teclado permite pensar en las ideas', section: 'Fila superior' },
    { id: 46, title: 'Revisión Base + Fila superior', text: 'qwert yuiop asdfg hjklñ qwert yuiop asdfg hjklñ qwert yuiop', section: 'Fila superior' },
    { id: 47, title: 'Fila superior: Izquierda', text: 'q w e r t qwert qwert qwert qwert q w e r t q w e r t qwert', section: 'Fila superior' },
    { id: 48, title: 'Fila superior: Derecha', text: 'y u i o p yuiop yuiop yuiop yuiop y u i o p y u i o p yuiop', section: 'Fila superior' },
    // 49-50: Juegos Fila superior - omitidos

    // Fila inferior
    { id: 51, title: 'Teclas v & m', text: 'v m v m vv mm vm mv vvv mmm fv jm vm mv fv jm vm mv fv jm', section: 'Fila inferior' },
    { id: 52, title: 'Revisión: v & m', text: 'fv jm vm mv fv mj mv jm vv mm vm mv fv jm vm mv fv mj mv', section: 'Fila inferior' },
    { id: 53, title: 'Práctica: v & m', text: 'vida mano vaso mesa viga mapa nave meta vida mano vaso mesa', section: 'Fila inferior' },
    { id: 54, title: 'Teclas c & ,', text: 'c , c , cc ,, c, ,c ccc ,,, dc k, c, ,c dc k, c, ,c dc k,', section: 'Fila inferior' },
    { id: 55, title: 'Revisión: c & ,', text: 'dc k, c, ,c dc ,k ,c k, cc ,, c, ,c dc k, c, ,c dc ,k ,c', section: 'Fila inferior' },
    { id: 56, title: 'Práctica: c & ,', text: 'casa, cosa, cama, cuna, cine, capa, cata, casa, cosa, cama', section: 'Fila inferior' },
    // 57: Juego vmc, - omitido
    { id: 58, title: 'Teclas x & .', text: 'x . x . xx .. x. .x xxx ... sx l. x. .x sx l. x. .x sx l.', section: 'Fila inferior' },
    { id: 59, title: 'Revisión: x & .', text: 'sx l. x. .x sx .l .x l. xx .. x. .x sx l. x. .x sx .l .x', section: 'Fila inferior' },
    { id: 60, title: 'Práctica: x & .', text: 'taxi. saxo. xilofón. examen. nexo. texto. taxi. saxo. xilofón', section: 'Fila inferior' },
    { id: 61, title: 'Teclas z & -', text: 'z - z - zz -- z- -z zzz --- az ñ- z- -z az ñ- z- -z az ñ-', section: 'Fila inferior' },
    { id: 62, title: 'Revisión: z & -', text: 'az ñ- z- -z az -ñ -z ñ- zz -- z- -z az ñ- z- -z az -ñ -z', section: 'Fila inferior' },
    { id: 63, title: 'Práctica: z & -', text: 'zona-azul, pozo-profundo, taza-limpia, tiza-blanca, zona-azul', section: 'Fila inferior' },
    // 64: Juego Teclas inferior - omitido
    { id: 65, title: 'Teclas b & n', text: 'b n b n bb nn bn nb bbb nnn fb jn bn nb fb jn bn nb fb jn', section: 'Fila inferior' },
    { id: 66, title: 'Revisión: b & n', text: 'fb jn bn nb fb nj nb jn bb nn bn nb fb jn bn nb fb nj nb', section: 'Fila inferior' },
    { id: 67, title: 'Práctica: b & n', text: 'bueno nota boca nene bola nido beso nube bueno nota boca nene', section: 'Fila inferior' },
    { id: 68, title: 'Toma un descanso', text: 'toma un breve descanso estirando los dedos y las muñecas', section: 'Fila inferior' },
    { id: 69, title: 'Fila inferior: Izquierda', text: 'z x c v b zxcvb zxcvb zxcvb zxcvb z x c v b zxcvb zxcvb', section: 'Fila inferior' },
    { id: 70, title: 'Fila inferior: Derecha', text: 'n m , . - nm,.- nm,.- nm,.- nm,.- n m , . - nm,.- nm,.-', section: 'Fila inferior' },
    { id: 71, title: 'Práctica: Fila inferior', text: 'zxcvb nm,.- zxcvb nm,.- zxcvb nm,.- zxcvb nm,.- zxcvb', section: 'Fila inferior' },
    // 72-73: Juegos Fila inferior - omitidos
    { id: 74, title: 'Práctica: Sangría', text: '  en derecho penal, el acto delictivo requiere dolo o culpa.', section: 'Fila inferior' },

    // Caracteres acentuados
    { id: 75, title: 'Teclas a & á', text: 'a á a á aa áá aá áa aaa ááá sa lá aá áa sa lá aá áa sa', section: 'Caracteres acentuados' },
    { id: 76, title: 'Revisión: a & á', text: 'sa lá aá áa sa ál áa lá aa áá aá áa sa lá aá áa sa ál áa', section: 'Caracteres acentuados' },
    { id: 77, title: 'Práctica: a & á', text: 'árbol más allá cámara rápido página fácil árbol más allá', section: 'Caracteres acentuados' },
    { id: 78, title: 'Teclas e & é', text: 'e é e é ee éé eé ée eee ééé de ké eé ée de ké eé ée de', section: 'Caracteres acentuados' },
    { id: 79, title: 'Revisión: e & é', text: 'de ké eé ée de ék ée ké ee éé eé ée de ké eé ée de ék ée', section: 'Caracteres acentuados' },
    { id: 80, title: 'Práctica: e & é', text: 'café bebé teléfono césped técnica héroe café bebé teléfono', section: 'Caracteres acentuados' },
    // 81: Juego - omitido
    { id: 82, title: 'Teclas i & í', text: 'i í i í ii íí ií íi iii ííí di kí ií íi di kí ií íi di', section: 'Caracteres acentuados' },
    { id: 83, title: 'Revisión: i & í', text: 'di kí ií íi di ík íi kí ii íí ií íi di kí ií íi di ík íi', section: 'Caracteres acentuados' },
    { id: 84, title: 'Práctica: i & í', text: 'país día difícil policía oír río mínimo país día difícil', section: 'Caracteres acentuados' },
    { id: 85, title: 'Teclas o & ó', text: 'o ó o ó oo óó oó óo ooo óóó so ló oó óo so ló oó óo so', section: 'Caracteres acentuados' },
    { id: 86, title: 'Revisión: o & ó', text: 'so ló oó óo so ól óo ló oo óó oó óo so ló oó óo so ól óo', section: 'Caracteres acentuados' },
    { id: 87, title: 'Práctica: o & ó', text: 'canción camión acción corazón compás deudor canción camión', section: 'Caracteres acentuados' },
    // 88: Juego - omitido
    { id: 89, title: 'Teclas ü & ú', text: 'u ú u ú uu úú uú úu üü üü úú úú uü üu u ú u ú uu úú uú', section: 'Caracteres acentuados' },
    { id: 90, title: 'Revisión: ü & ú', text: 'ju lú uú úu ju úl úu lú uu úú uú úu üü ju lú uú úu ju úl', section: 'Caracteres acentuados' },
    { id: 91, title: 'Práctica: ü & ú', text: 'útil único música pingüino cigüeña vergüenza útil único música', section: 'Caracteres acentuados' },
    // 92: Juego - omitido

    // Palabras desafiantes 1
    { id: 123, title: 'a, ha', text: 'a ha a ha ha a ha a ha ha a ha ha a a ha a ver ha visto a comer ha comido', section: 'Palabras desafiantes 1' },
    { id: 124, title: 'asar, azar', text: 'asar azar asar azar azar asar azar asar asar carne azar del destino juego de azar', section: 'Palabras desafiantes 1' },
    { id: 125, title: 'asta, hasta', text: 'asta hasta asta hasta hasta asta hasta asta hasta luego asta de bandera hasta mañana', section: 'Palabras desafiantes 1' },
    { id: 126, title: 'basta, vasta', text: 'basta vasta basta vasta vasta basta vasta basta basta ya vasta llanura vasta experiencia', section: 'Palabras desafiantes 1' },
    { id: 127, title: 'bienes, vienes', text: 'bienes vienes bienes vienes bienes vienes si vienes hoy bienes raíces bienes públicos', section: 'Palabras desafiantes 1' },
    { id: 128, title: 'haya, allá', text: 'haya allá haya allá allá haya allá haya haya que haya paz ve hacia allá allá en el campo', section: 'Palabras desafiantes 1' },
    { id: 129, title: 'casa, caza', text: 'casa caza casa caza caza casa caza casa casa de madera caza de animales ir a casa', section: 'Palabras desafiantes 1' },
    { id: 130, title: 'se, sé', text: 'se sé se sé sé se sé se se sé se sé se cayó solo yo sé la verdad se fue ayer sé muy amable', section: 'Palabras desafiantes 1' }
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
                    <button 
                        onClick={() => setActiveTab('teoria')}
                        className={`font-semibold px-1 py-5 border-b-2 transition-colors flex items-center ${activeTab === 'teoria' ? 'text-blue-600 border-blue-600' : 'text-gray-400 border-transparent hover:text-blue-600'}`}>
                        <Award className="w-4 h-4 mr-1"/> Preparación Teórica
                    </button>
                </nav>
            </div>
        </div>
        <div className="bg-[#001f40] text-white text-center py-2 text-sm font-medium tracking-wide">
            {activeTab === 'simulador' ? 'Simulador de Examen de Dactilografía' : activeTab === 'entrenamiento' ? 'Entrenamiento Interactivo de Dedos (Estilo TypingClub)' : 'Preparación Teórica - Generador de Audio de Estudio'}
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

    const [simHistory, setSimHistory] = useState(() => {
        const saved = localStorage.getItem('dactilografia_simulador_historial');
        return saved ? JSON.parse(saved) : [];
    });

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

        const newResult = {
            id: Date.now(),
            timestamp: new Date().toLocaleString('es-AR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            textId: selectedTextId,
            textTitle: selectedTextObject.title,
            timeLimitMinutes,
            requiredWords,
            wpm,
            errorsPerMinute,
            timeSpentMinutes,
            passed: evalResult.accountedWords >= requiredWords,
            ...evalResult
        };

        const updatedHistory = [newResult, ...simHistory];
        setSimHistory(updatedHistory);
        localStorage.setItem('dactilografia_simulador_historial', JSON.stringify(updatedHistory));
        setResults(newResult);
        setPhase('results');
    };

    const deleteSimAttempt = (id, e) => {
        e.stopPropagation();
        const updated = simHistory.filter(x => x.id !== id);
        setSimHistory(updated);
        localStorage.setItem('dactilografia_simulador_historial', JSON.stringify(updated));
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    return (
        <div className="w-full">
            {phase === 'config' && (
                <div className="space-y-8">
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

                    {/* Historial de Intentos */}
                    <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-[#002B5C] flex items-center">
                                <History className="w-5 h-5 mr-2" /> Historial de Prácticas del Simulador
                            </h3>
                            {simHistory.length > 0 && (
                                <button 
                                    onClick={() => {
                                        if (window.confirm("¿Seguro que deseas borrar todo el historial del simulador?")) {
                                            setSimHistory([]);
                                            localStorage.removeItem('dactilografia_simulador_historial');
                                        }
                                    }}
                                    className="text-xs text-red-500 hover:text-red-700 font-semibold border border-red-200 rounded px-2.5 py-1 hover:bg-red-50 transition-colors"
                                >
                                    Borrar Todo
                                </button>
                            )}
                        </div>

                        {simHistory.length === 0 ? (
                            <p className="text-center text-gray-400 py-6 text-sm">Aún no tienes prácticas registradas en esta sección.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                    <thead>
                                        <tr className="text-gray-400 font-bold text-left text-xs uppercase tracking-wider">
                                            <th className="pb-3">Fecha</th>
                                            <th className="pb-3">Texto Seleccionado</th>
                                            <th className="pb-3 text-center">Velocidad</th>
                                            <th className="pb-3 text-center">Palabras (Escritas / Req.)</th>
                                            <th className="pb-3 text-center">Errores (G/L)</th>
                                            <th className="pb-3 text-center">Resultado</th>
                                            <th className="pb-3 text-center">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {simHistory.map((attempt) => (
                                            <tr key={attempt.id} className="text-gray-700 hover:bg-gray-50/50">
                                                <td className="py-3 font-medium text-gray-500 whitespace-nowrap">{attempt.timestamp}</td>
                                                <td className="py-3 font-semibold text-gray-800 max-w-[200px] truncate" title={attempt.textTitle}>
                                                    {attempt.textTitle}
                                                </td>
                                                <td className="py-3 text-center font-bold text-[#002B5C] whitespace-nowrap">
                                                    {attempt.wpm} PPM
                                                </td>
                                                <td className="py-3 text-center font-medium whitespace-nowrap">
                                                    {attempt.accountedWords} / {attempt.requiredWords}
                                                </td>
                                                <td className="py-3 text-center font-mono text-xs whitespace-nowrap">
                                                    <span className="text-red-600 font-semibold" title="Errores Graves">{attempt.majorErrors}G</span>
                                                    <span className="text-gray-400 mx-1">/</span>
                                                    <span className="text-amber-600 font-semibold" title="Errores Leves">{attempt.minorErrors}L</span>
                                                </td>
                                                <td className="py-3 text-center whitespace-nowrap">
                                                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${attempt.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {attempt.passed ? 'APROBADO' : 'NO ALCANZADO'}
                                                    </span>
                                                </td>
                                                <td className="py-3 text-center whitespace-nowrap">
                                                    <div className="flex justify-center space-x-2">
                                                        <button 
                                                            onClick={() => {
                                                                setResults(attempt);
                                                                setRequiredWords(attempt.requiredWords);
                                                                setPhase('results');
                                                            }}
                                                            className="p-1 text-blue-500 hover:text-blue-700 rounded hover:bg-blue-50 transition"
                                                            title="Ver Detalle"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => deleteSimAttempt(attempt.id, e)}
                                                            className="p-1 text-red-400 hover:text-red-600 rounded hover:bg-red-50 transition"
                                                            title="Eliminar"
                                                        >
                                                            <Trash className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
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
                <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 max-w-2xl mx-auto space-y-6">
                    <div className="text-center">
                        <h2 className={`text-4xl font-black tracking-wide ${results.passed ? 'text-green-600' : 'text-red-600'}`}>
                            {results.passed ? 'APROBADO' : 'NO ALCANZADO'}
                        </h2>
                        <p className="text-gray-500 mt-1">Resultado de la evaluación judicial de dactilografía</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div className="bg-slate-50 p-4 rounded-lg border">
                            <span className="text-xs text-gray-500 uppercase block font-semibold">Palabras Computadas</span>
                            <span className="text-2xl font-bold text-slate-800">{results.accountedWords}</span>
                            <span className="text-[10px] text-gray-400 block">Min. req: {results.requiredWords || requiredWords}</span>
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

                    <div className="bg-slate-50 p-4 rounded-lg border text-sm text-slate-700 space-y-2">
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

                    {/* Comparación de Palabras Tipeadas */}
                    <div className="bg-slate-50 p-6 rounded-xl border border-gray-200 max-h-60 overflow-y-auto">
                        <h4 className="text-gray-600 font-bold tracking-wider text-xs mb-4 uppercase text-center">
                            Revisión del Texto Evaluado (Palabra por Palabra)
                        </h4>
                        <div className="flex flex-wrap gap-2 text-justify font-serif text-lg leading-relaxed select-none">
                            {results.evaluatedOrig && results.evaluatedOrig.map((wordObj, wIdx) => {
                                let wordClass = "";
                                let titleText = "";
                                if (wordObj.status === 'correct') {
                                    wordClass = "text-green-600";
                                    titleText = "Correcta";
                                } else if (wordObj.status === 'minor') {
                                    wordClass = "text-amber-600 bg-amber-50 border-b-2 border-amber-400 font-semibold px-0.5 rounded";
                                    titleText = "Error Leve (Acento o Mayúscula)";
                                } else if (wordObj.status === 'major') {
                                    wordClass = "text-red-600 bg-red-50 border-b-2 border-red-500 font-bold px-0.5 rounded";
                                    titleText = "Error Grave (Falta de ortografía o palabra incorrecta)";
                                } else if (wordObj.status === 'omitted') {
                                    wordClass = "text-gray-400 line-through opacity-60";
                                    titleText = "Palabra Omitida";
                                }
                                return (
                                    <span key={wIdx} className={`${wordClass} cursor-help`} title={titleText}>
                                        {wordObj.text}
                                    </span>
                                );
                            })}
                        </div>
                        <div className="mt-4 pt-3 border-t border-gray-200 flex justify-center space-x-6 text-[11px] font-medium text-gray-500">
                            <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></span> Correcta</span>
                            <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5"></span> Error Leve</span>
                            <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-red-500 mr-1.5"></span> Error Grave</span>
                            <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-gray-400 mr-1.5"></span> Omitida</span>
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
    const allAttempts = useMemo(() => {
        return history.filter(item => item.lessonId === currentLessonId);
    }, [history, currentLessonId]);

    const [startIndex, setStartIndex] = useState(0);
    const [endIndex, setEndIndex] = useState(0);

    // Keep range in sync when allAttempts changes
    useEffect(() => {
        if (allAttempts.length > 0) {
            setStartIndex(Math.max(0, allAttempts.length - 5)); // default to last 5, but let them filter everything
            setEndIndex(allAttempts.length - 1);
        }
    }, [allAttempts.length]);

    if (allAttempts.length === 0) {
        return (
            <div className="bg-white p-6 rounded-xl border border-gray-200 text-center text-gray-500 text-sm mt-8">
                Realiza más intentos de esta lección para registrar la gráfica de evolución.
            </div>
        );
    }

    const filteredAttempts = allAttempts.slice(startIndex, endIndex + 1);

    const maxWpm = Math.max(...filteredAttempts.map(a => a.wpm), 30);

    return (
        <div className="w-full space-y-6 mt-8">
            {/* Filtro de Línea de Tiempo */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm w-full flex flex-col">
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-4 flex items-center">
                    <Clock className="w-4 h-4 mr-2 text-blue-600" /> Línea de Tiempo de Intentos
                </h4>
                
                {/* Visual timeline track */}
                <div className="relative flex items-center justify-between w-full px-6 py-8 bg-slate-50 border border-slate-100 rounded-xl mb-4 select-none">
                    {/* The track line */}
                    <div className="absolute left-6 right-6 h-1.5 bg-slate-200 top-1/2 -translate-y-1/2 rounded-full"></div>
                    
                    {/* Active range line */}
                    <div 
                        className="absolute h-1.5 bg-blue-500 top-1/2 -translate-y-1/2 rounded-full transition-all duration-300"
                        style={{
                            left: `${6 + (startIndex / (allAttempts.length - 1 || 1)) * 88}%`,
                            right: `${6 + ((allAttempts.length - 1 - endIndex) / (allAttempts.length - 1 || 1)) * 88}%`
                        }}
                    ></div>
                    
                    {allAttempts.map((att, idx) => {
                        const isActive = idx >= startIndex && idx <= endIndex;
                        const pct = (idx / (allAttempts.length - 1 || 1)) * 100;
                        
                        return (
                            <div 
                                key={att.id || idx}
                                style={{ left: `calc(6% + ${pct * 0.88}%)` }}
                                className="absolute -translate-x-1/2 top-1/2 -translate-y-1/2 group cursor-pointer z-20"
                                onClick={() => {
                                    if (idx < startIndex) {
                                        setStartIndex(idx);
                                    } else if (idx > endIndex) {
                                        setEndIndex(idx);
                                    } else {
                                        // Clicked inside active range, adjust closest boundary
                                        if (idx - startIndex < endIndex - idx) {
                                            setStartIndex(idx);
                                        } else {
                                            setEndIndex(idx);
                                        }
                                    }
                                }}
                            >
                                {/* Dot indicator */}
                                <div 
                                    className={`w-5 h-5 rounded-full border-2 transition-all duration-300 shadow-sm flex items-center justify-center ${
                                        isActive 
                                            ? 'bg-blue-600 border-white scale-125 ring-4 ring-blue-50' 
                                            : 'bg-white border-slate-300 hover:border-slate-500'
                                    }`}
                                >
                                    <span className={`text-[8px] font-bold ${isActive ? 'text-white' : 'text-slate-400'}`}>
                                        {idx + 1}
                                    </span>
                                </div>
                                
                                {/* Tooltip */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-slate-900 text-white text-[10px] py-2 px-3 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 shadow-lg whitespace-nowrap z-30 flex flex-col items-center">
                                    <span className="font-semibold text-yellow-400">{att.timestamp}</span>
                                    <span className="mt-1 text-gray-200">{att.wpm} PPM | {att.precision}% Precisión</span>
                                    <span className="text-[8px] text-gray-400 mt-1 font-normal">Clic para ajustar el filtro</span>
                                    <div className="w-2 h-2 bg-slate-900 rotate-45 absolute top-full -translate-y-1 left-1/2 -translate-x-1/2"></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                {/* Controls for fine-tuning range */}
                <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-gray-600">
                    <div className="flex items-center space-x-2">
                        <span>Desde:</span>
                        <select 
                            value={startIndex} 
                            onChange={(e) => {
                                const val = Number(e.target.value);
                                setStartIndex(val);
                                if (val > endIndex) setEndIndex(val);
                            }}
                            className="border border-slate-200 rounded p-1.5 bg-white text-gray-700 font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm cursor-pointer"
                        >
                            {allAttempts.map((att, idx) => (
                                <option key={idx} value={idx}>{idx + 1} - {att.timestamp} ({att.wpm} PPM)</option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="text-slate-500 font-bold text-center bg-slate-50 px-3 py-1 rounded-full border border-slate-100 shadow-inner">
                        Visualizando {filteredAttempts.length} de {allAttempts.length} intentos de esta práctica
                    </div>
                    
                    <div className="flex items-center space-x-2">
                        <span>Hasta:</span>
                        <select 
                            value={endIndex} 
                            onChange={(e) => {
                                const val = Number(e.target.value);
                                setEndIndex(val);
                                if (val < startIndex) setStartIndex(val);
                            }}
                            className="border border-slate-200 rounded p-1.5 bg-white text-gray-700 font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm cursor-pointer"
                        >
                            {allAttempts.map((att, idx) => (
                                <option key={idx} value={idx} disabled={idx < startIndex}>{idx + 1} - {att.timestamp} ({att.wpm} PPM)</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Gráficos de Evolución */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                {/* Gráfico de Velocidad */}
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                    <h4 className="text-center text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Velocidad PPM</h4>
                    <div className="h-36 flex items-end justify-around border-b border-gray-200 relative mt-6 px-2">
                        <div className="absolute left-0 right-0 border-t border-dashed border-gray-100 top-0 pointer-events-none"></div>
                        <div className="absolute left-0 right-0 border-t border-dashed border-gray-100 top-1/2 pointer-events-none"></div>
                        
                        {filteredAttempts.map((attempt, idx) => {
                            const pctHeight = Math.max(5, (attempt.wpm / maxWpm) * 100);
                            return (
                                <div key={attempt.id || idx} className="h-full w-8 flex flex-col justify-end items-center group relative z-10">
                                    {/* Label superior - siempre visible */}
                                    <span 
                                        style={{ bottom: `calc(${pctHeight}% + 4px)` }}
                                        className="absolute text-[10px] font-bold text-slate-700 whitespace-nowrap bg-white/80 px-1 rounded shadow-sm border border-slate-100/50"
                                    >
                                        {Math.round(attempt.wpm)}
                                    </span>
                                    <div 
                                        style={{ height: `${pctHeight}%` }} 
                                        className="w-full bg-[#3e5c76] rounded-t hover:bg-blue-600 transition-all duration-500 shadow-sm"
                                        title={`${attempt.timestamp}: ${attempt.wpm} PPM`}
                                    ></div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-around mt-2 px-2">
                        {filteredAttempts.map((att, idx) => (
                            <span key={idx} className="w-8 text-center text-[9px] text-gray-400 whitespace-nowrap overflow-visible leading-tight">
                                {att.timeOnly}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Gráfico de Precisión */}
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                    <h4 className="text-center text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Precisión %</h4>
                    <div className="h-36 flex items-end justify-around border-b border-gray-200 relative mt-6 px-2">
                        <div className="absolute left-0 right-0 border-t border-dashed border-gray-100 top-0 pointer-events-none"></div>
                        <div className="absolute left-0 right-0 border-t border-dashed border-gray-100 top-1/2 pointer-events-none"></div>
                        
                        {filteredAttempts.map((attempt, idx) => {
                            const pctHeight = attempt.precision; 
                            return (
                                <div key={attempt.id || idx} className="h-full w-8 flex flex-col justify-end items-center group relative z-10">
                                    {/* Label superior - siempre visible */}
                                    <span 
                                        style={{ bottom: `calc(${pctHeight}% + 8px)` }}
                                        className="absolute text-[10px] font-bold text-slate-700 whitespace-nowrap bg-white/80 px-1 rounded shadow-sm border border-slate-100/50 transform -translate-y-1/2"
                                    >
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
                    <div className="flex justify-around mt-2 px-2">
                        {filteredAttempts.map((att, idx) => (
                            <span key={idx} className="w-8 text-center text-[9px] text-gray-400 whitespace-nowrap overflow-visible leading-tight">
                                {att.timeOnly}
                            </span>
                        ))}
                    </div>
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
                                        <th className="pb-3 text-center">Escritas</th>
                                        <th className="pb-3 text-center">Acertadas</th>
                                        <th className="pb-3 text-center">Erradas</th>
                                        <th className="pb-3 text-center">Duración</th>
                                        <th className="pb-3 text-center">Ver</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {lessonAttempts.map((att, index) => {
                                        const totalWritten = (att.correctChars ?? 0) + (att.errorChars ?? 0);
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
                                                <td className="py-3 text-center font-semibold text-slate-700">{totalWritten}</td>
                                                <td className="py-3 text-center font-semibold text-green-600">{att.correctChars ?? 0}</td>
                                                <td className="py-3 text-center font-semibold text-red-500">{att.errorChars ?? 0}</td>
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

    // Filtrar intentos previos solo de la lección seleccionada (más reciente a más antiguo)
    const currentLessonAttempts = useMemo(() => {
        return [...history].filter(item => item.lessonId === lessonId).reverse();
    }, [history, lessonId]);

    const handlePlayReplay = (attempt) => {
        setReplayData(attempt);
        setPhase('replay');
    };

    return (
        <div className="w-full max-w-7xl mx-auto flex flex-col items-center">
            
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
                    
                    <div className="space-y-10">
                        {Object.entries(
                            TRAINING_LESSONS.reduce((acc, l) => {
                                if (!acc[l.section]) acc[l.section] = [];
                                acc[l.section].push(l);
                                return acc;
                            }, {})
                        ).map(([sectionName, lessons]) => (
                            <div key={sectionName} className="border-t pt-8 first:border-t-0 first:pt-0">
                                <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
                                    <span className="w-2.5 h-6 bg-blue-600 rounded-full mr-3 inline-block"></span>
                                    {sectionName}
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                    {lessons.map((l) => {
                                        const attempts = history.filter(h => h.lessonId === l.id);
                                        const bestStars = attempts.reduce((max, curr) => curr.stars > max ? curr.stars : max, 0);
                                        const completed = attempts.length > 0;
                                        
                                        // Determinar el elemento central visual
                                        let centerEl = null;
                                        if (l.id === 1) {
                                            centerEl = <BookOpen className="w-9 h-9 text-blue-500" />;
                                        } else if (l.title.includes("Teclas")) {
                                            const keysText = l.title.replace("Teclas ", "").replace(" & ", "").replace(" y ", "");
                                            centerEl = (
                                                <div className="flex flex-col items-center">
                                                    <span className="text-xl font-black text-slate-700 tracking-wide font-mono leading-none">{keysText}</span>
                                                    <div className="w-8 h-4 border border-slate-300 bg-slate-100 rounded-sm mt-1.5 shadow-sm flex items-center justify-center">
                                                        <div className="w-4 h-1 bg-slate-300 rounded-full opacity-60"></div>
                                                    </div>
                                                </div>
                                            );
                                        } else if (l.title.includes("Revisión")) {
                                            const keysText = l.title.replace("Revisión: ", "").replace("Base + ", "").replace("Fila ", "");
                                            centerEl = (
                                                <div className="relative flex flex-col items-center justify-center">
                                                    <Search className="w-9 h-9 text-amber-500" />
                                                    <span className="text-[10px] font-bold text-slate-500 font-mono mt-1">{keysText.substring(0, 5)}</span>
                                                </div>
                                            );
                                        } else if (l.title.includes("Práctica") || l.title.includes("Primeras")) {
                                            centerEl = <Clock className="w-9 h-9 text-green-600" />;
                                        } else if (l.title.includes("Postura") || l.title.includes("Piensa")) {
                                            centerEl = <User className="w-9 h-9 text-indigo-500" />;
                                        } else if (l.title.includes("descanso")) {
                                            centerEl = <Coffee className="w-9 h-9 text-amber-700" />;
                                        } else if (l.section === "Palabras desafiantes 1") {
                                            centerEl = (
                                                <span className="text-sm font-bold text-slate-600 font-mono bg-slate-100 px-2 py-1 rounded border border-slate-200 shadow-sm leading-tight text-center">
                                                    {l.title}
                                                </span>
                                            );
                                        } else {
                                            centerEl = <Keyboard className="w-9 h-9 text-slate-500" />;
                                        }

                                        return (
                                            <div 
                                                key={l.id}
                                                onClick={() => {
                                                    if (completed) {
                                                        const latestAttempt = attempts[attempts.length - 1];
                                                        setLessonId(l.id);
                                                        setMetrics(latestAttempt);
                                                        setPhase('results');
                                                    } else {
                                                        startLesson(l.id);
                                                    }
                                                }}
                                                className={`
                                                    relative flex flex-col justify-between p-4 bg-white border rounded-xl 
                                                    shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200 
                                                    cursor-pointer select-none group aspect-square
                                                    ${completed ? 'border-green-200 bg-green-50/10' : 'border-slate-200'}
                                                `}
                                            >
                                                {/* Cabecera de la Tarjeta */}
                                                <div className="flex justify-between items-center w-full">
                                                    <span className="text-slate-400 font-bold text-xs">{l.id}</span>
                                                    {completed && <CheckCircle className="w-4 h-4 text-green-600" />}
                                                </div>

                                                {/* Icono/Contenido Visual Central */}
                                                <div className="flex-1 flex items-center justify-center my-2 group-hover:scale-105 transition-transform duration-200">
                                                    {centerEl}
                                                </div>

                                                {/* Pie de la Tarjeta */}
                                                <div className="w-full">
                                                    <h4 className="text-[11px] font-bold text-slate-700 truncate leading-tight mb-1" title={l.title}>
                                                        {l.title}
                                                    </h4>
                                                    <div className="h-4 flex items-center justify-center">
                                                        {completed && bestStars > 0 ? (
                                                            <div className="flex justify-center text-yellow-400">
                                                                {[1, 2, 3, 4, 5].map(starNum => (
                                                                    <Star 
                                                                        key={starNum} 
                                                                        className={`w-3.5 h-3.5 ${starNum <= bestStars ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} 
                                                                    />
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    startLesson(l.id);
                                                                }}
                                                                className="text-[10px] text-blue-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                ENTRENAR
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
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
                            const currentIndex = TRAINING_LESSONS.findIndex(l => l.id === lessonId);
                            if (currentIndex !== -1 && currentIndex + 1 < TRAINING_LESSONS.length) {
                                startLesson(TRAINING_LESSONS[currentIndex + 1].id);
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


const loadPdfJs = () => {
    return new Promise((resolve, reject) => {
        if (window.pdfjsLib) {
            resolve(window.pdfjsLib);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
        script.onload = () => {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
            resolve(window.pdfjsLib);
        };
        script.onerror = (e) => reject(new Error("No se pudo cargar la librería PDF.js"));
        document.head.appendChild(script);
    });
};

const cleanExtractedText = (text, pageNum, enableStrictFilters) => {
    if (!enableStrictFilters) return text;
    
    let lines = text.split('\n');
    lines = lines.filter(line => {
        const cleanLine = line.trim().toLowerCase();
        
        // 1. Omitir líneas vacías
        if (!cleanLine) return false;
        
        // 2. Eliminar encabezados específicos del manual oficial de Corrientes
        if (cleanLine.includes('manual de estudio') || 
            cleanLine.includes('aspirantes al cargo') || 
            cleanLine.includes('oficial de justicia') || 
            cleanLine.includes('módulo 3') || 
            cleanLine.includes('poder judicial')) {
            if (cleanLine.length < 120 && (cleanLine.includes('manual de estudio') || cleanLine.includes('provincia de corrientes') || cleanLine.includes('poder judicial'))) {
                return false;
            }
        }
        
        // 3. Eliminar subencabezados geográficos y fijos
        if (cleanLine === 'provincia de corrientes') return false;
        
        // 4. Eliminar números de página con formato (ej: "P.  7 0", "p. 70", "P. 7 1", "P. 10")
        if (/^p\.\s*[\d\s]+$/i.test(cleanLine) || /^p\s*[\d\s]+$/i.test(cleanLine)) return false;
        
        // 5. Eliminar la palabra "NOTAS" aislada (usualmente cabecera de bloques de notas)
        if (cleanLine === 'notas') return false;
        
        // 6. Eliminar texto de espacio para notas o cuadros vacíos
        if (cleanLine.includes('espacio para notas') || 
            cleanLine.includes('escriba sus notas') || 
            cleanLine.includes('notas de estudio')) return false;
            
        // 7. Eliminar marcas de agua repetitivas o líneas que solo tienen guiones/puntos separadores
        if (/^[_\-\.\s★*]+$/i.test(cleanLine)) return false;

        return true;
    });
    
    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
};

const extractTextFromPdf = async (file, fromPage, toPage, enableFilters, marginsConfig = { differentOddEven: false, marginsAll: { top: 0, bottom: 0, left: 0, right: 0 } }) => {
    const pdfjsLib = await loadPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = "";
    const totalPages = pdf.numPages;
    const start = Math.max(1, fromPage);
    const end = Math.min(totalPages, toPage);

    for (let pageNum = start; pageNum <= end; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        const pageMargins = !marginsConfig.differentOddEven 
            ? marginsConfig.marginsAll 
            : (pageNum % 2 === 1 ? marginsConfig.marginsOdd : marginsConfig.marginsEven);
        
        const viewport = page.getViewport({ scale: 1.0 });
        const pageWidth = viewport.width;
        const pageHeight = viewport.height;
        
        let lastY = null;
        let textLines = [];
        let currentLine = "";
        
        for (const item of textContent.items) {
            const x = item.transform[4];
            const y = item.transform[5];
            
            const topPct = ((pageHeight - y) / pageHeight) * 100;
            const bottomPct = (y / pageHeight) * 100;
            const leftPct = (x / pageWidth) * 100;
            const rightPct = ((pageWidth - x) / pageWidth) * 100;
            
            if (topPct < pageMargins.top || bottomPct < pageMargins.bottom || leftPct < pageMargins.left || rightPct < pageMargins.right) {
                continue;
            }
            
            if (lastY === null || Math.abs(y - lastY) < 5) {
                currentLine += (currentLine ? " " : "") + item.str;
            } else {
                if (currentLine.trim()) {
                    textLines.push(currentLine);
                }
                currentLine = item.str;
            }
            lastY = y;
        }
        if (currentLine.trim()) {
            textLines.push(currentLine);
        }
        
        const pageCleanedText = cleanExtractedText(textLines.join('\n'), pageNum, enableFilters);
        if (pageCleanedText) {
            fullText += (fullText ? "\n\n" : "") + pageCleanedText;
        }
    }
    
    return { text: fullText, totalPages };
};

const PreparacionTeorica = () => {
    const [text, setText] = useState('');
    const [speed, setSpeed] = useState('1.0');
    const [engine, setEngine] = useState('system'); // 'neural' o 'system'
    const [isGenerating, setIsGenerating] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [mp3Url, setMp3Url] = useState('');
    const [error, setError] = useState('');
    const [availableVoices, setAvailableVoices] = useState([]);
    
    // PDF related states
    const [pdfFile, setPdfFile] = useState(null);
    const [pdfTotalPages, setPdfTotalPages] = useState(0);
    const [pdfFromPage, setPdfFromPage] = useState(1);
    const [pdfToPage, setPdfToPage] = useState(1);
    const [isExtracting, setIsExtracting] = useState(false);
    const [enableStrictFilters, setEnableStrictFilters] = useState(true);

    const audioRef = useRef(null);

    // PDF Margin and Document states
    const [pdfDoc, setPdfDoc] = useState(null);
    const [differentOddEven, setDifferentOddEven] = useState(false);
    const [marginsAll, setMarginsAll] = useState({ top: 10, bottom: 10, left: 5, right: 5 });
    const [marginsOdd, setMarginsOdd] = useState({ top: 10, bottom: 10, left: 5, right: 5 });
    const [marginsEven, setMarginsEven] = useState({ top: 10, bottom: 10, left: 5, right: 5 });
    
    // Audio Player tracking states
    const [audioCurrentTime, setAudioCurrentTime] = useState(0);
    const [audioDuration, setAudioDuration] = useState(0);
    const [localChunkIndex, setLocalChunkIndex] = useState(0);
    const [localTotalChunks, setLocalTotalChunks] = useState(0);

    const playingRef = useRef(false);
    const canvasRef = useRef(null);
    const editorRef = useRef(null);
    const utteranceRef = useRef(null);

    // History and versions of theoretical texts
    const [activeTextId, setActiveTextId] = useState(null);
    const [savedTexts, setSavedTexts] = useState(() => {
        try {
            const saved = localStorage.getItem('dactilografia_teoria_historial');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('dactilografia_teoria_historial', JSON.stringify(savedTexts));
        } catch (e) {}
    }, [savedTexts]);

    useEffect(() => {
        playingRef.current = playing;
    }, [playing]);

    // Keep editor sync for loaded files (PDF / History)
    useEffect(() => {
        if (editorRef.current && document.activeElement !== editorRef.current) {
            editorRef.current.innerHTML = text || "";
        }
    }, [text]);

    // Cargar voces del sistema
    useEffect(() => {
        const updateVoices = () => {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                setAvailableVoices(window.speechSynthesis.getVoices());
            }
        };
        updateVoices();
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.onvoiceschanged = updateVoices;
        }
        return () => {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    const activeVoice = useMemo(() => {
        let v = availableVoices.find(voice => voice.lang.toLowerCase() === 'es-ar' || voice.lang.toLowerCase().replace('_', '-') === 'es-ar');
        if (!v) v = availableVoices.find(voice => voice.lang.toLowerCase().startsWith('es'));
        return v;
    }, [availableVoices]);

    const maxCharacters = useMemo(() => {
        return engine === 'system' ? 100000 : 15000;
    }, [engine]);

    const stripHtml = (html) => {
        if (!html) return "";
        if (typeof window === 'undefined') {
            return html.replace(/<[^>]*>/g, '');
        }
        const tmp = document.createElement("DIV");
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || "";
    };

    const plainText = useMemo(() => {
        return stripHtml(text);
    }, [text]);

    // Calcular palabras e info del texto
    const wordCount = useMemo(() => {
        return plainText.trim() ? plainText.trim().split(/\s+/).length : 0;
    }, [plainText]);

    const estimatedDuration = useMemo(() => {
        const totalSeconds = Math.round((wordCount / 130) * 60);
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m}m ${s}s`;
    }, [wordCount]);

    const speakTextNative = (textToSpeak, rate) => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        
        const plainTextToSpeak = stripHtml(textToSpeak);
        const chunks = splitTextIntoChunks(plainTextToSpeak, 180);
        setLocalTotalChunks(chunks.length);
        setLocalChunkIndex(0);
        let currentChunkIdx = 0;

        const speakNext = () => {
            if (currentChunkIdx >= chunks.length || !playingRef.current) {
                setPlaying(false);
                playingRef.current = false;
                setLocalChunkIndex(0);
                return;
            }
            
            setLocalChunkIndex(currentChunkIdx);
            const utterance = new SpeechSynthesisUtterance(chunks[currentChunkIdx]);
            if (activeVoice) {
                utterance.voice = activeVoice;
            } else {
                utterance.lang = 'es-AR';
            }
            utterance.rate = parseFloat(rate);
            
            utterance.onend = () => {
                currentChunkIdx++;
                setLocalChunkIndex(currentChunkIdx);
                speakNext();
            };
            utterance.onerror = (e) => {
                console.error("Speech synthesis utterance error", e);
                if (e.error !== 'interrupted') {
                    setPlaying(false);
                    playingRef.current = false;
                }
            };
            
            utteranceRef.current = utterance;
            window.speechSynthesis.speak(utterance);
        };
        
        setTimeout(() => {
            speakNext();
        }, 100);
    };

    const handlePdfFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setPdfFile(file);
        setIsExtracting(true);
        setError("");
        
        try {
            const pdfjsLib = await loadPdfJs();
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            setPdfDoc(pdf);
            setPdfTotalPages(pdf.numPages);
            setPdfFromPage(1);
            setPdfToPage(Math.min(pdf.numPages, 3)); // Por defecto procesa las primeras 3 páginas
        } catch (err) {
            console.error(err);
            setError("No se pudo cargar el archivo PDF. Asegúrate de que sea un archivo válido.");
            setPdfFile(null);
            setPdfTotalPages(0);
            setPdfDoc(null);
        } finally {
            setIsExtracting(false);
        }
    };

    const handleExtractPdfText = async () => {
        if (!pdfFile) return;
        setIsExtracting(true);
        setError("");
        
        try {
            const { text: extractedText } = await extractTextFromPdf(
                pdfFile, 
                pdfFromPage, 
                pdfToPage, 
                enableStrictFilters, 
                { differentOddEven, marginsAll, marginsOdd, marginsEven }
            );
            setText(extractedText.substring(0, 100000));
            setError(`Texto extraído exitosamente de las páginas ${pdfFromPage} a la ${pdfToPage}. Se importaron ${extractedText.length.toLocaleString('es-AR')} caracteres.`);
        } catch (err) {
            console.error(err);
            setError("Ocurrió un error al extraer el texto del PDF. Intenta de nuevo.");
        } finally {
            setIsExtracting(false);
        }
    };

    const handleGenerate = async () => {
        if (!text.trim()) return;
        setIsGenerating(true);
        setError("");
        
        if (playing) {
            if (audioRef.current) audioRef.current.pause();
            if (window.speechSynthesis) window.speechSynthesis.cancel();
            setPlaying(false);
            playingRef.current = false;
        }

        const plainTextToSpeak = stripHtml(text);

        if (engine === 'neural') {
            if (plainTextToSpeak.length > 15000) {
                setError("Para la voz neuronal, el texto no debe superar los 15.000 caracteres debido a limitaciones de carga del servidor. Reduce el texto o utiliza la Voz Local del Navegador.");
                setIsGenerating(false);
                return;
            }
            try {
                const response = await fetch('/api/tts', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ text: plainTextToSpeak, speed }),
                });

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    throw new Error(errData.error || `Error del servidor ${response.status}`);
                }

                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                setMp3Url(url);
                setPlaying(true);
                playingRef.current = true;
                
                setTimeout(() => {
                    if (audioRef.current) {
                        audioRef.current.playbackRate = parseFloat(speed);
                        audioRef.current.play().catch(e => console.error("Playback error:", e));
                    }
                }, 100);
            } catch (e) {
                console.warn("Error con TTS de Vercel. Redireccionando a síntesis local:", e);
                setError("El servidor de Vercel no está respondiendo (o estás en entorno de desarrollo local). Usando el motor de voz de tu dispositivo. La descarga de MP3 estará disponible tras publicar en Vercel.");
                setMp3Url("");
                setPlaying(true);
                playingRef.current = true;
                speakTextNative(plainTextToSpeak, speed);
            } finally {
                setIsGenerating(false);
            }
        } else {
            setMp3Url("");
            setPlaying(true);
            playingRef.current = true;
            speakTextNative(plainTextToSpeak, speed);
            setIsGenerating(false);
        }
    };

    const togglePlayback = () => {
        if (mp3Url && audioRef.current) {
            const audio = audioRef.current;
            if (playing) {
                audio.pause();
                setPlaying(false);
                playingRef.current = false;
            } else {
                audio.playbackRate = parseFloat(speed);
                audio.play().catch(e => console.error(e));
                setPlaying(true);
                playingRef.current = true;
            }
        } else if (window.speechSynthesis) {
            if (playing) {
                window.speechSynthesis.cancel();
                setPlaying(false);
                playingRef.current = false;
            } else {
                setPlaying(true);
                playingRef.current = true;
                speakTextNative(plainText, speed);
            }
        }
    };

    const stopPlayback = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        setPlaying(false);
        playingRef.current = false;
        setLocalChunkIndex(0);
        setAudioCurrentTime(0);
    };

    const splitTextIntoChunks = (textToSplit, maxLength = 180) => {
        const clean = textToSplit.replace(/\s+/g, ' ').trim();
        if (clean.length <= maxLength) return [clean];
        const chunks = [];
        let current = "";
        const sentences = clean.match(/[^.!?]+[.!?]+|[^.!?]+/g) || [clean];
        for (let sentence of sentences) {
            sentence = sentence.trim();
            if (!sentence) continue;
            if (current.length + sentence.length + 1 <= maxLength) {
                current = current ? `${current} ${sentence}` : sentence;
            } else {
                if (current) chunks.push(current);
                if (sentence.length > maxLength) {
                    const words = sentence.split(' ');
                    let sub = "";
                    for (const word of words) {
                        if (sub.length + word.length + 1 <= maxLength) {
                            sub = sub ? `${sub} ${word}` : word;
                        } else {
                            if (sub) chunks.push(sub);
                            sub = word;
                        }
                    }
                    if (sub) current = sub;
                } else {
                    current = sentence;
                }
            }
        }
        if (current) chunks.push(current);
        return chunks;
    };

    const loadSampleText = () => {
        setText("Manual de Oficial de Justicia - Parte General. Acdo. 08/22 punto 31º - Anexo II. Régimen de Gestión Electrónica Capitulo 5, Articulos 27, 28 y 29. El presente acuerdo regula el envío de notificaciones y la firma digital obligatoria de todas las partes firmantes en los expedientes digitales de la provincia. La implementación de la plataforma Bus Federal de Justicia permitirá la comunicación y el intercambio ágil y seguro de documental, de forma electrónica, entre todos los organismos integrados a dicha plataforma, sin necesidad de establecer canales individuales, evitando así múltiples desarrollos redundantes, brindando seguridad transaccional.");
    };

    // Renderizado de página PDF
    useEffect(() => {
        if (!pdfDoc || !canvasRef.current) return;
        let active = true;
        
        const render = async () => {
            try {
                const pageNum = Math.min(Math.max(1, pdfFromPage), pdfTotalPages);
                const page = await pdfDoc.getPage(pageNum);
                if (!active) return;
                
                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');
                
                const viewport = page.getViewport({ scale: 1.0 });
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                
                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;
            } catch (e) {
                console.error("Error rendering PDF page preview:", e);
            }
        };
        
        render();
        return () => {
            active = false;
        };
    }, [pdfDoc, pdfFromPage, pdfTotalPages]);

    const getCurrentMarginsForPage = (pageNum) => {
        if (!differentOddEven) return marginsAll;
        return (pageNum % 2 === 1) ? marginsOdd : marginsEven;
    };
    
    const currentMargins = getCurrentMarginsForPage(pdfFromPage);

    const handleMarginChange = (key, val) => {
        if (!differentOddEven) {
            setMarginsAll(prev => ({ ...prev, [key]: val }));
        } else {
            if (pdfFromPage % 2 === 1) {
                setMarginsOdd(prev => ({ ...prev, [key]: val }));
            } else {
                setMarginsEven(prev => ({ ...prev, [key]: val }));
            }
        }
    };

    const formatAudioTime = (seconds) => {
        if (isNaN(seconds) || seconds === null) return "0:00";
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const displayCurrentTime = mp3Url ? audioCurrentTime : (localTotalChunks > 0 ? (localChunkIndex / localTotalChunks) * (wordCount / 130) * 60 : 0);
    const displayDuration = mp3Url ? audioDuration : (wordCount / 130) * 60;
    const displayProgressValue = mp3Url ? audioCurrentTime : localChunkIndex;
    const displayProgressMax = mp3Url ? audioDuration : localTotalChunks;

    const handleAudioSeek = (e) => {
        const newTime = parseFloat(e.target.value);
        setAudioCurrentTime(newTime);
        if (audioRef.current) {
            audioRef.current.currentTime = newTime;
        }
    };

    const execFormat = (command, value = null) => {
        document.execCommand(command, false, value);
        if (editorRef.current) {
            setText(editorRef.current.innerHTML);
        }
    };

    const handleEditorInput = (e) => {
        setText(e.target.innerHTML);
    };

    const handleSaveText = () => {
        const plain = stripHtml(text).trim();
        if (!plain) {
            setError("No hay contenido para guardar.");
            return;
        }

        let defaultTitle = pdfFile ? pdfFile.name : "";
        if (defaultTitle && pdfFromPage && pdfToPage) {
            defaultTitle += ` (Pág ${pdfFromPage}-${pdfToPage})`;
        } else {
            defaultTitle = plain.substring(0, 30) + (plain.length > 30 ? "..." : "");
        }

        const title = window.prompt("Ingrese un título para guardar el texto:", defaultTitle);
        if (title === null) return; // Cancelled

        const timestamp = new Date().toLocaleString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        if (activeTextId) {
            const overwrite = window.confirm("¿Deseas sobreescribir el texto seleccionado en el historial? (Mantiene esta como la última versión correcta)");
            if (overwrite) {
                setSavedTexts(prev => prev.map(item => 
                    item.id === activeTextId 
                        ? { ...item, title: title || item.title, content: text, timestamp }
                        : item
                ));
                setError(`Texto "${title || 'Sin Título'}" actualizado en el historial.`);
                return;
            }
        }

        const newId = Date.now().toString();
        const newItem = {
            id: newId,
            title: title || "Texto sin título",
            content: text,
            timestamp
        };
        setSavedTexts(prev => [newItem, ...prev]);
        setActiveTextId(newId);
        setError(`Texto "${title || "Texto sin título"}" guardado en el historial.`);
    };

    return (
        <div className="w-full space-y-8">
            <style>{`
                @keyframes equalize {
                    0% { height: 15%; }
                    50% { height: 100%; }
                    100% { height: 15%; }
                }
                .equalizer-bar {
                    animation: equalize 0.8s ease-in-out infinite;
                }
                [contenteditable]:empty:before {
                    content: attr(placeholder);
                    color: #9ca3af;
                    pointer-events: none;
                    display: block;
                }
            `}</style>

            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-2xl font-bold text-[#002B5C] mb-4 flex items-center">
                    <Award className="w-6 h-6 mr-2" /> Preparación Teórica - Generador de Audio de Estudio
                </h2>
                <p className="text-gray-600 text-sm mb-6">
                    Pega tus apuntes o sube un PDF del manual oficial de la provincia de Corrientes. El sistema extraerá el texto, aplicará filtros de limpieza estricta y lo convertirá a voz con acento argentino.
                </p>

                <div className="space-y-6">
                    {/* Panel de Carga de PDF */}
                    <div className="p-4 bg-slate-50 border border-gray-200 rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-inner">
                        <div className="flex-1">
                            <span className="block text-sm font-semibold text-gray-800">📁 Extraer texto desde un PDF oficial:</span>
                            <span className="block text-xs text-gray-500 mt-0.5">Sube tu manual de estudio para extraer páginas seleccionadas automáticamente.</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <label className="bg-white border border-gray-300 hover:border-gray-400 text-gray-700 font-semibold px-4 py-2.5 rounded cursor-pointer transition text-xs shadow-sm flex items-center">
                                <span>{pdfFile ? pdfFile.name : "Seleccionar PDF"}</span>
                                <input 
                                    type="file" 
                                    accept=".pdf" 
                                    className="hidden" 
                                    onChange={handlePdfFileChange}
                                />
                            </label>
                            {pdfFile && (
                                <>
                                    <div className="flex items-center space-x-1.5 text-xs text-gray-600">
                                        <span>Desde Pág:</span>
                                        <input 
                                            type="number" 
                                            min="1" 
                                            max={pdfTotalPages || 999}
                                            className="w-14 p-1.5 border rounded text-center" 
                                            value={pdfFromPage} 
                                            onChange={(e) => setPdfFromPage(Math.max(1, Number(e.target.value)))}
                                        />
                                        <span>hasta:</span>
                                        <input 
                                            type="number" 
                                            min="1" 
                                            max={pdfTotalPages || 999}
                                            className="w-14 p-1.5 border rounded text-center" 
                                            value={pdfToPage} 
                                            onChange={(e) => setPdfToPage(Math.max(1, Number(e.target.value)))}
                                        />
                                        {pdfTotalPages && <span className="text-[10px] text-gray-400">(de {pdfTotalPages})</span>}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Previsualizador de márgenes PDF */}
                    {pdfFile && pdfDoc && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-sm grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Columna Izquierda: Canvas Preview con Overlay */}
                            <div className="flex flex-col items-center">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 text-center">
                                    Vista Previa (Pág. {pdfFromPage})
                                </h4>
                                <div className="relative border rounded shadow bg-white max-w-full overflow-hidden flex justify-center items-center">
                                    <canvas ref={canvasRef} className="max-w-full" style={{ maxHeight: '420px', width: 'auto', height: 'auto' }} />
                                    
                                    {/* Guías de márgenes */}
                                    <div 
                                        className="absolute left-0 right-0 border-t border-dashed border-red-500 pointer-events-none w-full" 
                                        style={{ top: `${currentMargins.top}%` }}
                                    />
                                    <div 
                                        className="absolute left-0 right-0 border-b border-dashed border-red-500 pointer-events-none w-full" 
                                        style={{ bottom: `${currentMargins.bottom}%` }}
                                    />
                                    <div 
                                        className="absolute top-0 bottom-0 border-l border-dashed border-red-500 pointer-events-none h-full" 
                                        style={{ left: `${currentMargins.left}%` }}
                                    />
                                    <div 
                                        className="absolute top-0 bottom-0 border-r border-dashed border-red-500 pointer-events-none h-full" 
                                        style={{ right: `${currentMargins.right}%` }}
                                    />
                                    
                                    {/* Zona de exclusión (Sombreado exterior) */}
                                    <div className="absolute top-0 left-0 right-0 bg-red-500/10 pointer-events-none w-full" style={{ height: `${currentMargins.top}%` }} />
                                    <div className="absolute bottom-0 left-0 right-0 bg-red-500/10 pointer-events-none w-full" style={{ height: `${currentMargins.bottom}%` }} />
                                    <div className="absolute top-0 bottom-0 left-0 bg-red-500/10 pointer-events-none h-full" style={{ width: `${currentMargins.left}%` }} />
                                    <div className="absolute top-0 bottom-0 right-0 bg-red-500/10 pointer-events-none h-full" style={{ width: `${currentMargins.right}%` }} />
                                </div>
                                <span className="text-[10px] text-slate-400 mt-2 text-center">
                                    Las áreas sombreadas en rojo se excluirán del texto extraído.
                                </span>
                            </div>

                            {/* Columna Derecha: Configuración de Márgenes */}
                            <div className="flex flex-col justify-between space-y-4">
                                <div>
                                    <span className="block text-sm font-semibold text-slate-800 mb-1">📐 Reglas de Márgenes de Extracción:</span>
                                    <span className="block text-xs text-slate-500 mb-4">Ajusta los porcentajes de exclusión para ignorar encabezados, pies de página o márgenes laterales.</span>
                                    
                                    <div className="flex items-center space-x-3 mb-6 bg-white p-3 border rounded-lg">
                                        <input 
                                            type="checkbox" 
                                            id="diffOddEven"
                                            className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                                            checked={differentOddEven}
                                            onChange={(e) => setDifferentOddEven(e.target.checked)}
                                        />
                                        <label htmlFor="diffOddEven" className="text-xs text-slate-700 font-semibold cursor-pointer select-none">
                                            Márgenes diferentes para páginas pares e impares
                                        </label>
                                    </div>

                                    {differentOddEven && (
                                        <div className="mb-4 text-xs font-bold px-3 py-1.5 rounded-full inline-block bg-blue-100 text-blue-800">
                                            Ajustando márgenes de páginas {pdfFromPage % 2 === 1 ? 'IMPARES (1, 3, ...)' : 'PARES (2, 4, ...)'}
                                        </div>
                                    )}

                                    <div className="space-y-4 bg-white p-4 border rounded-xl shadow-inner">
                                        <div>
                                            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                                                <span>Margen Superior:</span>
                                                <span className="font-mono text-red-600">{currentMargins.top}%</span>
                                            </div>
                                            <input 
                                                type="range" min="0" max="45" step="1"
                                                className="w-full accent-red-500 h-1.5 rounded bg-slate-200 cursor-pointer"
                                                value={currentMargins.top}
                                                onChange={(e) => handleMarginChange('top', Number(e.target.value))}
                                            />
                                        </div>

                                        <div>
                                            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                                                <span>Margen Inferior:</span>
                                                <span className="font-mono text-red-600">{currentMargins.bottom}%</span>
                                            </div>
                                            <input 
                                                type="range" min="0" max="45" step="1"
                                                className="w-full accent-red-500 h-1.5 rounded bg-slate-200 cursor-pointer"
                                                value={currentMargins.bottom}
                                                onChange={(e) => handleMarginChange('bottom', Number(e.target.value))}
                                            />
                                        </div>

                                        <div>
                                            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                                                <span>Margen Izquierdo:</span>
                                                <span className="font-mono text-red-600">{currentMargins.left}%</span>
                                            </div>
                                            <input 
                                                type="range" min="0" max="35" step="1"
                                                className="w-full accent-red-500 h-1.5 rounded bg-slate-200 cursor-pointer"
                                                value={currentMargins.left}
                                                onChange={(e) => handleMarginChange('left', Number(e.target.value))}
                                            />
                                        </div>

                                        <div>
                                            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                                                <span>Margen Derecho:</span>
                                                <span className="font-mono text-red-600">{currentMargins.right}%</span>
                                            </div>
                                            <input 
                                                type="range" min="0" max="35" step="1"
                                                className="w-full accent-red-500 h-1.5 rounded bg-slate-200 cursor-pointer"
                                                value={currentMargins.right}
                                                onChange={(e) => handleMarginChange('right', Number(e.target.value))}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
                                    <span>Páginas a extraer: {pdfFromPage} a {pdfToPage}</span>
                                    <button 
                                        onClick={handleExtractPdfText}
                                        disabled={isExtracting}
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-lg transition shadow disabled:bg-slate-300 disabled:cursor-not-allowed"
                                    >
                                        {isExtracting ? "Procesando..." : "Aplicar y Extraer Texto"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Checkbox Filtros Exclusión Estricta */}
                    <div className="flex items-start space-x-3 bg-blue-50/50 p-4 border border-blue-100 rounded-lg">
                        <input 
                            type="checkbox" 
                            id="strictFilters"
                            className="mt-0.5 w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                            checked={enableStrictFilters}
                            onChange={(e) => setEnableStrictFilters(e.target.checked)}
                        />
                        <label htmlFor="strictFilters" className="text-xs text-gray-700 font-medium cursor-pointer select-none leading-relaxed">
                            <strong>Filtros de limpieza del texto (exclusión estricta)</strong>: Al extraer del PDF, elimina automáticamente los encabezados repetitivos del manual de oficiales, números de página (ej. <i>\"P. 70\"</i>), pies de página, títulos aislados de <i>\"NOTAS\"</i>, cuadros en blanco y marcas de agua. Esto evita que la voz lea metadatos repetitivos en cada cambio de página.
                        </label>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-semibold text-gray-700">Texto Teórico a Procesar:</label>
                            <div className="flex items-center space-x-4">
                                <button 
                                    onClick={loadSampleText}
                                    className="text-xs text-blue-600 hover:underline font-semibold"
                                >
                                    Cargar Ejemplo del Manual
                                </button>
                            </div>
                        </div>

                        {/* Barra de Herramientas de Formato */}
                        <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-100 border border-slate-300 border-b-0 rounded-t-lg shadow-sm">
                            <div className="flex flex-wrap items-center gap-1.5">
                                <button 
                                    onClick={() => execFormat('bold')} 
                                    className="p-1.5 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm flex items-center justify-center transition-colors min-w-[32px] h-8" 
                                    title="Negrita"
                                >
                                    <Bold size={16} />
                                </button>
                                <button 
                                    onClick={() => execFormat('italic')} 
                                    className="p-1.5 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm flex items-center justify-center transition-colors min-w-[32px] h-8" 
                                    title="Cursiva"
                                >
                                    <Italic size={16} />
                                </button>
                                <button 
                                    onClick={() => execFormat('underline')} 
                                    className="p-1.5 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm flex items-center justify-center transition-colors min-w-[32px] h-8" 
                                    title="Subrayado"
                                >
                                    <Underline size={16} />
                                </button>
                                <button 
                                    onClick={() => execFormat('backColor', '#fef08a')} 
                                    className="p-1.5 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm flex items-center justify-center transition-colors min-w-[32px] h-8" 
                                    title="Resaltar Amarillo"
                                >
                                    <Highlighter size={16} className="text-yellow-600" />
                                </button>

                                <div className="w-px h-6 bg-slate-300 mx-1.5"></div>

                                <button 
                                    onClick={() => execFormat('justifyLeft')} 
                                    className="p-1.5 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm flex items-center justify-center transition-colors min-w-[32px] h-8" 
                                    title="Alinear Izquierda"
                                >
                                    <AlignLeft size={16} />
                                </button>
                                <button 
                                    onClick={() => execFormat('justifyCenter')} 
                                    className="p-1.5 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm flex items-center justify-center transition-colors min-w-[32px] h-8" 
                                    title="Centrar"
                                >
                                    <AlignCenter size={16} />
                                </button>
                                <button 
                                    onClick={() => execFormat('justifyRight')} 
                                    className="p-1.5 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm flex items-center justify-center transition-colors min-w-[32px] h-8" 
                                    title="Alinear Derecha"
                                >
                                    <AlignRight size={16} />
                                </button>
                                <button 
                                    onClick={() => execFormat('justifyFull')} 
                                    className="p-1.5 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm flex items-center justify-center transition-colors min-w-[32px] h-8" 
                                    title="Justificar"
                                >
                                    <AlignJustify size={16} />
                                </button>
                            </div>
                            
                            <button 
                                onClick={handleSaveText}
                                className="bg-[#002B5C] hover:bg-blue-900 text-white font-bold py-1.5 px-3.5 rounded text-xs flex items-center transition shadow-sm h-8"
                            >
                                <Save size={14} className="mr-1.5" /> Guardar en Historial
                            </button>
                        </div>

                        {/* Editor de Texto Enriquecido */}
                        <div 
                            ref={editorRef}
                            contentEditable={true}
                            onInput={handleEditorInput}
                            className="w-full h-64 p-4 border border-gray-300 rounded-b-lg focus:outline-none focus:ring-2 focus:ring-[#002B5C] focus:border-transparent font-sans text-gray-800 leading-relaxed text-sm overflow-y-auto bg-white shadow-inner"
                            placeholder="El texto extraído aparecerá aquí. También puedes pegar tu propio texto directamente y darle formato..."
                            style={{ minHeight: '16rem' }}
                        />

                        <div className="flex justify-between text-xs text-gray-400 mt-1 select-none">
                            <span className={plainText.length > maxCharacters ? "text-red-500 font-bold" : "text-gray-400"}>
                                {plainText.length.toLocaleString('es-AR')} / {maxCharacters.toLocaleString('es-AR')} caracteres
                            </span>
                            <span>{wordCount.toLocaleString('es-AR')} palabras | Duración estimada: {estimatedDuration}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Velocidad de Lectura:</label>
                            <select 
                                className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-[#002B5C] text-sm"
                                value={speed}
                                onChange={(e) => setSpeed(e.target.value)}
                            >
                                <option value="0.8">0.8x - Lenta</option>
                                <option value="1.0">1.0x - Normal</option>
                                <option value="1.2">1.2x - Rápida</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Motor de Voz:</label>
                            <select 
                                className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-[#002B5C] text-sm"
                                value={engine}
                                onChange={(e) => setEngine(e.target.value)}
                            >
                                <option value="neural">Voz Neuronal Argentina (Descargar MP3)</option>
                                <option value="system">Voz Local del Navegador (Instantánea)</option>
                            </select>
                        </div>

                        <div className="flex flex-col justify-end">
                            <button 
                                onClick={handleGenerate}
                                disabled={isGenerating || isExtracting || !text.trim()}
                                className="w-full bg-[#002B5C] hover:bg-blue-900 text-white font-bold py-3.5 px-6 rounded-lg text-sm flex justify-center items-center transition-colors shadow disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                                {isGenerating ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Procesando Audio...
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-4 h-4 mr-2" /> Generar Audio para Estudio
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded text-amber-800 text-xs leading-relaxed shadow-sm">
                            {error}
                        </div>
                    )}
                </div>
            </div>

            {/* Custom Audio Player Card */}
            {(mp3Url || playing) && (
                <div className="bg-gradient-to-r from-[#001f40] to-[#002B5C] p-6 rounded-2xl shadow-lg border border-[#002B5C] text-white flex flex-col space-y-4">
                    <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
                        <div className="flex items-center space-x-6">
                            <div className="p-4 bg-white/10 rounded-full backdrop-blur-sm border border-white/10">
                                {playing ? (
                                    <div className="flex items-end justify-center space-x-1 w-8 h-8">
                                        {[...Array(5)].map((_, i) => (
                                            <div 
                                                key={i} 
                                                className="w-1 bg-yellow-400 rounded-full equalizer-bar" 
                                                style={{ 
                                                    animationDelay: `${i * 0.1}s`,
                                                    animationDuration: `${0.5 + (i % 2) * 0.2}s`,
                                                    height: '30%'
                                                }}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <Award className="w-8 h-8 text-yellow-400" />
                                )}
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">Reproductor de Audio de Estudio</h3>
                                <p className="text-xs text-gray-300 mt-1">
                                    {mp3Url ? "Voz Neuronal Argentina - Archivo MP3 de Alta Calidad" : `Voz Local del Navegador: ${activeVoice ? activeVoice.name : 'Español'}`}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-4">
                            <button 
                                onClick={togglePlayback}
                                className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold px-6 py-2.5 rounded-full text-sm flex items-center transition-colors shadow"
                            >
                                {playing ? "PAUSAR" : "REPRODUCIR"}
                            </button>
                            <button 
                                onClick={stopPlayback}
                                className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-5 py-2.5 rounded-full text-sm transition-colors"
                            >
                                DETENER
                            </button>
                            {mp3Url && (
                                <a 
                                    href={mp3Url} 
                                    download="preparacion-teorica.mp3"
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2.5 rounded-full text-sm flex items-center transition-colors shadow border border-green-500"
                                >
                                    DESCARGAR MP3
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Progress Bar & Seek Slider */}
                    <div className="flex items-center space-x-4 w-full bg-black/20 p-3 rounded-lg border border-white/5">
                        <span className="text-xs font-mono select-none">{formatAudioTime(displayCurrentTime)}</span>
                        
                        <input 
                            type="range"
                            min="0"
                            max={displayProgressMax || 100}
                            value={displayProgressValue}
                            onChange={handleAudioSeek}
                            disabled={!mp3Url}
                            className="flex-1 accent-yellow-400 h-1.5 rounded-lg bg-white/20 appearance-none cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
                        />
                        
                        <span className="text-xs font-mono select-none">{formatAudioTime(displayDuration)}</span>
                    </div>
                </div>
            )}

            {mp3Url && (
                <audio 
                    ref={audioRef} 
                    src={mp3Url} 
                    onEnded={() => setPlaying(false)} 
                    onTimeUpdate={(e) => setAudioCurrentTime(e.target.currentTime)}
                    onLoadedMetadata={(e) => setAudioDuration(e.target.duration)}
                    style={{ display: 'none' }}
                />
            )}

            {/* Historial de Apuntes y Textos Teóricos */}
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mt-8">
                <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-2">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center">
                        <FileText className="w-4 h-4 mr-2 text-blue-600" /> Historial de Textos Teóricos Guardados
                    </h3>
                    {savedTexts.length > 0 && (
                        <button 
                            onClick={() => {
                                if (window.confirm("¿Seguro que deseas borrar todo el historial de apuntes teóricos?")) {
                                    setSavedTexts([]);
                                    setActiveTextId(null);
                                    localStorage.removeItem('dactilografia_teoria_historial');
                                }
                            }}
                            className="text-[10px] text-red-500 hover:text-red-700 font-semibold border border-red-200 rounded px-2.5 py-1 hover:bg-red-50 transition"
                        >
                            Borrar Todo
                        </button>
                    )}
                </div>

                {savedTexts.length === 0 ? (
                    <p className="text-center text-xs text-slate-400 py-6">No tienes apuntes teóricos guardados en el historial.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {savedTexts.map((item) => (
                            <div 
                                key={item.id}
                                className={`p-4 rounded-xl border bg-white shadow-sm flex flex-col justify-between transition hover:border-blue-300 ${activeTextId === item.id ? 'border-blue-500 ring-2 ring-blue-50' : 'border-slate-200'}`}
                            >
                                <div className="mb-3">
                                    <div className="flex justify-between items-start gap-2">
                                        <h4 className="font-bold text-xs text-slate-700 truncate max-w-[70%]" title={item.title}>
                                            {item.title}
                                        </h4>
                                        <span className="text-[9px] text-slate-400 font-mono whitespace-nowrap">{item.timestamp}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
                                        {stripHtml(item.content)}
                                    </p>
                                </div>
                                <div className="flex justify-end space-x-3 pt-2 border-t border-slate-100 text-[10px] font-bold">
                                    <button 
                                        onClick={() => {
                                            setText(item.content);
                                            setActiveTextId(item.id);
                                            setError(`Cargado del historial: "${item.title}"`);
                                        }}
                                        className="text-blue-600 hover:text-blue-800 transition"
                                    >
                                        Cargar
                                    </button>
                                    <span className="text-slate-200 select-none">|</span>
                                    <button 
                                        onClick={() => {
                                            if (window.confirm(`¿Seguro que deseas eliminar "${item.title}" del historial?`)) {
                                                setSavedTexts(prev => prev.filter(x => x.id !== item.id));
                                                if (activeTextId === item.id) setActiveTextId(null);
                                            }
                                        }}
                                        className="text-red-500 hover:text-red-700 transition"
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
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
                {activeTab === 'simulador' && <Simulador />}
                {activeTab === 'entrenamiento' && <Entrenamiento history={history} onAddHistory={handleAddHistory} />}
                {activeTab === 'teoria' && <PreparacionTeorica />}
            </main>
        </div>
    );
}
