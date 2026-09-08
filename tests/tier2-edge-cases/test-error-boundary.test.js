/**
 * Tier 2 - Casos de Borde y Resiliencia: Componente ErrorBoundary
 * 
 * Verifica:
 * 1. Existencia, exportación y estructura de ErrorBoundary en src/components/ErrorBoundary.jsx.
 * 2. Manejo de ciclo de vida de captura de errores (getDerivedStateFromError, componentDidCatch).
 * 3. Mecanismos de recuperación interactiva (reset, reload, fallback custom).
 * 4. Integridad de textos en español y compatibilidad con temas claro y oscuro.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');

describe('Tier 2: Componente ErrorBoundary y Protección de Vistas', () => {
    const errorBoundaryPath = path.join(projectRoot, 'src/components/ErrorBoundary.jsx');
    const mainJsxPath = path.join(projectRoot, 'src/main.jsx');
    const appJsxPath = path.join(projectRoot, 'src/App.jsx');

    test('1. El archivo ErrorBoundary.jsx existe y exporta un componente por defecto', () => {
        assert.ok(fs.existsSync(errorBoundaryPath), 'El archivo ErrorBoundary.jsx debe existir en src/components/');
        const content = fs.readFileSync(errorBoundaryPath, 'utf8');
        assert.ok(content.includes('export default class ErrorBoundary'), 'Debe exportar ErrorBoundary por defecto');
        assert.ok(content.includes('extends Component'), 'Debe extender de React.Component');
    });

    test('2. Implementa los métodos requeridos de React Error Boundary', () => {
        const content = fs.readFileSync(errorBoundaryPath, 'utf8');
        assert.ok(content.includes('static getDerivedStateFromError'), 'Debe implementar static getDerivedStateFromError');
        assert.ok(content.includes('componentDidCatch'), 'Debe implementar componentDidCatch');
        assert.ok(content.includes('hasError: true'), 'getDerivedStateFromError debe actualizar hasError a true');
    });

    test('3. Provee botones interactivos de reintento y recarga con interfaz en español', () => {
        const content = fs.readFileSync(errorBoundaryPath, 'utf8');
        assert.ok(content.includes('handleReset'), 'Debe implementar método handleReset');
        assert.ok(content.includes('handleReload'), 'Debe implementar método handleReload');
        assert.ok(content.includes('Reintentar'), 'Debe incluir texto de acción en español (Reintentar)');
        assert.ok(content.includes('Recargar'), 'Debe incluir texto de acción en español (Recargar)');
    });

    test('4. Incluye soporte de tema claro y oscuro (Tailwind dark variants)', () => {
        const content = fs.readFileSync(errorBoundaryPath, 'utf8');
        assert.ok(content.includes('dark:bg-slate-900'), 'Debe incluir estilos para tema oscuro');
        assert.ok(content.includes('dark:text-slate-100') || content.includes('dark:text-white'), 'Debe incluir tipografía adaptada a tema oscuro');
        assert.ok(content.includes('dark:border-red-900'), 'Debe incluir bordes adaptados a tema oscuro');
    });

    test('5. Envuelve la aplicación en main.jsx como escudo global', () => {
        assert.ok(fs.existsSync(mainJsxPath));
        const mainContent = fs.readFileSync(mainJsxPath, 'utf8');
        assert.ok(mainContent.includes('ErrorBoundary'), 'main.jsx debe importar y usar ErrorBoundary');
        assert.ok(mainContent.includes('<ErrorBoundary'), 'main.jsx debe envolver con <ErrorBoundary>');
        assert.ok(mainContent.includes('</ErrorBoundary>'), 'main.jsx debe cerrar </ErrorBoundary>');
    });

    test('6. Protege las vistas de resultados en App.jsx contra fallos de renderizado', () => {
        assert.ok(fs.existsSync(appJsxPath));
        const appContent = fs.readFileSync(appJsxPath, 'utf8');
        assert.ok(appContent.includes("import ErrorBoundary from './components/ErrorBoundary.jsx'"), 'App.jsx debe importar ErrorBoundary');
        
        // Debe proteger los resultados de Simulador y Entrenamiento y la vista general
        const matches = appContent.match(/<ErrorBoundary/g);
        assert.ok(matches && matches.length >= 3, 'App.jsx debe contener al menos 3 instancias de ErrorBoundary protegiendo las vistas');
        assert.ok(appContent.includes('resetKey={activeTab}'), 'El ErrorBoundary de sección en App.jsx debe incluir resetKey={activeTab}');
    });

    test('7. Componente real ErrorBoundary (SSR): Ciclo de vida y recuperación', async () => {
        const { createServer } = await import('vite');
        const server = await createServer({ server: { middlewareMode: true } });
        try {
            const mod = await server.ssrLoadModule('./src/components/ErrorBoundary.jsx');
            const ErrorBoundary = mod.default;

            const testError = new Error('Simulación de crash en examen oficial');
            const derivedState = ErrorBoundary.getDerivedStateFromError(testError);
            assert.equal(derivedState.hasError, true);
            assert.equal(derivedState.error, testError);

            let resetInvoked = false;
            let errorCallbackInvoked = false;
            const instance = new ErrorBoundary({
                onReset: () => { resetInvoked = true; },
                onError: () => { 
                    errorCallbackInvoked = true; 
                    throw new Error('Error dentro de callback onError'); 
                }
            });

            instance.state = derivedState;
            instance.setState = function(upd) {
                Object.assign(this.state, typeof upd === 'function' ? upd(this.state) : upd);
            };

            // componentDidCatch captura error sin propagar excepción del callback onError
            assert.doesNotThrow(() => {
                instance.componentDidCatch(testError, { componentStack: '\n    in BrokenComponent' });
            });
            assert.ok(errorCallbackInvoked);

            // handleReset restablece estado a limpio y llama onReset
            instance.handleReset();
            assert.equal(instance.state.hasError, false);
            assert.equal(instance.state.error, null);
            assert.ok(resetInvoked);
        } finally {
            await server.close();
        }
    });

    test('8. Componente real ErrorBoundary (SSR): Reseteo automático ante cambio de resetKey o resetKeys', async () => {
        const { createServer } = await import('vite');
        const server = await createServer({ server: { middlewareMode: true } });
        try {
            const mod = await server.ssrLoadModule('./src/components/ErrorBoundary.jsx');
            const ErrorBoundary = mod.default;

            let resetCount = 0;
            const instance = new ErrorBoundary({
                resetKey: 'simulador',
                onReset: () => { resetCount++; }
            });
            instance.state = { hasError: true, error: new Error('Error previo'), errorInfo: null };
            instance.setState = function(upd) {
                Object.assign(this.state, typeof upd === 'function' ? upd(this.state) : upd);
            };

            // Mismo resetKey no debe resetear
            instance.componentDidUpdate({ resetKey: 'simulador' });
            assert.equal(instance.state.hasError, true);
            assert.equal(resetCount, 0);

            // Cambio de resetKey (ej: de simulador a entrenamiento) debe disparar el reset
            instance.componentDidUpdate({ resetKey: 'entrenamiento' });
            assert.equal(instance.state.hasError, false);
            assert.equal(resetCount, 1);

            // Soporte para arreglo resetKeys
            const arrayInstance = new ErrorBoundary({
                resetKeys: ['menu', 1],
                onReset: () => { resetCount++; }
            });
            arrayInstance.state = { hasError: true, error: new Error('Otro error') };
            arrayInstance.setState = function(upd) {
                Object.assign(this.state, typeof upd === 'function' ? upd(this.state) : upd);
            };

            arrayInstance.componentDidUpdate({ resetKeys: ['menu', 2] });
            assert.equal(arrayInstance.state.hasError, false);
            assert.equal(resetCount, 2);
        } finally {
            await server.close();
        }
    });

    test('9. Componente real ErrorBoundary (SSR): Renderiza detalle técnico para errores string u objetos', async () => {
        const { createServer } = await import('vite');
        const server = await createServer({ server: { middlewareMode: true } });
        try {
            const mod = await server.ssrLoadModule('./src/components/ErrorBoundary.jsx');
            const ErrorBoundary = mod.default;

            const instance = new ErrorBoundary({
                fallbackTitle: 'Título de Prueba',
                fallbackMessage: 'Mensaje amigable de contingencia'
            });

            // Error de tipo primitivo string
            instance.state = { hasError: true, error: 'Fallo sintético no estándar', errorInfo: null };
            const vnode = instance.render();
            const serialized = JSON.stringify(vnode);

            assert.ok(serialized.includes('Título de Prueba'));
            assert.ok(serialized.includes('Mensaje amigable de contingencia'));
            assert.ok(serialized.includes('Fallo sintético no estándar'));
            assert.ok(serialized.includes('Reintentar vista'));
            assert.ok(serialized.includes('Recargar aplicación'));
        } finally {
            await server.close();
        }
    });

    test('10. handleReload se ejecuta sin lanzar excepciones si window.location no está presente', async () => {
        const { createServer } = await import('vite');
        const server = await createServer({ server: { middlewareMode: true } });
        try {
            const mod = await server.ssrLoadModule('./src/components/ErrorBoundary.jsx');
            const ErrorBoundary = mod.default;

            let resetRan = false;
            const instance = new ErrorBoundary({
                onReset: () => { resetRan = true; }
            });
            instance.state = { hasError: true, error: new Error('Test') };
            instance.setState = function(upd) {
                Object.assign(this.state, typeof upd === 'function' ? upd(this.state) : upd);
            };

            assert.doesNotThrow(() => {
                instance.handleReload();
            });
            assert.ok(resetRan, 'En ausencia de window.location.reload, handleReload debe delegar en handleReset');
        } finally {
            await server.close();
        }
    });

    test('11. Tolerancia ante objetos de error hostiles (sin prototipo, toString que arroja excepción o tipos primitivos)', async () => {
        const { createServer } = await import('vite');
        const server = await createServer({ server: { middlewareMode: true } });
        try {
            const mod = await server.ssrLoadModule('./src/components/ErrorBoundary.jsx');
            const ErrorBoundary = mod.default;

            const instance = new ErrorBoundary({});

            // 1. Objeto con toString que lanza excepción
            const hostileError = {
                get toString() {
                    throw new Error('toString malicioso');
                }
            };
            instance.state = { hasError: true, error: hostileError, errorInfo: null };
            assert.doesNotThrow(() => {
                const vnode = instance.render();
                assert.ok(vnode);
            }, 'No debe arrojar excepción ante error con toString() defectuoso');

            // 2. Objeto Object.create(null)
            const nullProtoError = Object.create(null);
            nullProtoError.code = 'ERR_SYSTEM_FAILURE';
            instance.state = { hasError: true, error: nullProtoError, errorInfo: null };
            assert.doesNotThrow(() => {
                const vnode = instance.render();
                assert.ok(vnode);
            });

            // 3. Error primitivo numérico o booleano
            instance.state = { hasError: true, error: 500, errorInfo: null };
            assert.doesNotThrow(() => {
                const vnode = instance.render();
                assert.ok(JSON.stringify(vnode).includes('500'));
            });
        } finally {
            await server.close();
        }
    });

    test('12. componentDidUpdate resetea ante cambio en longitud de resetKeys o cambio de resetKey falsy/truthy', async () => {
        const { createServer } = await import('vite');
        const server = await createServer({ server: { middlewareMode: true } });
        try {
            const mod = await server.ssrLoadModule('./src/components/ErrorBoundary.jsx');
            const ErrorBoundary = mod.default;

            let resetCount = 0;
            // 1. Reducción de longitud de resetKeys: de ['tab1', 'item2'] a ['tab1']
            const instance = new ErrorBoundary({
                resetKeys: ['tab1'],
                onReset: () => { resetCount++; }
            });
            instance.state = { hasError: true, error: new Error('Error anterior'), errorInfo: null };
            instance.setState = function(upd) {
                Object.assign(this.state, typeof upd === 'function' ? upd(this.state) : upd);
            };

            instance.componentDidUpdate({ resetKeys: ['tab1', 'item2'] });
            assert.equal(instance.state.hasError, false, 'Debe resetear cuando la longitud de resetKeys disminuye');
            assert.equal(resetCount, 1);

            // 2. Transición de resetKey desde null/falsy a identificador de intento
            const keyInstance = new ErrorBoundary({
                resetKey: 'attempt_abc123',
                onReset: () => { resetCount++; }
            });
            keyInstance.state = { hasError: true, error: new Error('Fallo previo') };
            keyInstance.setState = function(upd) {
                Object.assign(this.state, typeof upd === 'function' ? upd(this.state) : upd);
            };

            keyInstance.componentDidUpdate({ resetKey: null });
            assert.equal(keyInstance.state.hasError, false, 'Debe resetear cuando resetKey cambia de null a nuevo id');
            assert.equal(resetCount, 2);
        } finally {
            await server.close();
        }
    });

    test('13. Tolerancia ante fallback custom que arroja excepción y transición resetKeys de undefined a array', async () => {
        const { createServer } = await import('vite');
        const server = await createServer({ server: { middlewareMode: true } });
        try {
            const mod = await server.ssrLoadModule('./src/components/ErrorBoundary.jsx');
            const ErrorBoundary = mod.default;

            // 1. Fallback function que arroja error
            const buggyFallback = () => {
                throw new Error('Fallo crítico dentro del fallback personalizado');
            };
            const instance = new ErrorBoundary({
                fallback: buggyFallback,
                fallbackTitle: 'Título de Respaldo por Falla en Fallback'
            });
            instance.state = { hasError: true, error: new Error('Error inicial') };

            assert.doesNotThrow(() => {
                const vnode = instance.render();
                const serialized = JSON.stringify(vnode);
                assert.ok(serialized.includes('Título de Respaldo por Falla en Fallback'), 'Debe degradar a la UI por defecto si fallback custom arroja excepción');
            });

            // 2. Transición de resetKeys de undefined a array
            let resetCount = 0;
            const transitionInstance = new ErrorBoundary({
                resetKeys: ['initial_key'],
                onReset: () => { resetCount++; }
            });
            transitionInstance.state = { hasError: true, error: new Error('Error previo') };
            transitionInstance.setState = function(upd) {
                Object.assign(this.state, typeof upd === 'function' ? upd(this.state) : upd);
            };

            transitionInstance.componentDidUpdate({});
            assert.equal(transitionInstance.state.hasError, false, 'Debe resetear cuando resetKeys pasa de undefined a array');
            assert.equal(resetCount, 1);
        } finally {
            await server.close();
        }
    });
});
