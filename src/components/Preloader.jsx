import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { preloadAssets } from '../lib/preload'
import { stopScroll, startScroll } from '../lib/scroll'

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
      gsap.set('.preloader__word > span', { yPercent: 110 })
      gsap.to('.preloader__word > span', {
        yPercent: 0,
        duration: 1.1,
        ease: 'expo.out',
        stagger: 0.08,
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
          yPercent: -115,
          filter: 'blur(10px)',
          duration: 0.9,
          stagger: 0.06,
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
