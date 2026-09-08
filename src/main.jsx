import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary fallbackTitle="Error crítico en el Simulador de Dactilografía" fallbackMessage="Ocurrió un error inesperado al iniciar la aplicación. Por favor recargue la página. Sus datos y configuración guardados se encuentran a salvo.">
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

