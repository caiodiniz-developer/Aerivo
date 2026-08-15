import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { preloadAssets } from '../lib/preload'
import { stopScroll, startScroll } from '../lib/scroll'
import { motionSafe } from '../lib/env'

/**
 * Cortina de abertura. Trava o scroll, carrega os assets pesados e entrega
 * o controle para a hero só quando o primeiro frame já pode ser mostrado.
 */
export default function Preloader({ onReady }) {
  const root = useRef(null)
  const bar = useRef(null)
  const pct = useRef(null)
  const words = useRef(null)

  useEffect(() => {
    stopScroll()

    const ctx = gsap.context(() => {
      // A cortina é movimento autônomo: sob reduced-motion ela aparece e sai
      // com opacidade, sem deslizar.
      gsap.set('.preloader__word > span', { yPercent: motionSafe ? 110 : 0, opacity: motionSafe ? 1 : 0 })
      gsap.to('.preloader__word > span', {
        yPercent: 0,
        opacity: 1,
        duration: motionSafe ? 1.1 : 0.4,
        ease: 'expo.out',
        stagger: motionSafe ? 0.08 : 0.04,
        delay: 0.12,
      })
    }, root)

    // Valor mostrado persegue o valor real — a barra nunca dá saltos.
    const shown = { v: 0 }
    const quick = gsap.quickTo(shown, 'v', {
      duration: 0.7,
      ease: 'power2.out',
      onUpdate: () => {
        if (bar.current) bar.current.style.transform = `scaleX(${shown.v})`
        if (pct.current) pct.current.textContent = String(Math.round(shown.v * 100)).padStart(3, '0')
      },
    })

    let cancelled = false

    preloadAssets((p) => !cancelled && quick(p)).then(({ modelUrl }) => {
      if (cancelled) return
      quick(1)

      gsap
        .timeline({ defaults: { ease: 'expo.inOut' } })
        .to({}, { duration: 0.55 }) // deixa a barra alcançar 100
        .to('.preloader__word > span', {
          yPercent: motionSafe ? -115 : 0,
          opacity: motionSafe ? 1 : 0,
          filter: motionSafe ? 'blur(10px)' : 'blur(0px)',
          duration: motionSafe ? 0.9 : 0.35,
          stagger: motionSafe ? 0.06 : 0.03,
        })
        .to('.preloader__meta, .preloader__bar', { opacity: 0, duration: 0.5 }, '<')
        .to(
          root.current,
          {
            clipPath: 'inset(0% 0% 100% 0%)',
            duration: 1.15,
            onStart: () => {
              startScroll()
              onReady(modelUrl)
            },
          },
          '-=0.45',
        )
        .set(root.current, { display: 'none' })
    })

    return () => {
      cancelled = true
      ctx.revert()
      startScroll()
    }
  }, [onReady])

  return (
    <div className="preloader" ref={root} style={{ clipPath: 'inset(0% 0% 0% 0%)' }}>
      <div ref={words}>
        <div className="preloader__word">
          <span>Além do</span>
        </div>
        <div className="preloader__word">
          <span>
            <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>horizonte</em>
          </span>
        </div>
      </div>
      <div className="preloader__bar">
        <i ref={bar} />
      </div>
      <div className="preloader__meta">
        <span>Aerivo — preparando a decolagem</span>
        <span className="mono">
          <span ref={pct}>000</span>%
        </span>
      </div>
    </div>
  )
}
