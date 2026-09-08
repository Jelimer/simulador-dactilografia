import { Component } from 'react';
import { AlertTriangle, RotateCcw, RefreshCw } from 'lucide-react';

/**
 * ErrorBoundary - Componente de contención de errores y resiliencia para React.
 * Captura excepciones en el árbol de componentes evitando pantallas en blanco (white screen)
 * y ofrece recuperación interactiva manteniendo el estado y datos del postulante.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Error no controlado capturado en vista:', error, errorInfo);
    this.setState({ errorInfo });
    if (typeof this.props.onError === 'function') {
      try {
        this.props.onError(error, errorInfo);
      } catch (e) {
        console.warn('[ErrorBoundary] Error en callback onError:', e);
      }
    }
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError) {
      if ('resetKey' in this.props && this.props.resetKey !== prevProps.resetKey) {
        this.handleReset();
        return;
      }
      if ('resetKeys' in this.props || 'resetKeys' in prevProps) {
        const curr = Array.isArray(this.props.resetKeys) ? this.props.resetKeys : [];
        const prev = Array.isArray(prevProps.resetKeys) ? prevProps.resetKeys : [];
        const lengthChanged = curr.length !== prev.length;
        const hasChanged = lengthChanged || curr.some((val, idx) => val !== prev[idx]);
        if (hasChanged) {
          this.handleReset();
        }
      }
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    if (typeof this.props.onReset === 'function') {
      try {
        this.props.onReset();
      } catch (e) {
        console.warn('[ErrorBoundary] Error en callback onReset:', e);
      }
    }
  };

  handleReload = () => {
    if (typeof window !== 'undefined' && window.location && typeof window.location.reload === 'function') {
      try {
        window.location.reload();
        return;
      } catch (e) {
        console.warn('[ErrorBoundary] Error al invocar window.location.reload:', e);
      }
    }
    this.handleReset();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        if (typeof this.props.fallback === 'function') {
          try {
            return this.props.fallback(this.state.error, this.handleReset);
          } catch (e) {
            console.warn('[ErrorBoundary] Error dentro de custom fallback function:', e);
          }
        } else {
          return this.props.fallback;
        }
      }

      const title = this.props.fallbackTitle || 'Se produjo un inconveniente al cargar esta sección';
      const message = this.props.fallbackMessage || 
        'No se preocupe: el historial y sus avances se encuentran resguardados en el almacenamiento local. Puede reintentar la acción o recargar la vista.';

      let errorDetail = null;
      try {
        if (this.state.error?.message) {
          errorDetail = this.state.error.message;
        } else if (typeof this.state.error === 'string') {
          errorDetail = this.state.error;
        } else if (this.state.error !== null && this.state.error !== undefined) {
          errorDetail = String(this.state.error);
        }
      } catch {
        errorDetail = 'Error no especificado';
      }

      return (
        <div className="w-full max-w-2xl mx-auto my-6 p-6 rounded-2xl border border-red-200 dark:border-red-900/40 bg-white dark:bg-slate-900 shadow-lg text-slate-800 dark:text-slate-100 transition-colors">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 rounded-xl flex-shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
                {title}
              </h3>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {message}
              </p>

              {errorDetail && (
                <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/30 font-mono text-xs text-red-700 dark:text-red-300 overflow-x-auto whitespace-pre-wrap break-all">
                  <strong>Detalle técnico:</strong> {String(errorDetail)}
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm flex items-center transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reintentar vista
                </button>
                <button
                  type="button"
                  onClick={this.handleReload}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-lg border border-slate-200 dark:border-slate-700 flex items-center transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Recargar aplicación
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
