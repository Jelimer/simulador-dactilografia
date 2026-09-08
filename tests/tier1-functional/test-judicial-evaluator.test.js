/**
 * Tier 1 - Cobertura Funcional: Motor de Evaluación Judicial
 * Valida el algoritmo de evaluación oficial para concursos judiciales:
 * cómputo de palabras netas, clasificación de errores leves (0.5), errores graves (1.0),
 * cálculo de PPM (WPM), omisiones y umbral oficial de 140 palabras en 5 minutos.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getTypingEvaluator } from '../helpers/contracts.js';
import { LEGAL_TEXTS } from '../helpers/fixtures.js';

describe('Tier 1: Motor de Evaluación Judicial', async () => {
    const { evaluateTyping, normalizeWord, removePunctuation } = await getTypingEvaluator();

    test('1. Tipeo 100% idéntico produce 0 faltas y todas las palabras correctas', () => {
        const text = "El Poder Judicial de la Provincia de Corrientes garantiza el acceso a la justicia.";
        const result = evaluateTyping(text, text, 300, 140);

        assert.equal(result.totalWords, 14);
        assert.equal(result.enteredWords, 14);
        assert.equal(result.correct, 14);
        assert.equal(result.minorErrors, 0);
        assert.equal(result.majorErrors, 0);
        assert.equal(result.omitted, 0);
        assert.equal(result.accountedWords, 14);
        assert.ok(result.evaluatedTyped.every(w => w.status === 'correct'));
    });

    test('2. Diferencias de tildes o acentos diacríticos clasifican estrictamente como error leve', () => {
        const orig = "Constitución apelación régimen cédula";
        const typed = "Constitucion apelacion regimen cedula"; // Sin tildes
        const result = evaluateTyping(orig, typed, 300, 140);

        assert.equal(result.correct, 0);
        assert.equal(result.minorErrors, 4);
        assert.equal(result.majorErrors, 0);
        // Cada error leve suma 0.5 palabras netas
        assert.equal(result.accountedWords, 2.0);
        assert.ok(result.evaluatedTyped.every(w => w.status === 'minor'));
    });

    test('3. Diferencias de signos de puntuación periféricos clasifican como error leve', () => {
        const orig = "Artículo 724.- Obligación.";
        const typed = "Artículo 724 Obligación"; // Sin .- ni .
        const result = evaluateTyping(orig, typed, 300, 140);

        assert.equal(result.minorErrors, 2);
        assert.equal(result.majorErrors, 0);
        assert.equal(result.correct, 1);
        assert.equal(result.accountedWords, 2.0); // 1 + (2 * 0.5) = 2.0
    });

    test('4. Diferencias de mayúsculas y minúsculas clasifican como error leve', () => {
        const orig = "PODER JUDICIAL";
        const typed = "poder judicial";
        const result = evaluateTyping(orig, typed, 300, 140);

        assert.equal(result.minorErrors, 2);
        assert.equal(result.majorErrors, 0);
        assert.equal(result.correct, 0);
        assert.equal(result.accountedWords, 1.0); // 0 + (2 * 0.5) = 1.0
    });

    test('5. Palabras omitidas en el texto original se computan como omitidas', () => {
        const orig = "uno dos tres cuatro cinco";
        const typed = "uno tres cinco"; // omitió 'dos' y 'cuatro'
        const result = evaluateTyping(orig, typed, 300, 140);

        assert.equal(result.omitted, 2);
        assert.equal(result.correct, 3);
        assert.equal(result.accountedWords, 3);
    });

    test('6. Palabras adicionales/inventadas se computan como errores graves (status extra)', () => {
        const orig = "juez fiscal secretario";
        const typed = "juez perito fiscal secretario"; // 'perito' es palabra extra
        const result = evaluateTyping(orig, typed, 300, 140);

        assert.equal(result.majorErrors, 1);
        assert.equal(result.correct, 3);
        assert.equal(result.accountedWords, 3);
        assert.ok(result.evaluatedTyped.some(w => w.text === 'perito' && w.status === 'extra'));
    });

    test('7. Palabras totalmente erróneas se computan como errores graves (status major)', () => {
        const orig = "el testigo compareció puntualmente";
        const typed = "el elefante compareció puntualmente"; // 'elefante' en vez de 'testigo'
        const result = evaluateTyping(orig, typed, 300, 140);

        assert.equal(result.majorErrors, 1);
        assert.equal(result.correct, 3);
        assert.equal(result.accountedWords, 3);
        assert.ok(result.evaluatedTyped.some(w => w.text === 'elefante' && w.status === 'major'));
    });

    test('8. Fórmula oficial de palabras netas: accountedWords = correct + (minorErrors * 0.5)', () => {
        const orig = "uno dos tres cuatro cinco seis siete ocho nueve diez";
        // 6 correctas, 2 con error leve de tilde, 2 erróneas
        const typed = "uno dos tres cuatro cinco seis SIETE OCHO caballo perro";
        const result = evaluateTyping(orig, typed, 300, 140);

        assert.equal(result.correct, 6);
        assert.equal(result.minorErrors, 2);
        assert.equal(result.majorErrors, 2);
        // 6 + (2 * 0.5) = 7.0
        assert.equal(result.accountedWords, 7.0);
    });

    test('9. Cálculo de WPM y errores por minuto para examen judicial de 5 minutos (300 segundos)', () => {
        // En 300 segundos (5 minutos), si escribe 150 palabras netas con 5 faltas
        const origWords = Array(150).fill("ley").join(" ");
        const result = evaluateTyping(origWords, origWords, 300, 140);

        // 150 palabras / 5 min = 30.0 PPM
        assert.equal(result.wpm, '30.0');
        assert.equal(result.errorsPerMinute, '0.0');
    });

    test('10. Veredicto oficial de concurso: 140 palabras netas aprueba, 139.5 reprueba', () => {
        const text140 = Array(140).fill("derecho").join(" ");
        const passedResult = evaluateTyping(text140, text140, 300, 140);
        assert.equal(passedResult.accountedWords, 140);
        assert.equal(passedResult.passed, true);

        // 139 palabras correctas + 1 con error leve = 139.5 palabras netas
        const words = Array(139).fill("derecho");
        words.push("DERECHO"); // 1 minor error -> 0.5 palabras
        const text139_5 = words.join(" ");
        const failedResult = evaluateTyping(text140, text139_5, 300, 140);

        assert.equal(failedResult.accountedWords, 139.5);
        assert.equal(failedResult.passed, false);
    });
});
