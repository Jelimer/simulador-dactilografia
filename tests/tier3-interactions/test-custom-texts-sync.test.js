/**
 * Tier 3 - Interacciones Cruzadas: Persistencia Cruzada y Unificación de Textos Personalizados
 * Verifica la compatibilidad bidireccional entre la clave canónica dactilografia_custom_legal_texts
 * y los alias históricos dactilografia_custom_texts y custom_texts, sin pérdida de datos ni duplicación.
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupTestStorage } from '../helpers/mockStorage.js';
import { getStorageService, evaluateTyping, resetStorageService } from '../helpers/contracts.js';

describe('Tier 3: Persistencia Cruzada de Textos Personalizados (Alias y Migración)', () => {
    let mockStorage;
    let storageService;

    beforeEach(async () => {
        mockStorage = setupTestStorage();
        storageService = await getStorageService();
        resetStorageService(storageService);
    });

    afterEach(() => {
        if (mockStorage) {
            mockStorage.uninstall();
        }
    });

    test('1. Textos almacenados en clave legacy dactilografia_custom_texts son leídos automáticamente', () => {
        const legacyTexts = [
            { id: 101, title: 'Fallo Histórico 2024', content: 'Contenido del fallo...', isCustom: true }
        ];
        mockStorage.setItem('dactilografia_custom_texts', JSON.stringify(legacyTexts));

        const result = storageService.getCustomTexts();
        assert.equal(result.length, 1);
        assert.equal(result[0].title, 'Fallo Histórico 2024');
    });

    test('2. Guardar un texto personalizado sincroniza bidireccionalmente la clave canónica y el alias legacy', () => {
        storageService.saveCustomText({ id: 202, title: 'Texto Sincronizado', content: 'Contenido...', isCustom: true });

        const canonical = JSON.parse(mockStorage.getItem('dactilografia_custom_legal_texts') || '[]');
        const alias = JSON.parse(mockStorage.getItem('dactilografia_custom_texts') || '[]');

        assert.equal(canonical.length, 1);
        assert.equal(alias.length, 1);
        assert.equal(canonical[0].id, 202);
        assert.equal(alias[0].id, 202);
    });

    test('3. runMigrations() unifica textos de clave legacy y clave canónica manteniendo sincronización', () => {
        const legacyTexts = [
            { id: 301, title: 'Texto en Alias', content: 'C1', isCustom: true }
        ];
        const canonicalTexts = [
            { id: 302, title: 'Texto en Canónica', content: 'C2', isCustom: true }
        ];
        mockStorage.setItem('dactilografia_custom_texts', JSON.stringify(legacyTexts));
        mockStorage.setItem('dactilografia_custom_legal_texts', JSON.stringify(canonicalTexts));

        storageService.runMigrations();

        // Verificar que se escribió en la clave canónica
        const canonicalRaw = mockStorage.getItem('dactilografia_custom_legal_texts');
        assert.ok(canonicalRaw);
        const parsed = JSON.parse(canonicalRaw);
        assert.equal(parsed.length, 2);

        // Verificar sincronización en el alias
        const aliasRaw = mockStorage.getItem('dactilografia_custom_texts');
        assert.ok(aliasRaw);
        const aliasParsed = JSON.parse(aliasRaw);
        assert.equal(aliasParsed.length, 2);
    });

    test('4. Desduplicación estricta: textos idénticos en clave canónica y alias no se repiten tras migración', () => {
        const sharedText = { id: 500, title: 'Texto Compartido', content: 'Contenido', isCustom: true };
        
        mockStorage.setItem('dactilografia_custom_legal_texts', JSON.stringify([sharedText]));
        mockStorage.setItem('dactilografia_custom_texts', JSON.stringify([sharedText]));

        storageService.runMigrations();

        const all = storageService.getCustomTexts();
        assert.equal(all.length, 1, 'No debe duplicar el texto compartido con mismo ID');
        assert.equal(all[0].id, 500);
    });

    test('5. Los textos personalizados migrados son evaluables directamente en el examen judicial', () => {
        const customJudicialText = {
            id: 888,
            title: 'Auto Interlocutorio Tribunal de Juicio',
            content: 'Corrientes, 07 de septiembre de 2026. Autos y Vistos: Para resolver la procedencia del recurso...',
            isCustom: true
        };
        mockStorage.setItem('dactilografia_custom_texts', JSON.stringify([customJudicialText]));

        const loadedTexts = storageService.getCustomTexts();
        const selected = loadedTexts.find(t => t.id === 888);
        assert.ok(selected);

        // Evaluar simulación con dicho texto
        const evalResult = evaluateTyping(selected.content, selected.content, 300, 140);
        assert.equal(evalResult.correct, evalResult.totalWords);
        assert.equal(evalResult.minorErrors, 0);
        assert.equal(evalResult.majorErrors, 0);
    });
});
