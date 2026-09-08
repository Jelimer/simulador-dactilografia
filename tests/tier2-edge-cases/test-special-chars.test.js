/**
 * Tier 2 - Casos de Borde y Resiliencia: Caracteres Especiales, Acentos y Puntuación Jurídica
 * Verifica la normalización NFD de acentos, tratamiento de diacríticos, comillas tipográficas,
 * abreviaturas de leyes y robustez ante secuencias complejas de espaciado y Unicode.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getTypingEvaluator } from '../helpers/contracts.js';
import { SPECIAL_TEXTS } from '../helpers/fixtures.js';

describe('Tier 2: Caracteres Especiales, Acentos y Puntuación Jurídica', async () => {
    const { evaluateTyping, normalizeWord, removePunctuation } = await getTypingEvaluator();

    test('1. Normalización de acentos y diacríticos españoles (á, é, í, ó, ú, ü, ñ) clasifica como error leve', () => {
        const { original, unaccentedTyped } = SPECIAL_TEXTS.accentsAndTildes;
        const result = evaluateTyping(original, unaccentedTyped, 300, 140);

        assert.equal(result.totalWords, 7);
        assert.equal(result.enteredWords, 7);
        assert.equal(result.correct, 0, 'Sin tildes no debe computar como 100% correcta');
        assert.equal(result.minorErrors, 7, 'Todas deben ser clasificadas como error leve');
        assert.equal(result.majorErrors, 0);
        // Cada error leve computa al 50%: 7 * 0.5 = 3.5 palabras netas
        assert.equal(result.accountedWords, 3.5);
    });

    test('2. Puntuación judicial compleja (guiones -, comas ,, puntos ., signos ?, !) clasifica como error leve si falta puntuación', () => {
        const orig = "El derecho, afirmó el juez; es inalienable. Acaso no se ha probado en autos? Ciertamente sí! (fs. 120).";
        // Tipeado limpio sin signos
        const typed = "El derecho afirmó el juez es inalienable Acaso no se ha probado en autos Ciertamente sí fs 120";
        const result = evaluateTyping(orig, typed, 300, 140);

        assert.ok(result.totalWords > 0);
        // Las palabras cuyas letras coincidan pero difieran en signos se categorizan como errores leves
        assert.equal(result.majorErrors, 0, 'No deben considerarse errores graves');
        assert.ok(result.accountedWords > 0);
    });

    test('3. Artículos jurídicos con abreviaturas y ordinales (Art. 14 bis, inc. a), Ac. Nº 20/24)', () => {
        const orig = "Art. 14 bis de la Ley Nº 27.541, inc. a)";
        const typed = "Art. 14 bis de la Ley Nº 27.541, inc. a)";
        const result = evaluateTyping(orig, typed, 300, 140);

        assert.equal(result.totalWords, 10);
        assert.equal(result.correct, 10);
        assert.equal(result.minorErrors, 0);
        assert.equal(result.majorErrors, 0);
        assert.equal(result.accountedWords, 10);
    });

    test('4. Espaciado irregular (múltiples espacios, tabs y saltos de línea entre palabras) no desincroniza el alineador', () => {
        const orig = "Artículo 14 bis.   El trabajo   en sus diversas formas  gozará de la protección de las leyes.";
        const typed = "Artículo\t14  bis.\n\nEl  trabajo en  sus  diversas  formas gozará   de  la  protección de las leyes.";
        const result = evaluateTyping(orig, typed, 300, 140);

        assert.equal(result.correct, result.totalWords, 'Debe ignorar variaciones de espacios en blanco');
        assert.equal(result.minorErrors, 0);
        assert.equal(result.majorErrors, 0);
        assert.equal(result.omitted, 0);
    });

    test('5. Símbolos especiales y emojis no cuelgan el bucle ni arrojan excepciones no controladas', () => {
        const orig = "Sentencia Definitiva Nº 105 ⚖️ 🏛️";
        const typed = "Sentencia Definitiva Nº 105";

        assert.doesNotThrow(() => {
            const result = evaluateTyping(orig, typed, 300, 140);
            assert.ok(result.totalWords >= 4);
            assert.ok(result.accountedWords >= 4);
        });
    });
});
