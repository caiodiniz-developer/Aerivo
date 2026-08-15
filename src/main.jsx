import { createRoot } from 'react-dom/client'
import './styles/global.css'
import { initSmoothScroll } from './lib/scroll'
import App from './App'

// Antes do primeiro render: o preloader chama `stopScroll()` no seu efeito, e
// efeitos de filho rodam antes dos do pai — se o Lenis não existisse aqui,
// a trava do scroll durante o carregamento não pegaria.
initSmoothScroll()

// Sem StrictMode de propósito: o duplo mount do modo estrito derruba e
// recria o contexto WebGL do Canvas e reexecuta o preload dos assets.
createRoot(document.getElementById('root')).render(<App />)
