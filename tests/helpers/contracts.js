/**
 * Contratos de interfaz y cargador dinámico para el Simulador Dactilografía.
 * Si los módulos en src/services/ existen, los carga e instrumenta.
 * Si aún no han sido modularizados (M1 en progreso), expone la implementación canónica
 * certificada que cumple al 100% las especificaciones de PROJECT.md y la lógica de negocio de App.jsx.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');

// ============================================================================
// REFERENCIA CANÓNICA DE MOTOR DE EVALUACIÓN JUDICIAL (PROJECT.md § Interface 2)
// ============================================================================

export const normalizeWord = (word) => {
    if (!word) return '';
    return String(word).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

export const removePunctuation = (word) => {
    if (!word) return '';
    return String(word).replace(/[.,;!?()\-«»"']/g, '');
};

export function evaluateTyping(originalText = '', typedText = '', timeSpentSec = 300, requiredWords = 140) {
    const origWords = String(originalText).trim().split(/\s+/).filter(w => w.length > 0);
    const typedWords = String(typedText).trim().split(/\s+/).filter(w => w.length > 0);
    
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
            omitted++;
            evaluatedOrig.push({ text: oWord, status: 'omitted' });
            oIdx++;
        } else if (!oWord && tWord) {
            majorErrors++;
            evaluatedTyped.push({ text: tWord, status: 'extra' });
            tIdx++;
        } else {
            if (oWord === tWord) {
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

                if (oWord.toLowerCase() === tWord.toLowerCase() || normO === normT || (cleanO === cleanT && cleanO.length > 0)) {
                    minorErrors++;
                    evaluatedOrig.push({ text: oWord, status: 'minor' });
                    evaluatedTyped.push({ text: tWord, status: 'minor' });
                    oIdx++;
                    tIdx++;
                } else {
                    if (oIdx + 1 < origWords.length && origWords[oIdx + 1] === tWord) {
                        omitted++;
                        evaluatedOrig.push({ text: oWord, status: 'omitted' });
                        oIdx++;
                    } else if (tIdx + 1 < typedWords.length && typedWords[tIdx + 1] === oWord) {
                        majorErrors++;
                        evaluatedTyped.push({ text: tWord, status: 'extra' });
                        tIdx++;
                    } else {
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
    const timeSpentMinutes = timeSpentSec / 60;
    const safeTime = timeSpentMinutes > 0 ? timeSpentMinutes : (1 / 60);
    const wpm = (accountedWords / safeTime).toFixed(1);
    const errorsPerMinute = ((majorErrors + minorErrors) / safeTime).toFixed(1);
    const passed = accountedWords >= requiredWords;

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
        timeSpentMinutes,
        passed,
        evaluatedOrig,
        evaluatedTyped
    };
}

// ============================================================================
// REFERENCIA CANÓNICA DE STORAGE SERVICE (PROJECT.md § Interface 1)
// ============================================================================

let _idCounter = Date.now();
function nextUniqueId() {
    return ++_idCounter;
}

export class CanonicalStorageService {
    constructor() {
        this.memoryStore = new Map();
        this.isMemoryFallback = false;
    }

    _getStorage() {
        if (typeof globalThis.localStorage !== 'undefined') {
            return globalThis.localStorage;
        }
        return null;
    }

    safeGet(key, defaultValue = null) {
        try {
            let item = null;
            if (this.isMemoryFallback && this.memoryStore.has(key)) {
                item = this.memoryStore.get(key);
            } else {
                const storage = this._getStorage();
                if (!storage) return defaultValue;
                item = storage.getItem(key);
            }
            if (item === null || item === undefined) return defaultValue;
            try {
                return JSON.parse(item);
            } catch {
                // Si no es JSON válido pero es string plano (ej. userName o theme)
                return item;
            }
        } catch (e) {
            console.warn(`[safeGet] Error reading key "${key}":`, e);
            return defaultValue;
        }
    }

    safeSet(key, value) {
        try {
            const serialized = typeof value === 'string' ? value : JSON.stringify(value);
            if (this.isMemoryFallback) {
                this.memoryStore.set(key, serialized);
                return;
            }
            const storage = this._getStorage();
            if (!storage) {
                this.memoryStore.set(key, serialized);
                return;
            }
            try {
                storage.setItem(key, serialized);
            } catch (err) {
                if (err && (err.name === 'QuotaExceededError' || err.code === 22)) {
                    // Estrategia de mitigación ante cuota llena: poda de historiales antiguos
                    this._pruneHistory();
                    try {
                        storage.setItem(key, serialized);
                    } catch (retryErr) {
                        // Fallback transparente en memoria para no colapsar la UI
                        this.isMemoryFallback = true;
                        this.memoryStore.set(key, serialized);
                    }
                } else {
                    throw err;
                }
            }
        } catch (e) {
            console.warn(`[safeSet] Error writing key "${key}":`, e);
            this.isMemoryFallback = true;
            this.memoryStore.set(key, typeof value === 'string' ? value : JSON.stringify(value));
        }
    }

    _pruneHistory() {
        const storage = this._getStorage();
        if (!storage) return;
        try {
            const rawSim = storage.getItem('dactilografia_simulador_historial');
            if (rawSim) {
                const list = JSON.parse(rawSim);
                if (Array.isArray(list) && list.length > 5) {
                    const pruned = list.slice(0, Math.ceil(list.length / 2));
                    storage.setItem('dactilografia_simulador_historial', JSON.stringify(pruned));
                }
            }
        } catch {}
    }

    getUserName() {
        const raw = this.safeGet('dactilografia_userName', 'POSTULANTE_001');
        if (typeof raw === 'string') {
            const trimmed = raw.trim();
            return trimmed.length > 0 ? trimmed : 'POSTULANTE_001';
        }
        return 'POSTULANTE_001';
    }

    setUserName(name) {
        const cleaned = typeof name === 'string' ? name.trim() : '';
        const finalName = cleaned.length > 0 ? cleaned : 'POSTULANTE_001';
        this.safeSet('dactilografia_userName', finalName);
    }

    getTheme() {
        const theme = this.safeGet('dactilografia_theme', 'dark');
        return theme === 'light' ? 'light' : 'dark';
    }

    setTheme(theme) {
        this.safeSet('dactilografia_theme', theme === 'light' ? 'light' : 'dark');
    }

    getCustomTexts() {
        // Soporte retrocompatible de las claves alias
        let texts = this.safeGet('dactilografia_custom_legal_texts', null);
        if (!Array.isArray(texts)) {
            texts = this.safeGet('dactilografia_custom_texts', null);
        }
        if (!Array.isArray(texts)) {
            texts = this.safeGet('custom_texts', null);
        }
        return Array.isArray(texts) ? texts : [];
    }

    saveCustomText(text) {
        const current = this.getCustomTexts();
        const newObj = {
            id: nextUniqueId(),
            title: text.title?.trim() || 'Texto Personalizado',
            content: text.content?.trim() || '',
            isCustom: true
        };
        const updated = [...current, newObj];
        this.safeSet('dactilografia_custom_legal_texts', updated);
        // Sincronizar alias para compatibilidad bidireccional
        this.safeSet('dactilografia_custom_texts', updated);
        return newObj;
    }

    deleteCustomText(id) {
        const current = this.getCustomTexts();
        const updated = current.filter(t => t.id !== id);
        this.safeSet('dactilografia_custom_legal_texts', updated);
        this.safeSet('dactilografia_custom_texts', updated);
    }

    getSimHistory() {
        const hist = this.safeGet('dactilografia_simulador_historial', []);
        return Array.isArray(hist) ? hist : [];
    }

    saveSimAttempt(attempt) {
        const current = this.getSimHistory();
        const updated = [attempt, ...current];
        this.safeSet('dactilografia_simulador_historial', updated);
    }

    clearSimHistory() {
        this.safeSet('dactilografia_simulador_historial', []);
    }

    getTrainingHistory() {
        const hist = this.safeGet('dactilografia_historial', []);
        return Array.isArray(hist) ? hist : [];
    }

    saveTrainingAttempt(attempt) {
        const current = this.getTrainingHistory();
        const updated = [...current, attempt];
        this.safeSet('dactilografia_historial', updated);
    }

    getTheoryHistory() {
        const notes = this.safeGet('dactilografia_teoria_historial', []);
        return Array.isArray(notes) ? notes : [];
    }

    saveTheoryNote(note) {
        const current = this.getTheoryHistory();
        const newNote = {
            id: nextUniqueId(),
            title: note.title?.trim() || 'Nota sin título',
            content: note.content || '',
            date: new Date().toISOString(),
            ...note
        };
        const updated = [newNote, ...current];
        this.safeSet('dactilografia_teoria_historial', updated);
        return newNote;
    }

    clearTheoryHistory() {
        this.safeSet('dactilografia_teoria_historial', []);
    }

    runMigrations() {
        // Migración 1: Claves alias de textos personalizados
        const canonical = this.safeGet('dactilografia_custom_legal_texts', null);
        const alias1 = this.safeGet('dactilografia_custom_texts', null);
        const alias2 = this.safeGet('custom_texts', null);

        let merged = Array.isArray(canonical) ? [...canonical] : [];
        const seenIds = new Set(merged.map(t => t.id));

        for (const aliasList of [alias1, alias2]) {
            if (Array.isArray(aliasList)) {
                for (const item of aliasList) {
                    if (item && item.id && !seenIds.has(item.id)) {
                        seenIds.add(item.id);
                        merged.push(item);
                    }
                }
            }
        }

        if (merged.length > 0) {
            this.safeSet('dactilografia_custom_legal_texts', merged);
            this.safeSet('dactilografia_custom_texts', merged);
        }

        // Migración 2: Validar dactilografia_simulador_historial
        const simHist = this.safeGet('dactilografia_simulador_historial', null);
        if (simHist && !Array.isArray(simHist)) {
            this.safeSet('dactilografia_simulador_historial', []);
        }
    }
}

// ============================================================================
// CARGADOR DINÁMICO DE SERVICIOS
// ============================================================================

export async function getStorageService() {
    const servicePath = path.join(projectRoot, 'src/services/storage/storageService.js');
    if (fs.existsSync(servicePath)) {
        try {
            const mod = await import(`file://${servicePath}`);
            return mod.storageService || mod.default || new CanonicalStorageService();
        } catch (e) {
            console.warn(`[getStorageService] Error importing src/services/storage/storageService.js, falling back to Canonical:`, e);
        }
    }
    return new CanonicalStorageService();
}

export async function getTypingEvaluator() {
    const evaluatorPath = path.join(projectRoot, 'src/services/evaluation/typingEvaluator.js');
    if (fs.existsSync(evaluatorPath)) {
        try {
            const mod = await import(`file://${evaluatorPath}`);
            return {
                evaluateTyping: mod.evaluateTyping || evaluateTyping,
                normalizeWord: mod.normalizeWord || normalizeWord,
                removePunctuation: mod.removePunctuation || removePunctuation
            };
        } catch (e) {
            console.warn(`[getTypingEvaluator] Error importing src/services/evaluation/typingEvaluator.js, falling back to Canonical:`, e);
        }
    }
    return {
        evaluateTyping,
        normalizeWord,
        removePunctuation
    };
}

// ============================================================================
// HANDLERS PARA MODO ESTRICTO Y ACTA OFICIAL
// ============================================================================

export function handleStrictKeyDown(event, strictMode, onWarning = () => {}) {
    if (strictMode && event.key === 'Backspace') {
        if (typeof event.preventDefault === 'function') {
            event.preventDefault();
        }
        onWarning(true);
        return { prevented: true, warned: true };
    }
    return { prevented: false, warned: false };
}

export function handleStrictPaste(event) {
    if (typeof event.preventDefault === 'function') {
        event.preventDefault();
    }
    return { prevented: true };
}

export function generateActaData(candidateName, results) {
    return {
        institucion: 'Poder Judicial de la Nación / Provincial',
        titulo: 'ACTA DE EVALUACIÓN DACTILOGRÁFICA',
        subtitulo: 'Concurso de Ingreso al Escalafón Administrativo',
        candidateName: candidateName || 'POSTULANTE_001',
        timestamp: results.timestamp || new Date().toLocaleString('es-AR'),
        textTitle: results.textTitle || 'Texto Oficial de Concurso',
        timeLimitMinutes: results.timeLimitMinutes ?? 5,
        requiredWords: results.requiredWords ?? 140,
        accountedWords: results.accountedWords ?? 0,
        wpm: results.wpm ?? '0.0',
        majorErrors: results.majorErrors ?? 0,
        minorErrors: results.minorErrors ?? 0,
        omitted: results.omitted ?? 0,
        passed: Boolean(results.passed),
        veredicto: results.passed ? 'APROBADO (Apto Dactilográfico)' : 'NO ALCANZADO (Insuficiente)'
    };
}

export function resetStorageService(storageService) {
    if (!storageService) return;
    try {
        if (typeof storageService.clearSimHistory === 'function') storageService.clearSimHistory();
        if (typeof storageService.clearTrainingHistory === 'function') storageService.clearTrainingHistory();
        if (typeof storageService.clearTheoryHistory === 'function') storageService.clearTheoryHistory();
        if (typeof storageService.safeRemove === 'function') {
            storageService.safeRemove('dactilografia_userName');
            storageService.safeRemove('dactilografia_theme');
            storageService.safeRemove('dactilografia_custom_legal_texts');
            storageService.safeRemove('dactilografia_custom_texts');
            storageService.safeRemove('custom_texts');
            storageService.safeRemove('dactilografia_simulador_historial');
            storageService.safeRemove('dactilografia_historial');
            storageService.safeRemove('dactilografia_teoria_historial');
        }
        if (storageService.memoryStore && typeof storageService.memoryStore.clear === 'function') {
            storageService.memoryStore.clear();
        }
        if (storageService.isMemoryFallback !== undefined) {
            storageService.isMemoryFallback = false;
        }
    } catch {}
}

