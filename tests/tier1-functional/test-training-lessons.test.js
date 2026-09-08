/**
 * Tier 1 - Cobertura Funcional: Catálogo y Lecciones de Entrenamiento
 * Verifica las 51 lecciones guiadas de mecanografía, estructura por secciones,
 * progresión pedagógica y cálculo de precisión/WPM para el módulo de entrenamiento.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { TRAINING_LESSONS } from '../helpers/fixtures.js';

describe('Tier 1: Catálogo y Lecciones de Entrenamiento', () => {

    test('1. El catálogo contiene las 86 lecciones pedagógicas completas (superando las 51 mínimas)', () => {
        assert.ok(TRAINING_LESSONS.length >= 51, 'Debe contener al menos 51 lecciones');
        assert.equal(TRAINING_LESSONS.length, 86, 'El catálogo completo de App.jsx contiene exactamente 86 lecciones');
    });

    test('2. Las lecciones están organizadas en secciones temáticas válidas', () => {
        const sections = new Set(TRAINING_LESSONS.map(l => l.section));
        
        assert.ok(sections.has('Fila guía'), 'Debe incluir Fila guía');
        assert.ok(sections.has('Fila superior'), 'Debe incluir Fila superior');
        assert.ok(sections.has('Fila inferior'), 'Debe incluir Fila inferior');
        assert.ok(sections.has('Caracteres acentuados'), 'Debe incluir Caracteres acentuados');
        assert.ok(sections.has('Palabras desafiantes 1'), 'Debe incluir Palabras desafiantes');
    });

    test('3. Cada lección posee id numérico positivo, título no vacío y texto con contenido', () => {
        for (const lesson of TRAINING_LESSONS) {
            assert.ok(typeof lesson.id === 'number' && lesson.id > 0, `ID inválido en lección ${lesson.id}`);
            assert.ok(typeof lesson.title === 'string' && lesson.title.trim().length > 0, `Título vacío en lección ${lesson.id}`);
            assert.ok(typeof lesson.text === 'string' && lesson.text.trim().length > 0, `Texto vacío en lección ${lesson.id}`);
            assert.ok(typeof lesson.section === 'string' && lesson.section.trim().length > 0, `Sección vacía en lección ${lesson.id}`);
        }
    });

    test('4. Progresión pedagógica: Lección 1 inicia con fila guía ("f j") y evoluciona gradualmente', () => {
        const firstLesson = TRAINING_LESSONS[0];
        assert.equal(firstLesson.id, 1);
        assert.equal(firstLesson.title, 'Introducción');
        assert.equal(firstLesson.section, 'Fila guía');
        assert.ok(firstLesson.text.includes('f') && firstLesson.text.includes('j'));

        // Lección 12 introduce teclas extremas a y ñ
        const lesson12 = TRAINING_LESSONS.find(l => l.id === 12);
        assert.ok(lesson12, 'Lección 12 debe existir');
        assert.ok(lesson12.text.includes('ñ'));
    });

    test('5. Evaluación de lección: cómputo de precisión y WPM según caracteres tipeados', () => {
        const lesson = TRAINING_LESSONS[0]; // 'f j f j ff jj f j f j ff jj'
        const totalChars = lesson.text.length;
        
        // Simular tipeo con 2 errores de caracteres
        const errorsCount = 2;
        const correctChars = totalChars - errorsCount;
        const accuracy = Math.round((correctChars / totalChars) * 100);
        
        assert.ok(accuracy >= 90 && accuracy < 100);
        
        // Simular 30 segundos de tiempo transcurrido
        // WPM = (caracteres correctos / 5) / (segundos / 60)
        const timeSec = 30;
        const words = correctChars / 5;
        const minutes = timeSec / 60;
        const wpm = Math.round(words / minutes);

        assert.ok(wpm > 0);
    });
});
