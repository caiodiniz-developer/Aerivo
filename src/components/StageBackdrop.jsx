import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { motionSafe } from '../lib/env'

/**
 * Fundo da cena, atrás do canvas 3D.
 *
 * Fica em `z-index: 0`, abaixo do WebGL (`z-index: 1`): assim o avião voa
 * *sobre* a foto. Isso só funciona porque o canvas é alpha e, nestes trechos,
 * o céu 3D sai da câmera principal — ver `WorldVisibility` em three/Scene.
 *
 * Duas camadas empilhadas trocando de vez: a que entra faz o fade por cima da
 * que sai, então a transição não passa pelo fundo da página no meio do
 * caminho — é o que deixa a troca limpa em vez de piscar.
 */
export default function StageBackdrop() {
  const layers = [useRef(null), useRef(null)]
  const front = useRef(0)
  const shown = useRef(null)

  useEffect(() => {
    const onPhoto = (e) => {
      const src = e.detail
      if (src === shown.current) return
      shown.current = src

      const next = layers[1 - front.current].current
      const prev = layers[front.current].current
      if (!next) return

      next.style.backgroundImage = `url("${src}")`
      gsap.killTweensOf([next, prev])
      gsap.set(next, { zIndex: 2 })
      gsap.set(prev, { zIndex: 1 })
      gsap.fromTo(
        next,
        { opacity: 0, scale: motionSafe ? 1.06 : 1 },
        {
          opacity: 1,
          scale: 1,
          duration: motionSafe ? 1.6 : 0.4,
          ease: 'power2.inOut',
          onComplete: () => {
            if (prev) prev.style.opacity = '0'
          },
        },
      )
      front.current = 1 - front.current
    }

    window.addEventListener('aerivo:photo', onPhoto)
    return () => window.removeEventListener('aerivo:photo', onPhoto)
  }, [])

  return (
    <div className="backdrop" aria-hidden="true">
      <div className="backdrop__layer" ref={layers[0]} />
      <div className="backdrop__layer" ref={layers[1]} />
      <div className="backdrop__scrim" />
    </div>
  )
}

/** Troca a foto de fundo. Evento em vez de contexto: quem chama é um `useFrame`. */
export const setBackdropPhoto = (src) =>
  window.dispatchEvent(new CustomEvent('aerivo:photo', { detail: src }))
