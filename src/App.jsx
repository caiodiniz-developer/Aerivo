import { useCallback, useEffect, useState } from 'react'
import { ScrollTrigger } from './lib/scroll'
import Preloader from './components/Preloader'
import StageBackdrop from './components/StageBackdrop'
import { Nav, ProgressRail, FilmGrain } from './components/Chrome'
import VideoStage from './components/VideoStage'
import SkyStage from './components/SkyStage'
import Destinations from './components/Destinations'
import Closing, { Footer } from './components/Closing'

export default function App() {
  const [ready, setReady] = useState(false)
  const [modelUrl, setModelUrl] = useState('/models/aviao.glb')

  const onReady = useCallback((url) => {
    if (url) setModelUrl(url)
    setReady(true)
  }, [])

  // A altura da viewport muda quando a barra do navegador mobile recolhe;
  // sem remedir, todos os pontos de gatilho ficam alguns pixels errados.
  useEffect(() => {
    const refresh = () => ScrollTrigger.refresh()
    window.addEventListener('orientationchange', refresh)
    const t = setTimeout(refresh, 400)
    return () => {
      window.removeEventListener('orientationchange', refresh)
      clearTimeout(t)
    }
  }, [ready])

  return (
    <>
      <a className="sr-only" href="#destinos">
        Pular para os destinos
      </a>

      {/* O preloader roda sempre: é ele que dispara `ready`, e sem ele nem o
          scrub nem a cena 3D chegavam a montar. */}
      <Preloader onReady={onReady} />
      {/* Fica abaixo do canvas 3D (z-index 0 contra 1): o avião voa sobre a foto. */}
      <StageBackdrop />
      <Nav />
      <ProgressRail />

      <main className="app" id="top">
        <VideoStage ready={ready} />
        <SkyStage ready={ready} modelUrl={modelUrl} />
        <Destinations />
        <Closing />
      </main>

      <Footer />
      <FilmGrain />
    </>
  )
}
