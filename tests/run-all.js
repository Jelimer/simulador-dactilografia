/**
 * Master Test Runner - Simulador Dactilografía
 * Ejecuta de forma integrada y secuencial los 4 Tiers de la suite de pruebas automatizadas:
 * - Tier 1: Cobertura Funcional (Persistencia, Evaluador Judicial, Modo Estricto, Lecciones)
 * - Tier 2: Casos de Borde y Resiliencia (JSON Corrupto, Cuota 5MB, Textos Vacíos, Caracteres Especiales)
 * - Tier 3: Interacciones Cruzadas (Cambio de Postulante, Claves Alias, Historial Acumulativo)
 * - Tier 4: Escenarios Reales Judiciales (Examen 140w, Reprobado 139.5w, Migración 2024, Entrenamiento, Estrés)
 *
 * Emite reportes detallados en español y retorna código de salida 0 (éxito) o 1 (fallo).
 */

import { run } from 'node:test';
import { spec } from 'node:test/reporters';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TIERS = [
    {
        name: 'Tier 1: Cobertura Funcional',
        description: 'Persistencia de 6 claves, motor judicial, backspace y 86 lecciones',
        files: [
            'tier1-functional/test-storage-keys.test.js',
            'tier1-functional/test-judicial-evaluator.test.js',
            'tier1-functional/test-strict-mode.test.js',
            'tier1-functional/test-training-lessons.test.js'
        ]
    },
    {
        name: 'Tier 2: Casos de Borde y Resiliencia',
        description: 'JSON corrupto (fix crash 604), cuota 5MB llena, textos vacíos y acentos',
        files: [
            'tier2-edge-cases/test-corrupt-storage.test.js',
            'tier2-edge-cases/test-quota-exceeded.test.js',
            'tier2-edge-cases/test-empty-texts.test.js',
            'tier2-edge-cases/test-special-chars.test.js'
        ]
    },
    {
        name: 'Tier 3: Interacciones Cruzadas',
        description: 'Nombre en actas, persistencia cruzada de alias e historial multi-sesión',
        files: [
            'tier3-interactions/test-candidate-acta.test.js',
            'tier3-interactions/test-custom-texts-sync.test.js',
            'tier3-interactions/test-history-accumulation.test.js'
        ]
    },
    {
        name: 'Tier 4: Escenarios Reales Judiciales',
        description: '5 escenarios completos de concurso, aprobación, migración y estrés',
        files: [
            'tier4-judicial-scenarios/test-scenario-1-passed-140w.test.js',
            'tier4-judicial-scenarios/test-scenario-2-failed-139w.test.js',
            'tier4-judicial-scenarios/test-scenario-3-legacy-migration.test.js',
            'tier4-judicial-scenarios/test-scenario-4-intensive-training.test.js',
            'tier4-judicial-scenarios/test-scenario-5-resilience-stress.test.js'
        ]
    }
];

async function main() {
    console.log('========================================================================');
    console.log('🏛️  SIMULADOR DACTILOGRAFÍA - SUITE DE PRUEBAS AUTOMATIZADAS (TIERS 1-4)');
    console.log('========================================================================\n');

    const allFilePaths = [];
    for (const tier of TIERS) {
        for (const file of tier.files) {
            allFilePaths.push(path.resolve(__dirname, file));
        }
    }

    console.log(`📋 Total de archivos de prueba registrados: ${allFilePaths.length}`);
    console.log(`🚀 Iniciando ejecución con node:test...\n`);

    const startTime = Date.now();

    const testStream = run({
        files: allFilePaths,
        concurrency: 1 // Ejecución secuencial y aislada para garantizar determinismo en storage
    });

    // Pipe a spec reporter para visualización clara
    testStream.compose(spec).pipe(process.stdout);

    let hasFailures = false;
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    testStream.on('test:fail', (data) => {
        hasFailures = true;
        failedTests++;
    });

    testStream.on('test:pass', () => {
        passedTests++;
    });

    await new Promise((resolve) => {
        testStream.on('end', resolve);
    });

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n========================================================================');
    console.log('📊 RESUMEN DE EJECUCIÓN POR TIERS');
    console.log('========================================================================');
    for (const tier of TIERS) {
        console.log(`  ✓ ${tier.name.padEnd(38)} [${tier.files.length} archivos] - ${tier.description}`);
    }
    console.log('------------------------------------------------------------------------');
    console.log(`⏱️  Duración total: ${totalDuration}s`);
    console.log(`✅ Pruebas pasadas: ${passedTests}`);
    console.log(`❌ Pruebas falladas: ${failedTests}`);
    console.log(`🏁 Veredicto general: ${hasFailures ? 'REPROBADO ❌' : 'APROBADO AL 100% 🎯'}`);
    console.log('========================================================================\n');

    if (hasFailures) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

main().catch((err) => {
    console.error('Error fatal en el ejecutor de pruebas:', err);
    process.exit(1);
});
