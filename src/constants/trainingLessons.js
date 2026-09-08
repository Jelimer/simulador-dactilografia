/**
 * @file trainingLessons.js
 * @description Catálogo oficial de 86 lecciones guiadas de mecanografía, distribución de teclado y mapeo ergonómico de dedos.
 * Diseñado bajo metodología progresiva (TypingClub style) para entrenamiento de velocidad y precisión judicial.
 */

/**
 * @typedef {'L-Pinky' | 'L-Ring' | 'L-Middle' | 'L-Index' | 'R-Index' | 'R-Middle' | 'R-Ring' | 'R-Pinky' | 'Thumb'} FingerName
 *
 * @typedef {Object} TrainingLesson
 * @property {number} id - Identificador numérico de la lección.
 * @property {string} title - Título descriptivo de la lección o ejercicio.
 * @property {string} text - Cadena exacta de caracteres a tipear.
 * @property {string} section - Sección formativa a la que pertenece.
 */

/**
 * Lista ordenada de las secciones pedagógicas del curso.
 * @type {ReadonlyArray<string>}
 */
export const SECTIONS_LIST = Object.freeze([
    'Fila guía',
    'Fila superior',
    'Fila inferior',
    'Caracteres acentuados',
    'Palabras desafiantes 1'
]);

/**
 * Catálogo íntegro de lecciones de entrenamiento de mecanografía (86 lecciones).
 * @type {ReadonlyArray<TrainingLesson>}
 */
export const TRAINING_LESSONS = Object.freeze([
    // Fila guía
    { id: 1, title: 'Introducción', text: 'f j f j ff jj f j f j ff jj', section: 'Fila guía' },
    { id: 2, title: 'Teclas f & j', text: 'ffffjjjjffffjjjjffjjffjjfjjfjf', section: 'Fila guía' },
    { id: 3, title: 'Barra de espacio', text: 'f f j j ff ff jj jj fj jf ff jj', section: 'Fila guía' },
    { id: 4, title: 'Revisión f & j', text: 'ffff jjjj ff jj fff jjj fj fj jjf ffj fff jjj ffj jjf fjfj fffj jjjf ffjj ff jj ffff', section: 'Fila guía' },
    { id: 5, title: 'Teclas d & k', text: 'ddddkkkkddddkkkkddkkddkkdkdkkdkd', section: 'Fila guía' },
    { id: 6, title: 'Revisión d & k', text: 'dd kk dk dk kd kd ddd kkd ddk dkk kkdd ddkk dddd kkkk ddkk kkdd kdd kddd dk kk', section: 'Fila guía' },
    { id: 7, title: 'Práctica d & k', text: 'ffff ddd jjjj kkkk df df jk jk jjj fff ddff jjkk kkdd fdfd jkjk dfjk dfjk kkdd jkjk dfdf dfjj jjfd', section: 'Fila guía' },
    // 8: Juego fjdk - omitido
    { id: 9, title: 'Teclas s & l', text: 'ssssllllssssllllssllssllslsllsls', section: 'Fila guía' },
    { id: 10, title: 'Revisión s & l', text: 'll ss ssll slsl lsssl slls lsll ssl llss ssll slsl llsslsll ssl ssll slsl lsll ll', section: 'Fila guía' },
    { id: 11, title: 'Práctica s & l', text: 'jj ff kk dd ll ssssd df fj jk kl sdfsk dl ks jf kd lslfl kl js kd jf sdfllk kkj jjf', section: 'Fila guía' },
    { id: 12, title: 'Teclas a & ñ', text: 'aaaaññññaaaaññññaaññaaññañaññaña', section: 'Fila guía' },
    { id: 13, title: 'Revisión a & ñ', text: 'aa ññ ññaa ñaña aññña ñaañ añaa ññaaaññ ññaa ñaña aaññañaa ñña ññaa ñaña', section: 'Fila guía' },
    { id: 14, title: 'Primeras 8 teclas', text: 'las alas las ñañas lasas kasas fasas fañas kañas dañas laña saña salsa falsa kala sañas', section: 'Fila guía' },
    // 15: Juego Las primeras 8 - omitido
    { id: 16, title: 'Fila guía: Izquierda', text: 'dad dada ad ada adad sad sada dasad fas fasd dada affa fada fasa saf fdds asdf', section: 'Fila guía' },
    { id: 17, title: 'Fila guía: Derecha', text: 'jk jk ññjl jlkj ñjk lkjj jjññ lkjj lkjj lkñjñ jklñ jjkk lkj jjkk lkjj ñkñj jjñj jl jk kj klj lkj kñj', section: 'Fila guía' },
    { id: 18, title: 'Teclas g & h', text: 'gggghhhhgggghhhhgghhgghhghghhgh', section: 'Fila guía' },
    { id: 19, title: 'Revisión g & h', text: 'gg hh hhgg hghg ghhhg hggh ghgg hhggghhh hhgg hghg gghhghgg hhg hhgg hghg', section: 'Fila guía' },
    { id: 20, title: 'Práctica g & h', text: 'glag glass gag had ñaha gal laña saña gaf hah haha gaga gaña faña hasha shash', section: 'Fila guía' },
    { id: 21, title: 'Revisión: Fila guía', text: 'hala hafa gafa kaja kaha laja falaha jalaka dajala jala sala kala lala saja gala gaga galaja', section: 'Fila guía' },
    { id: 22, title: 'Práctica Integral', text: 'las alas gala salsa falsa saña daña laña hala jala sala kala laja saja falaha galaja flash dash slash flask glass flags half shall falls lash gash glad ask sad dad all', section: 'Fila guía' },

    // Fila superior
    { id: 23, title: 'Teclas r & u', text: 'rrruuruuuuruurrruruurrrruruuuruu', section: 'Fila superior' },
    { id: 24, title: 'Revisión: r & u', text: 'rr uu rruu ruru urrru ruur uruu rru uurr rruu ruru uurruruu rru rruu ruru uruu uu', section: 'Fila superior' },
    { id: 25, title: 'Práctica: r & u', text: 'larusa rusa krull laura durasa durafa guru dura sudar salar salada furasa farusa darasa arañada', section: 'Fila superior' },
    { id: 26, title: 'Teclas e & i', text: 'eiiieeeeiieiieeiieieiiieeiieieiee', section: 'Fila superior' },
    { id: 27, title: 'Revisión: e & i', text: 'ee ii eeii eiei ieeei eiie ieii eei iiee eeii eiei iieeieii eei eeii eiei ieii ii', section: 'Fila superior' },
    { id: 28, title: 'Práctica: e & i', text: 'de ese desde deja ideales edad falsedad duradera jaladera areiña direña dueña kalaña salañera ruña', section: 'Fila superior' },
    { id: 29, title: '¡Postura saludable!', text: 'mantener la espalda recta y los pies apoyados en el suelo', section: 'Fila superior' },
    { id: 30, title: 'Revisión Base + ruei', text: 'de larusa ese desde laureada sudar salar saña falsedad jaladera alajas areiña huraña duraña guruña deruña', section: 'Fila superior' },
    { id: 31, title: 'Fila superior: Izquierda', text: 'ese fare sare are dare ades fares dares sera dera asara gara sara garafa gada sara fara gaga dada rega', section: 'Fila superior' },
    { id: 32, title: 'Fila superior: Derecha', text: 'hilu ilil killu ñill ñlik jiñl jkñh jlul kñl julk jijl llññ jññk lkjñ ñlkj jill hill kihñ khil kñil likh', section: 'Fila superior' },
    // 33: Juego ruei - omitido
    { id: 34, title: 'Teclas w & o', text: 'wwoowwoowwooowwoowwwoowwowoowwwo', section: 'Fila superior' },
    { id: 35, title: 'Revisión: w & o', text: 'sw lo wo ow sw ol ow lo ww oo wo ow sw lo wo ow sw ol ow', section: 'Fila superior' },
    { id: 36, title: 'Práctica: w & o', text: 'wafle wifredo walfraio wilfer waflera riña leña gaña geña fresa araña arañada delgado delgada dragar wifi', section: 'Fila superior' },
    // 37: Juego Teclas superior - omitido
    { id: 38, title: 'Teclas q & y', text: 'qyyqyyyqyqqqyyyqyqyyqyyyqqqyyqyq', section: 'Fila superior' },
    { id: 39, title: 'Revisión: q & y', text: 'qq yy qqyy qyqy yqqqy qyyq yqyy qqy yyqq qqyy qyqy yyqqyqyy qqy qqyy qyqy yqyy yy', section: 'Fila superior' },
    { id: 40, title: 'Práctica: q & y', text: 'quiosko quasar qual quadrado quesadilla queso quiso yuko royo rayo guaraña guadaña faruña fuyoda fukuaka', section: 'Fila superior' },
    { id: 41, title: 'Teclas t & p', text: 'pptptptttttptptpptptppptpttptppt', section: 'Fila superior' },
    { id: 42, title: 'Revisión: t & p', text: 'tt pp ttpp tptp ptttp tppt ptpp ttp pptt ttpp tptp ppttptpp ttp ttpp tptp ptpp pp', section: 'Fila superior' },
    { id: 43, title: 'Práctica: t & p', text: 'rata roto ropa ropero patata piña otoño peñota pelota frita prehistoria prototipo protesta propuesta toño grafito topo', section: 'Fila superior' },
    // 44: Juego Fila superior - omitido
    { id: 45, title: '¡Piensa ideas, no en letras!', text: 'escribir sin mirar el teclado permite pensar en las ideas', section: 'Fila superior' },
    { id: 46, title: 'Revisión Base + Fila superior', text: 'que ha pasado su alrededor profesor por falta del sol es el prototipo de señora porque aquellos ojos las fatigas del estudio dolor el teatro', section: 'Fila superior' },
    { id: 47, title: 'Fila superior: Izquierda', text: 'eres seas terrestre edad de dar estar arte esferas errar arrastra tarde seres dar esas este traes', section: 'Fila superior' },
    { id: 48, title: 'Fila superior: Derecha', text: 'julio yo jjññ jojo hijo jiji pujo illo ullo jiloyo kilo kiloyo hipo hiyuyu yujolo hilo hiloyuyo pipoyo', section: 'Fila superior' },
    // 49-50: Juegos Fila superior - omitidos

    // Fila inferior
    { id: 51, title: 'Teclas v & m', text: 'vmvmmvmmmvvvvmvmvmvmmmvmvmmvvvmm', section: 'Fila inferior' },
    { id: 52, title: 'Revisión: v & m', text: 'vv mm vvmm vmvm mvvvm vmmv mvmm vvm mmvv vvmm vmvm mmvvmvmm vvm vvmm vmvm mvmm mm', section: 'Fila inferior' },
    { id: 53, title: 'Práctica: v & m', text: 'trama vamos fama trompa primo fresado grama vivo algoritmo arqueologia marido mujer maritimo morado estafado', section: 'Fila inferior' },
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
].map(l => Object.freeze(l)));

/**
 * Distribución de las tres filas alfanuméricas del teclado en español (layout QWERTY/ISO).
 * @type {ReadonlyArray<ReadonlyArray<string>>}
 */
export const KEYBOARD_ROWS = Object.freeze([
    ['q','w','e','r','t','y','u','i','o','p'],
    ['a','s','d','f','g','h','j','k','l','ñ'],
    ['z','x','c','v','b','n','m',',','.','-']
].map(row => Object.freeze(row)));

/**
 * Determina el dedo biomecánicamente óptimo asignado a una tecla específica según la técnica dactilográfica oficial.
 * 
 * @param {string} char - Caracter a consultar.
 * @returns {FingerName|null} Identificador del dedo o null si no está mapeado.
 */
export const getFingerForKey = (char) => {
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

/**
 * Obtiene una lección por su ID identificador.
 * 
 * @param {number|string} id - Identificador de la lección.
 * @returns {TrainingLesson} La lección encontrada o la primera lección por defecto.
 */
export const getLessonById = (id) => {
    const numericId = Number(id);
    return TRAINING_LESSONS.find(l => l.id === numericId) || TRAINING_LESSONS[0];
};

/**
 * Obtiene el ID de la siguiente lección en la secuencia pedagógica.
 * 
 * @param {number|string} currentId - ID de la lección actual.
 * @returns {number|null} ID de la siguiente lección, o null si es la última lección.
 */
export const getNextLessonId = (currentId) => {
    const numericId = Number(currentId);
    const currentIndex = TRAINING_LESSONS.findIndex(l => l.id === numericId);
    if (currentIndex !== -1 && currentIndex + 1 < TRAINING_LESSONS.length) {
        return TRAINING_LESSONS[currentIndex + 1].id;
    }
    return null;
};

/**
 * Filtra las lecciones pertenecientes a una sección específica.
 * 
 * @param {string} section - Nombre de la sección (ej. 'Fila guía').
 * @returns {TrainingLesson[]}
 */
export const getLessonsBySection = (section) => {
    return TRAINING_LESSONS.filter(l => l.section === section);
};
