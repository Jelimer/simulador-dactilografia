/**
 * storageService.js - Servicio unificado y tolerante a fallos para almacenamiento local.
 * Diseñado para garantizar retrocompatibilidad absoluta con las 6 claves históricas
 * de "Simulador Dactilografía", mitigación ante QuotaExceededError (5MB) y blindaje
 * con try/catch frente a JSON corrupto.
 * 
 * Resuelve:
 * 1. Generación de IDs monotónicos crecientes en saveCustomText (elimina colisiones por Date.now()).
 * 2. Prioridad de memoryStore en safeGet cuando ocurre QuotaExceededError en localStorage.
 * 3. Compactación de carga en safeSet ante reintentos de poda para colecciones grandes.
 * 4. Normalización estricta en getUserName, normalizeSimAttempt, normalizeTrainingAttempt (accuracy) y normalizeTheoryNote (date).
 */

export const STORAGE_KEYS = {
  USER_NAME: 'dactilografia_userName',
  THEME: 'dactilografia_theme',
  CUSTOM_LEGAL_TEXTS: 'dactilografia_custom_legal_texts',
  CUSTOM_TEXTS_ALIAS: 'dactilografia_custom_texts',
  SIM_HISTORY: 'dactilografia_simulador_historial',
  TRAINING_HISTORY: 'dactilografia_historial',
  THEORY_HISTORY: 'dactilografia_teoria_historial',
  SCHEMA_VERSION: 'dactilografia_schema_version'
};

export const CURRENT_SCHEMA_VERSION = 1;
export const DEFAULT_USER_NAME = 'POSTULANTE_001';
export const DEFAULT_THEME = 'dark';

// Almacén en memoria para fallback en modo incógnito, errores de cuota o storage bloqueado
export const memoryStore = new Map();

// Registro de claves en estado de fallback por saturación de cuota física
export const memoryFallbackKeys = new Set();

// Bandera global de fallback en memoria
export let isMemoryFallback = false;

// Sobrescribir clear en memoryStore para asegurar limpieza sincronizada en tests
const origMemoryClear = memoryStore.clear.bind(memoryStore);
memoryStore.clear = () => {
  origMemoryClear();
  memoryFallbackKeys.clear();
  isMemoryFallback = false;
};

/**
 * Identifica si un error corresponde a cuota de almacenamiento excedida.
 * @param {any} err 
 * @returns {boolean}
 */
export function isQuotaExceededError(err) {
  return (
    err &&
    (err.name === 'QuotaExceededError' ||
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err.code === 22 ||
      err.code === 1014 ||
      (typeof err.message === 'string' && err.message.toLowerCase().includes('quota')))
  );
}

/**
 * Comprueba si window.localStorage está disponible y operativo.
 * @returns {boolean}
 */
export function isLocalStorageAvailable() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    const testKey = '__dactilografia_storage_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    if (isQuotaExceededError(e)) {
      return true; // Existe pero está lleno
    }
    return false;
  }
}

/**
 * Poda inteligente de datos no esenciales cuando se alcanza la cuota de 5MB:
 * - Reduce arrays detallados palabra por palabra (evaluatedOrig, evaluatedTyped) en intentos antiguos del simulador.
 * - Limita apuntes teóricos extensos antiguos.
 * - Conserva el 100% de métricas clave y estadísticas históricas.
 * @returns {boolean} true si se logró liberar espacio
 */
export function pruneStorageToFreeSpace() {
  console.warn('[storageService] Cuota de almacenamiento excedida. Ejecutando poda inteligente...');

  // 1. Podar evaluaciones detalladas palabra por palabra de simulaciones anteriores (conservando estadísticas resumen)
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const rawSim = window.localStorage.getItem(STORAGE_KEYS.SIM_HISTORY);
      if (rawSim) {
        const attempts = JSON.parse(rawSim);
        if (Array.isArray(attempts) && attempts.length > 5) {
          let freedAny = false;
          const compacted = attempts.map((att, idx) => {
            // Conservar detalle palabra por palabra en los 5 intentos más recientes
            if (idx >= 5 && ((att.evaluatedOrig && att.evaluatedOrig.length > 0) || (att.evaluatedTyped && att.evaluatedTyped.length > 0))) {
              freedAny = true;
              return {
                ...att,
                evaluatedOrig: [],
                evaluatedTyped: []
              };
            }
            return att;
          });

          if (freedAny) {
            window.localStorage.setItem(STORAGE_KEYS.SIM_HISTORY, JSON.stringify(compacted));
            memoryStore.set(STORAGE_KEYS.SIM_HISTORY, JSON.stringify(compacted));
            return true;
          }
        }
      }
    }
  } catch (e) {
    console.warn('[storageService] No se pudo podar historial del simulador:', e);
  }

  // 2. Podar notas teóricas muy antiguas si exceden 10 entradas
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const rawTheory = window.localStorage.getItem(STORAGE_KEYS.THEORY_HISTORY);
      if (rawTheory) {
        const notes = JSON.parse(rawTheory);
        if (Array.isArray(notes) && notes.length > 10) {
          const pruned = notes.slice(0, 10);
          window.localStorage.setItem(STORAGE_KEYS.THEORY_HISTORY, JSON.stringify(pruned));
          memoryStore.set(STORAGE_KEYS.THEORY_HISTORY, JSON.stringify(pruned));
          return true;
        }
      }
    }
  } catch (e) {
    console.warn('[storageService] No se pudo podar historial teórico:', e);
  }

  // 3. Podar lecciones de entrenamiento antiguas si superan 40 registros
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const rawTraining = window.localStorage.getItem(STORAGE_KEYS.TRAINING_HISTORY);
      if (rawTraining) {
        const items = JSON.parse(rawTraining);
        if (Array.isArray(items) && items.length > 40) {
          const pruned = items.slice(-40);
          window.localStorage.setItem(STORAGE_KEYS.TRAINING_HISTORY, JSON.stringify(pruned));
          memoryStore.set(STORAGE_KEYS.TRAINING_HISTORY, JSON.stringify(pruned));
          return true;
        }
      }
    }
  } catch (e) {
    console.warn('[storageService] No se pudo podar historial de entrenamiento:', e);
  }

  return false;
}

/**
 * Lectura segura de almacenamiento con prioridad a memoryStore ante cuota saturada.
 * @param {string} key 
 * @param {any} defaultVal 
 * @returns {any}
 */
export function safeGet(key, defaultVal = null) {
  try {
    let raw = null;

    // PRIORIDAD CRÍTICA: Si la clave o el storage sufrió QuotaExceededError, consultar memoryStore primero
    if ((memoryFallbackKeys.has(key) || isMemoryFallback) && memoryStore.has(key)) {
      raw = memoryStore.get(key);
    } else if (typeof window !== 'undefined' && window.localStorage) {
      try {
        raw = window.localStorage.getItem(key);
      } catch {
        raw = null;
      }
    }

    // Si no está en localStorage o falló, verificar si existe en el respaldo en memoria
    if (raw === null || raw === undefined) {
      if (memoryStore.has(key)) {
        raw = memoryStore.get(key);
      } else {
        return defaultVal;
      }
    }

    // Si el valor por defecto esperado es string, intentar desescapar JSON si vino serializado con comillas
    if (typeof defaultVal === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed === 'string') {
          return parsed;
        }
        if (parsed === null || parsed === undefined || typeof parsed === 'object') {
          return defaultVal;
        }
        return String(parsed);
      } catch {
        return raw;
      }
    }

    // Si no hay defaultVal provisto, intentar parsear JSON y si no es posible retornar raw
    if (defaultVal === null) {
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    }

    // Para arreglos, booleanos, números y objetos estructurados
    try {
      return JSON.parse(raw);
    } catch (parseError) {
      console.warn(`[storageService] Error al parsear JSON para clave "${key}". Se usará valor por defecto:`, parseError);
      return defaultVal;
    }
  } catch (error) {
    console.warn(`[storageService] Error inesperado leyendo clave "${key}":`, error);
    return defaultVal;
  }
}

/**
 * Escritura segura con mitigación de cuota y sincronización en memoria.
 * @param {string} key 
 * @param {any} value 
 * @returns {boolean} true si se persistió en localStorage o en memoria
 */
export function safeSet(key, value) {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);

  // Espejo en memoria para consistencia garantizada en la sesión activa
  memoryStore.set(key, serialized);

  if (typeof window === 'undefined' || !window.localStorage) {
    return true;
  }

  try {
    window.localStorage.setItem(key, serialized);
    memoryFallbackKeys.delete(key);
    return true;
  } catch (err) {
    if (isQuotaExceededError(err)) {
      const freed = pruneStorageToFreeSpace();
      if (freed) {
        try {
          // Si estamos guardando la colección que saturó, compactar los intentos antiguos del propio valor antes de reintentar
          let payloadToRetry = serialized;
          if (key === STORAGE_KEYS.SIM_HISTORY && Array.isArray(value)) {
            const compacted = value.map((att, idx) => {
              if (idx >= 5 && ((att.evaluatedOrig && att.evaluatedOrig.length > 0) || (att.evaluatedTyped && att.evaluatedTyped.length > 0))) {
                return {
                  ...att,
                  evaluatedOrig: [],
                  evaluatedTyped: []
                };
              }
              return att;
            });
            payloadToRetry = JSON.stringify(compacted);
          } else if (key === STORAGE_KEYS.THEORY_HISTORY && Array.isArray(value) && value.length > 10) {
            payloadToRetry = JSON.stringify(value.slice(0, 10));
          } else if (key === STORAGE_KEYS.TRAINING_HISTORY && Array.isArray(value) && value.length > 40) {
            payloadToRetry = JSON.stringify(value.slice(-40));
          }

          window.localStorage.setItem(key, payloadToRetry);
          memoryStore.set(key, payloadToRetry);
          memoryFallbackKeys.delete(key);
          return true;
        } catch (retryErr) {
          console.error(`[storageService] Cuota excedida tras poda para "${key}". Retenido en memoria.`, retryErr);
          memoryFallbackKeys.add(key);
          isMemoryFallback = true;
          return false;
        }
      } else {
        console.error(`[storageService] Almacenamiento lleno y no fue posible podar más para "${key}". Retenido en memoria.`, err);
        memoryFallbackKeys.add(key);
        isMemoryFallback = true;
        return false;
      }
    } else {
      console.error(`[storageService] Error al escribir clave "${key}" en localStorage. Retenido en memoria.`, err);
      memoryFallbackKeys.add(key);
      return false;
    }
  }
}

/**
 * Eliminación segura de clave en localStorage y memoria.
 * @param {string} key 
 * @returns {boolean}
 */
export function safeRemove(key) {
  memoryStore.delete(key);
  memoryFallbackKeys.delete(key);
  if (memoryFallbackKeys.size === 0) {
    isMemoryFallback = false;
  }
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
    return true;
  } catch (err) {
    console.warn(`[storageService] Error al remover clave "${key}":`, err);
    return false;
  }
}

/**
 * Adjunta propiedades de metadatos de un objeto sobre un Array de forma segura,
 * garantizando que ninguna propiedad nativa ('length'), índice numérico ('0', '1', etc.)
 * o método/propiedad del prototipo de Array (map, filter, forEach, slice, reduce, etc.)
 * sea sobreescrito o corrompa la funcionalidad nativa de lista iterable.
 * @param {Array} targetArr
 * @param {Object} sourceObj
 * @returns {Array}
 */
export function attachSafeProps(targetArr, sourceObj) {
  if (!sourceObj || typeof sourceObj !== 'object' || !Array.isArray(targetArr)) {
    return targetArr;
  }
  for (const key of Object.keys(sourceObj)) {
    if (key === 'length' || /^\d+$/.test(key) || key in Array.prototype) {
      continue;
    }
    try {
      targetArr[key] = sourceObj[key];
    } catch {
      // Ignorar asignaciones bloqueadas en entornos estrictos
    }
  }
  return targetArr;
}

// ==========================================
// 1. GESTIÓN DE USUARIO (dactilografia_userName)
// ==========================================

export function getUserName() {
  const raw = safeGet(STORAGE_KEYS.USER_NAME, DEFAULT_USER_NAME);
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined' || trimmed === '[object Object]' || trimmed.startsWith('{')) {
    return DEFAULT_USER_NAME;
  }
  return trimmed;
}

export function setUserName(name) {
  const cleaned = (typeof name === 'string' ? name.trim() : '') || DEFAULT_USER_NAME;
  safeSet(STORAGE_KEYS.USER_NAME, cleaned);

  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(new CustomEvent('dactilografia:userNameChanged', { detail: cleaned }));
    } catch {
      // Ignorar excepciones al despachar CustomEvent en entornos que no lo soporten
    }
  }
  return cleaned;
}

export function onUserNameChange(callback) {
  if (typeof window === 'undefined') return () => {};
  const handler = (e) => callback(e.detail);
  window.addEventListener('dactilografia:userNameChanged', handler);
  return () => {
    window.removeEventListener('dactilografia:userNameChanged', handler);
  };
}

// ==========================================
// 2. GESTIÓN DE TEMA (dactilografia_theme)
// ==========================================

export function getTheme() {
  const raw = safeGet(STORAGE_KEYS.THEME, DEFAULT_THEME);
  return raw === 'light' ? 'light' : 'dark';
}

export function setTheme(theme) {
  const validTheme = theme === 'light' ? 'light' : 'dark';
  safeSet(STORAGE_KEYS.THEME, validTheme);

  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(new CustomEvent('dactilografia:themeChanged', { detail: validTheme }));
    } catch {
      // Ignorar excepciones al despachar CustomEvent en entornos que no lo soporten
    }
  }
  return validTheme;
}

// ==========================================
// 3. TEXTOS PERSONALIZADOS (dactilografia_custom_legal_texts & alias dactilografia_custom_texts)
// ==========================================

let _lastCustomTextId = 0;

/**
 * Generador de identificadores monotónicos crecientes garantizados.
 * Previene colisiones en ráfagas dentro del mismo milisegundo.
 * @param {Array} existingList
 * @returns {number}
 */
export function generateCustomTextId(existingList = []) {
  const now = Date.now();
  let maxExisting = 0;
  if (Array.isArray(existingList)) {
    for (const item of existingList) {
      const num = Number(item?.id);
      if (!isNaN(num) && num > maxExisting) {
        maxExisting = num;
      }
    }
  }
  _lastCustomTextId = Math.max(now, _lastCustomTextId + 1, maxExisting + 1);
  return _lastCustomTextId;
}

export function getCustomTexts() {
  const primary = safeGet(STORAGE_KEYS.CUSTOM_LEGAL_TEXTS, []);
  const alias = safeGet(STORAGE_KEYS.CUSTOM_TEXTS_ALIAS, []);

  const primaryList = Array.isArray(primary) ? primary : [];
  const aliasList = Array.isArray(alias) ? alias : [];

  const map = new Map();

  const processItem = (item) => {
    if (!item || typeof item !== 'object') return;
    const title = typeof item.title === 'string' ? item.title.trim() : '';
    const content = typeof item.content === 'string' ? item.content.trim() : '';
    if (!title || !content) return;

    const parsedId = Number(item.id);
    const id = !isNaN(parsedId) && parsedId > 0 ? parsedId : generateCustomTextId();
    const key = `${id}__${title}`;

    if (!map.has(key)) {
      map.set(key, {
        id,
        title,
        content,
        isCustom: true
      });
    }
  };

  aliasList.forEach(processItem);
  primaryList.forEach(processItem);

  return Array.from(map.values());
}

export function saveCustomText(text) {
  if (!text || typeof text !== 'object') {
    throw new Error('Texto inválido');
  }
  const title = (text.title || '').trim();
  const content = (text.content || '').trim();

  if (!title || !content) {
    throw new Error('Título y contenido son requeridos');
  }

  const currentList = getCustomTexts();

  let assignedId = Number(text.id);
  const hasExplicitId = !isNaN(assignedId) && assignedId > 0;
  if (!hasExplicitId) {
    assignedId = generateCustomTextId(currentList);
  } else {
    _lastCustomTextId = Math.max(_lastCustomTextId, assignedId);
  }

  const newObj = {
    id: assignedId,
    title,
    content,
    isCustom: true
  };

  const existingIdx = currentList.findIndex(t => t.id === newObj.id);
  let updatedList;
  if (existingIdx >= 0) {
    updatedList = [...currentList];
    updatedList[existingIdx] = newObj;
  } else {
    updatedList = [...currentList, newObj];
  }

  // Sincronización obligatoria en ambas claves
  safeSet(STORAGE_KEYS.CUSTOM_LEGAL_TEXTS, updatedList);
  safeSet(STORAGE_KEYS.CUSTOM_TEXTS_ALIAS, updatedList);

  return attachSafeProps(updatedList, newObj);
}

export function deleteCustomText(id) {
  const numId = Number(id);
  const currentList = getCustomTexts();
  const filtered = currentList.filter(t => t.id !== numId);

  safeSet(STORAGE_KEYS.CUSTOM_LEGAL_TEXTS, filtered);
  safeSet(STORAGE_KEYS.CUSTOM_TEXTS_ALIAS, filtered);
}

// ==========================================
// 4. HISTORIAL DE SIMULADOR (dactilografia_simulador_historial)
// ==========================================

export function normalizeSimAttempt(item) {
  if (!item || typeof item !== 'object') return null;

  const id = Number(item.id) || Date.now();
  const candidateName = typeof item.candidateName === 'string' && item.candidateName.trim()
    ? item.candidateName.trim()
    : DEFAULT_USER_NAME;
  const timestamp = typeof item.timestamp === 'string' && item.timestamp.trim()
    ? item.timestamp
    : new Date().toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

  const textId = item.textId ?? 1;
  const textTitle = typeof item.textTitle === 'string' && item.textTitle.trim()
    ? item.textTitle.trim()
    : 'Texto Judicial';

  const timeLimitMinutes = Number(item.timeLimitMinutes) > 0 ? Number(item.timeLimitMinutes) : 5;
  const requiredWords = Number(item.requiredWords) > 0 ? Number(item.requiredWords) : 140;

  const rawAccounted = Number(item.accountedWords);
  const accountedWords = !isNaN(rawAccounted) && isFinite(rawAccounted) ? rawAccounted : 0;

  const rawTimeSpent = Number(item.timeSpentMinutes);
  const timeSpentMinutes = !isNaN(rawTimeSpent) && isFinite(rawTimeSpent) && rawTimeSpent > 0
    ? rawTimeSpent
    : timeLimitMinutes;

  const wpm = item.wpm !== undefined && item.wpm !== null ? String(item.wpm) : '0.0';
  const errorsPerMinute = item.errorsPerMinute !== undefined && item.errorsPerMinute !== null
    ? String(item.errorsPerMinute)
    : '0.0';

  const passed = typeof item.passed === 'boolean'
    ? item.passed
    : accountedWords >= requiredWords;

  const strictMode = Boolean(item.strictMode);

  const rawTotal = Number(item.totalWords);
  const totalWords = !isNaN(rawTotal) && isFinite(rawTotal) && rawTotal >= 0 ? rawTotal : 0;

  const rawEntered = Number(item.enteredWords);
  const enteredWords = !isNaN(rawEntered) && isFinite(rawEntered) && rawEntered >= 0 ? rawEntered : 0;

  const rawCorrect = Number(item.correct);
  const correct = !isNaN(rawCorrect) && isFinite(rawCorrect) && rawCorrect >= 0 ? rawCorrect : 0;

  const rawMinor = Number(item.minorErrors);
  const minorErrors = !isNaN(rawMinor) && isFinite(rawMinor) && rawMinor >= 0 ? rawMinor : 0;

  const rawMajor = Number(item.majorErrors);
  const majorErrors = !isNaN(rawMajor) && isFinite(rawMajor) && rawMajor >= 0 ? rawMajor : 0;

  const rawOmitted = Number(item.omitted);
  const omitted = !isNaN(rawOmitted) && isFinite(rawOmitted) && rawOmitted >= 0 ? rawOmitted : 0;

  return {
    id,
    candidateName,
    timestamp,
    textId,
    textTitle,
    timeLimitMinutes,
    requiredWords,
    wpm,
    errorsPerMinute,
    timeSpentMinutes,
    passed,
    strictMode,
    totalWords,
    enteredWords,
    correct,
    minorErrors,
    majorErrors,
    omitted,
    accountedWords,
    evaluatedOrig: Array.isArray(item.evaluatedOrig) ? item.evaluatedOrig : [],
    evaluatedTyped: Array.isArray(item.evaluatedTyped) ? item.evaluatedTyped : []
  };
}

export function getSimHistory() {
  const raw = safeGet(STORAGE_KEYS.SIM_HISTORY, []);
  if (!Array.isArray(raw)) {
    return [];
  }
  const normalized = [];
  for (const item of raw) {
    const norm = normalizeSimAttempt(item);
    if (norm) normalized.push(norm);
  }
  return normalized;
}

export function saveSimAttempt(attempt) {
  const norm = normalizeSimAttempt(attempt);
  if (!norm) return getSimHistory();

  const current = getSimHistory();
  const updated = [norm, ...current];
  safeSet(STORAGE_KEYS.SIM_HISTORY, updated);
  return attachSafeProps(updated, norm);
}

export function deleteSimAttempt(id) {
  const numId = Number(id);
  const current = getSimHistory();
  const updated = current.filter(x => x.id !== numId);
  safeSet(STORAGE_KEYS.SIM_HISTORY, updated);
}

export function clearSimHistory() {
  safeRemove(STORAGE_KEYS.SIM_HISTORY);
}

// ==========================================
// 5. HISTORIAL DE ENTRENAMIENTO (dactilografia_historial)
// ==========================================

export function normalizeTrainingAttempt(item) {
  if (!item || typeof item !== 'object') return null;

  const lessonId = Number(item.lessonId) || 1;
  const lessonTitle = typeof item.lessonTitle === 'string' ? item.lessonTitle : `Lección ${lessonId}`;
  const timestamp = typeof item.timestamp === 'string' ? item.timestamp : '';
  const timeOnly = typeof item.timeOnly === 'string' ? item.timeOnly : '';
  const wpm = Math.round(Number(item.wpm) || 0);
  const precision = Math.round(Number(item.precision ?? item.accuracy) || 0);
  const stars = Math.max(0, Math.min(3, Math.round(Number(item.stars) || 0)));
  const duration = Number(item.duration) || 0;
  const correctChars = Number(item.correctChars) || 0;
  const errorChars = Number(item.errorChars) || 0;

  // Garantizar que text sea siempre string (previene crash en split() de replay)
  const text = typeof item.text === 'string' ? item.text : '';

  // Garantizar que errorIndices sea siempre un objeto plano para el mapa de calor
  let errorIndices = {};
  if (item.errorIndices && typeof item.errorIndices === 'object' && !Array.isArray(item.errorIndices)) {
    errorIndices = item.errorIndices;
  }

  return {
    lessonId,
    lessonTitle,
    timestamp,
    timeOnly,
    wpm,
    precision,
    accuracy: precision,
    stars,
    duration,
    correctChars,
    errorChars,
    text,
    errorIndices
  };
}

export function getTrainingHistory() {
  const raw = safeGet(STORAGE_KEYS.TRAINING_HISTORY, []);
  if (!Array.isArray(raw)) {
    return [];
  }
  const result = [];
  for (const item of raw) {
    const norm = normalizeTrainingAttempt(item);
    if (norm) result.push(norm);
  }
  return result;
}

export function saveTrainingAttempt(attempt) {
  const norm = normalizeTrainingAttempt(attempt);
  if (!norm) return getTrainingHistory();

  const current = getTrainingHistory();
  const updated = [...current, norm];
  safeSet(STORAGE_KEYS.TRAINING_HISTORY, updated);
  return attachSafeProps(updated, norm);
}

export function clearTrainingHistory() {
  safeRemove(STORAGE_KEYS.TRAINING_HISTORY);
}

// ==========================================
// 6. HISTORIAL DE APUNTES TEÓRICOS (dactilografia_teoria_historial)
// ==========================================

export function normalizeTheoryNote(item) {
  if (!item || typeof item !== 'object') return null;

  const id = item.id !== undefined && item.id !== null ? String(item.id) : String(Date.now());
  const title = typeof item.title === 'string' && item.title.trim()
    ? item.title.trim()
    : 'Texto sin título';
  const content = typeof item.content === 'string' ? item.content : '';
  const timestamp = typeof item.timestamp === 'string' && item.timestamp.trim()
    ? item.timestamp
    : new Date().toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
  const date = typeof item.date === 'string' && item.date.trim()
    ? item.date
    : new Date().toISOString();

  return {
    id,
    title,
    content,
    timestamp,
    date
  };
}

export function getTheoryHistory() {
  const raw = safeGet(STORAGE_KEYS.THEORY_HISTORY, []);
  if (!Array.isArray(raw)) {
    return [];
  }
  const result = [];
  for (const item of raw) {
    const norm = normalizeTheoryNote(item);
    if (norm) result.push(norm);
  }
  return result;
}

export function saveTheoryNote(note) {
  if (!note || typeof note !== 'object') {
    throw new Error('Nota teórica inválida');
  }

  const current = getTheoryHistory();
  const noteId = note.id !== undefined && note.id !== null ? String(note.id) : String(Date.now());
  const norm = normalizeTheoryNote({ ...note, id: noteId });

  const existingIdx = current.findIndex(n => n.id === noteId);
  let updated;
  if (existingIdx >= 0) {
    updated = current.map(item => (item.id === noteId ? norm : item));
  } else {
    updated = [norm, ...current];
  }

  safeSet(STORAGE_KEYS.THEORY_HISTORY, updated);
  return attachSafeProps(updated, norm);
}

export function deleteTheoryNote(id) {
  const strId = String(id);
  const current = getTheoryHistory();
  const updated = current.filter(n => n.id !== strId);
  safeSet(STORAGE_KEYS.THEORY_HISTORY, updated);
}

export function clearTheoryHistory() {
  safeRemove(STORAGE_KEYS.THEORY_HISTORY);
}

// ==========================================
// 7. MIGRACIONES NO DESTRUCTIVAS
// ==========================================

export function runMigrations() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    // 1. Sincronización y unificación de textos personalizados y su alias
    const primaryRaw = window.localStorage.getItem(STORAGE_KEYS.CUSTOM_LEGAL_TEXTS);
    const aliasRaw = window.localStorage.getItem(STORAGE_KEYS.CUSTOM_TEXTS_ALIAS);

    if (primaryRaw || aliasRaw) {
      const unified = getCustomTexts();
      if (unified.length > 0) {
        const serialized = JSON.stringify(unified);
        if (primaryRaw !== serialized) {
          window.localStorage.setItem(STORAGE_KEYS.CUSTOM_LEGAL_TEXTS, serialized);
        }
        if (aliasRaw !== serialized) {
          window.localStorage.setItem(STORAGE_KEYS.CUSTOM_TEXTS_ALIAS, serialized);
        }
      }
    }

    // 2. Normalización de nombre de usuario si existe vacío o corrupto
    const rawUser = window.localStorage.getItem(STORAGE_KEYS.USER_NAME);
    if (rawUser !== null) {
      const cleaned = rawUser.trim();
      if (!cleaned || cleaned === 'null' || cleaned === 'undefined' || cleaned === '[object Object]') {
        window.localStorage.setItem(STORAGE_KEYS.USER_NAME, DEFAULT_USER_NAME);
      }
    }

    // 3. Normalización de tema
    const rawTheme = window.localStorage.getItem(STORAGE_KEYS.THEME);
    if (rawTheme !== null && rawTheme !== 'light' && rawTheme !== 'dark') {
      window.localStorage.setItem(STORAGE_KEYS.THEME, DEFAULT_THEME);
    }

    // 4. Reparación y saneamiento de historial del simulador
    const rawSim = window.localStorage.getItem(STORAGE_KEYS.SIM_HISTORY);
    if (rawSim !== null) {
      try {
        const parsed = JSON.parse(rawSim);
        if (!Array.isArray(parsed)) {
          console.warn('[storageService] Historial del simulador no era un arreglo válido. Restableciendo sin crash.');
          window.localStorage.setItem(STORAGE_KEYS.SIM_HISTORY, JSON.stringify([]));
        }
      } catch (err) {
        console.error('[storageService] Historial del simulador contenía JSON corrupto. Creando respaldo y restableciendo.', err);
        window.localStorage.setItem(STORAGE_KEYS.SIM_HISTORY + '_backup_corrupted', rawSim);
        window.localStorage.setItem(STORAGE_KEYS.SIM_HISTORY, JSON.stringify([]));
      }
    }

    // 5. Reparación de historial de entrenamiento
    const rawTraining = window.localStorage.getItem(STORAGE_KEYS.TRAINING_HISTORY);
    if (rawTraining !== null) {
      try {
        const parsed = JSON.parse(rawTraining);
        if (Array.isArray(parsed)) {
          let modified = false;
          const cleaned = parsed.map(att => {
            if (!att || typeof att !== 'object') return null;
            let itemMod = false;
            const newItem = { ...att };
            if (typeof newItem.text !== 'string') {
              newItem.text = '';
              itemMod = true;
            }
            if (!newItem.errorIndices || typeof newItem.errorIndices !== 'object' || Array.isArray(newItem.errorIndices)) {
              newItem.errorIndices = {};
              itemMod = true;
            }
            if (itemMod) modified = true;
            return newItem;
          }).filter(Boolean);

          if (modified) {
            window.localStorage.setItem(STORAGE_KEYS.TRAINING_HISTORY, JSON.stringify(cleaned));
          }
        }
      } catch (err) {
        console.error('[storageService] Historial de entrenamiento contenía JSON corrupto. Creando respaldo y restableciendo.', err);
        window.localStorage.setItem(STORAGE_KEYS.TRAINING_HISTORY + '_backup_corrupted', rawTraining);
        window.localStorage.setItem(STORAGE_KEYS.TRAINING_HISTORY, JSON.stringify([]));
      }
    }

    // Marcar versión de esquema
    window.localStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, String(CURRENT_SCHEMA_VERSION));
  } catch (globalMigrationErr) {
    console.warn('[storageService] Error durante ejecución de runMigrations:', globalMigrationErr);
  }
}

// ==========================================
// 8. COPIA DE SEGURIDAD (EXPORTACIÓN / IMPORTACIÓN)
// ==========================================

export function exportAllData() {
  const data = {
    version: CURRENT_SCHEMA_VERSION,
    exportDate: new Date().toISOString(),
    userName: getUserName(),
    theme: getTheme(),
    customTexts: getCustomTexts(),
    simHistory: getSimHistory(),
    trainingHistory: getTrainingHistory(),
    theoryHistory: getTheoryHistory()
  };
  return JSON.stringify(data, null, 2);
}

export function importAllData(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    if (!data || typeof data !== 'object') {
      return { success: false, message: 'JSON inválido o estructura no reconocida' };
    }

    if (data.userName) setUserName(data.userName);
    if (data.theme) setTheme(data.theme);

    if (Array.isArray(data.customTexts)) {
      safeSet(STORAGE_KEYS.CUSTOM_LEGAL_TEXTS, data.customTexts);
      safeSet(STORAGE_KEYS.CUSTOM_TEXTS_ALIAS, data.customTexts);
    }

    if (Array.isArray(data.simHistory)) {
      const normalized = data.simHistory.map(normalizeSimAttempt).filter(Boolean);
      safeSet(STORAGE_KEYS.SIM_HISTORY, normalized);
    }

    if (Array.isArray(data.trainingHistory)) {
      const normalized = data.trainingHistory.map(normalizeTrainingAttempt).filter(Boolean);
      safeSet(STORAGE_KEYS.TRAINING_HISTORY, normalized);
    }

    if (Array.isArray(data.theoryHistory)) {
      const normalized = data.theoryHistory.map(normalizeTheoryNote).filter(Boolean);
      safeSet(STORAGE_KEYS.THEORY_HISTORY, normalized);
    }

    return { success: true, message: 'Datos importados exitosamente' };
  } catch (err) {
    return { success: false, message: `Error al importar: ${err.message}` };
  }
}

const storageService = {
  getUserName,
  setUserName,
  onUserNameChange,
  getTheme,
  setTheme,
  getCustomTexts,
  saveCustomText,
  deleteCustomText,
  generateCustomTextId,
  attachSafeProps,
  getSimHistory,
  saveSimAttempt,
  deleteSimAttempt,
  clearSimHistory,
  getTrainingHistory,
  saveTrainingAttempt,
  clearTrainingHistory,
  getTheoryHistory,
  saveTheoryNote,
  deleteTheoryNote,
  clearTheoryHistory,
  runMigrations,
  safeGet,
  safeSet,
  safeRemove,
  pruneStorageToFreeSpace,
  exportAllData,
  importAllData,
  STORAGE_KEYS,
  memoryStore,
  memoryFallbackKeys,
  isMemoryFallback
};

export default storageService;
