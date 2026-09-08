/**
 * MockStorage - Implementación de la especificación Web Storage (localStorage) para Node.js
 * Soporta cuota de almacenamiento configurable (por defecto 5MB), serialización a string,
 * simulación de QuotaExceededError, inyección de corrupción JSON y eventos de almacenamiento.
 */

export class MockStorage {
    constructor(options = {}) {
        this._data = new Map();
        this._quotaLimit = options.quotaLimit ?? (5 * 1024 * 1024); // 5 MB por defecto
        this._forceQuotaError = false;
        this._callLogs = [];
    }

    /**
     * Retorna la cantidad de pares clave-valor almacenados.
     */
    get length() {
        return this._data.size;
    }

    /**
     * Retorna el nombre de la clave en la posición indicada.
     */
    key(index) {
        const keys = Array.from(this._data.keys());
        return keys[index] ?? null;
    }

    /**
     * Recupera el valor asociado a la clave como cadena, o null si no existe.
     */
    getItem(key) {
        const strKey = String(key);
        this._log('getItem', strKey);
        if (!this._data.has(strKey)) {
            return null;
        }
        return this._data.get(strKey);
    }

    /**
     * Guarda el valor convertido a cadena. Valida la cuota máxima permitida.
     * Si se supera el límite o se activa simulación, lanza QuotaExceededError (código 22).
     */
    setItem(key, value) {
        const strKey = String(key);
        const strVal = String(value);
        this._log('setItem', strKey, strVal);

        if (this._forceQuotaError) {
            const err = new Error("The quota has been exceeded.");
            err.name = "QuotaExceededError";
            err.code = 22;
            throw err;
        }

        // Calcular tamaño aproximado en bytes (UTF-16: 2 bytes por carácter)
        let totalBytes = 0;
        for (const [k, v] of this._data.entries()) {
            if (k !== strKey) {
                totalBytes += (k.length + v.length) * 2;
            }
        }
        totalBytes += (strKey.length + strVal.length) * 2;

        if (totalBytes > this._quotaLimit) {
            const err = new Error("Failed to execute 'setItem' on 'Storage': Setting the value of '" + strKey + "' exceeded the quota.");
            err.name = "QuotaExceededError";
            err.code = 22;
            throw err;
        }

        this._data.set(strKey, strVal);
    }

    /**
     * Elimina una clave del almacenamiento.
     */
    removeItem(key) {
        const strKey = String(key);
        this._log('removeItem', strKey);
        this._data.delete(strKey);
    }

    /**
     * Vacia todos los elementos del almacenamiento.
     */
    clear() {
        this._log('clear');
        this._data.clear();
    }

    /**
     * Configura el límite de cuota en bytes.
     */
    setQuotaLimit(bytes) {
        this._quotaLimit = bytes;
    }

    /**
     * Activa o desactiva la simulación forzada de QuotaExceededError.
     */
    simulateQuotaExceeded(force = true) {
        this._forceQuotaError = force;
    }

    /**
     * Inyecta intencionalmente un valor corrupto (ej. JSON inválido) para pruebas de borde.
     */
    corrupt(key, badValue) {
        this._data.set(String(key), String(badValue));
    }

    /**
     * Retorna una instantánea de los datos almacenados como objeto plano.
     */
    getSnapshot() {
        const obj = {};
        for (const [k, v] of this._data.entries()) {
            obj[k] = v;
        }
        return obj;
    }

    /**
     * Instala esta instancia en globalThis.localStorage.
     */
    install() {
        this._previousStorage = globalThis.localStorage;
        this._previousWindow = globalThis.window;

        const fakeWindow = {
            localStorage: this,
            isTypingActive: false,
            print: () => {}
        };

        Object.defineProperty(globalThis, 'window', {
            value: fakeWindow,
            configurable: true,
            writable: true
        });
        Object.defineProperty(globalThis, 'localStorage', {
            value: this,
            configurable: true,
            writable: true
        });
        return this;
    }

    /**
     * Restaura el almacenamiento global previo.
     */
    uninstall() {
        if (this._previousStorage !== undefined) {
            Object.defineProperty(globalThis, 'localStorage', {
                value: this._previousStorage,
                configurable: true,
                writable: true
            });
        } else {
            delete globalThis.localStorage;
        }

        if (this._previousWindow !== undefined) {
            Object.defineProperty(globalThis, 'window', {
                value: this._previousWindow,
                configurable: true,
                writable: true
            });
        } else {
            delete globalThis.window;
        }
    }

    _log(method, ...args) {
        this._callLogs.push({ method, args, timestamp: Date.now() });
    }

    getCallLogs() {
        return [...this._callLogs];
    }
}

/**
 * Crea e instala un MockStorage fresco.
 */
export function setupTestStorage(options = {}) {
    const storage = new MockStorage(options);
    storage.install();
    return storage;
}
