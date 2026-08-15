import { Suspense, useLayoutEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger, progress } from '../lib/scroll'
import { dpr, hasWebGL } from '../lib/env'
import { chapters } from '../content'
import Scene from '../three/Scene'
import SkyChapter from './SkyChapter'
import Specs from './Specs'
import FlightHUD from './FlightHUD'

export default function SkyStage({ ready, modelUrl }) {
  const track = useRef(null)
  const canvas = useRef(null)
  // Só liga o loop de render quando a cena está prestes a aparecer — antes
  // disso a GPU tem trabalho melhor a fazer com o scrub do vídeo.
  const [live, setLive] = useState(false)

  useLayoutEffect(() => {
    if (!ready || !hasWebGL) return

    const triggers = []

    // Acorda a cena uma tela inteira antes: a compilação dos shaders acontece
    // atrás do opacity 0, e não como um engasgo no meio da transição.
    triggers.push(
      ScrollTrigger.create({
        trigger: track.current,
        start: 'top bottom+=100%',
        end: 'bottom top-=50%',
        onToggle: (self) => setLive(self.isActive),
      }),
    )

    triggers.push(
      ScrollTrigger.create({
        trigger: track.current,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => (progress.sky = self.progress),
        onRefresh: (self) => (progress.sky = self.progress),
      }),
    )

    const ctx = gsap.context(() => {
      gsap.fromTo(
        [canvas.current, '.hud'],
        { opacity: 0 },
        {
          opacity: 1,
          ease: 'none',
          scrollTrigger: { trigger: track.current, start: 'top 92%', end: 'top 20%', scrub: true },
        },
      )
      gsap.to([canvas.current, '.hud'], {
        opacity: 0,
        ease: 'none',
        scrollTrigger: { trigger: track.current, start: 'bottom 88%', end: 'bottom 42%', scrub: true },
      })
    })

    ScrollTrigger.refresh()

    return () => {
      triggers.forEach((t) => t.kill())
      ctx.revert()
    }
  }, [ready])

  const chapterNodes = (
    <>
      <SkyChapter id="voo" {...chapters.ascent} />
      <SkyChapter align="right" wide {...chapters.altitude}>
        <Specs items={chapters.altitude.specs} />
      </SkyChapter>
      <SkyChapter align="center" {...chapters.golden} />
      <SkyChapter {...chapters.night} />
    </>
  )

  // Único caminho realmente estático: sem WebGL não há cena para renderizar.
  if (!hasWebGL) {
    return (
      <div className="section" style={{ paddingBlock: 0 }}>
        {chapterNodes}
      </div>
    )
  }

  return (
    <>
      <div className="sky-canvas" ref={canvas} aria-hidden="true">
        {ready && (
          <Canvas
            dpr={dpr}
            frameloop={live ? 'always' : 'never'}
            gl={{
              antialias: true,
              alpha: false,
              powerPreference: 'high-performance',
              stencil: false,
            }}
            camera={{ fov: 30, near: 0.5, far: 2600, position: [1.5, -13, 26] }}
            onCreated={({ gl }) => {
              gl.toneMapping = THREE.ACESFilmicToneMapping
              gl.toneMappingExposure = 1
              gl.setClearColor('#0b1220', 1)
            }}
          >
            <Suspense fallback={null}>
              <Scene modelUrl={modelUrl} />
            </Suspense>
          </Canvas>
        )}
      </div>

      <FlightHUD />

      <div className="sky-track" ref={track}>
        {/* Uma tela de respiro: o preto do corte de vídeo dá lugar ao céu
            antes do primeiro texto entrar. */}
        <div style={{ height: '60svh' }} />
        {chapterNodes}
        <div style={{ height: '40svh' }} />
      </div>
    </>
  )
}
