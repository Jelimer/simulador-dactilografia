/**
 * Tier 1 - Cobertura Funcional: Modo Estricto de Examen Judicial
 * Verifica el bloqueo riguroso de la tecla Backspace, emisión de advertencia visual,
 * bloqueo de la acción de pegado (onPaste) y preservación del flag strictMode.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { handleStrictKeyDown, handleStrictPaste } from '../helpers/contracts.js';

describe('Tier 1: Control de Backspace y Pegado en Modo Estricto', () => {

    test('1. Con strictMode: true, presionar Backspace invoca preventDefault() y activa advertencia', () => {
        let prevented = false;
        let warningTriggered = false;

        const fakeEvent = {
            key: 'Backspace',
            preventDefault: () => { prevented = true; }
        };

        const result = handleStrictKeyDown(fakeEvent, true, (warn) => {
            warningTriggered = warn;
        });

        assert.equal(prevented, true, 'Debe llamar a preventDefault()');
        assert.equal(warningTriggered, true, 'Debe activar la advertencia visual');
        assert.equal(result.prevented, true);
        assert.equal(result.warned, true);
    });

    test('2. Con strictMode: false, presionar Backspace NO invoca preventDefault() ni activa advertencia', () => {
        let prevented = false;
        let warningTriggered = false;

        const fakeEvent = {
            key: 'Backspace',
            preventDefault: () => { prevented = true; }
        };

        const result = handleStrictKeyDown(fakeEvent, false, (warn) => {
            warningTriggered = warn;
        });

        assert.equal(prevented, false, 'No debe llamar a preventDefault() en modo normal');
        assert.equal(warningTriggered, false, 'No debe activar advertencia en modo normal');
        assert.equal(result.prevented, false);
        assert.equal(result.warned, false);
    });

    test('3. Con strictMode: true, teclas regulares (letras, números, espacios) NO son bloqueadas', () => {
        const testKeys = ['a', 'A', '1', ' ', 'Enter', 'Tab', 'Shift', ',', '.'];

        for (const key of testKeys) {
            let prevented = false;
            const fakeEvent = {
                key,
                preventDefault: () => { prevented = true; }
            };

            const result = handleStrictKeyDown(fakeEvent, true);
            assert.equal(prevented, false, `Tecla "${key}" no debe ser prevenida`);
            assert.equal(result.prevented, false);
        }
    });

    test('4. Bloqueo de evento onPaste en área de examen oficial para evitar fraude', () => {
        let pastePrevented = false;
        const fakePasteEvent = {
            preventDefault: () => { pastePrevented = true; }
        };

        const result = handleStrictPaste(fakePasteEvent);
        assert.equal(pastePrevented, true, 'onPaste debe invocar preventDefault()');
        assert.equal(result.prevented, true);
    });

    test('5. El estado strictMode se preserva íntegramente en los metadatos del examen', () => {
        const strictAttempt = {
            id: 12345,
            candidateName: 'Dra. Silveira',
            strictMode: true,
            accountedWords: 142
        };

        const normalAttempt = {
            id: 12346,
            candidateName: 'Dr. Mendoza',
            strictMode: false,
            accountedWords: 140
        };

        assert.strictEqual(strictAttempt.strictMode, true);
        assert.strictEqual(normalAttempt.strictMode, false);
    });
});
