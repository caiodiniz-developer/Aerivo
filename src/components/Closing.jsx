import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { splitLines, within, hidden, shown, useResizeKey } from '../lib/split'
import { reducedMotion } from '../lib/env'
import { closing, brand } from '../content'

export default function Closing() {
  const root = useRef(null)
  const resizeKey = useResizeKey()

  useLayoutEffect(() => {
    if (reducedMotion) return
    const scope = root.current
    const { lines, revert } = splitLines(within(scope, '.js-split'))

    const ctx = gsap.context(() => {
      gsap
        .timeline({
          scrollTrigger: { trigger: scope, start: 'top 72%', once: true },
          defaults: { ease: 'expo.out' },
        })
        .fromTo('.js-eyebrow', { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.9 })
        .fromTo(lines, hidden, { ...shown, duration: 1.35, stagger: 0.08 }, '-=0.6')
        .fromTo('.js-late', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1, stagger: 0.1 }, '-=0.9')
    }, scope)

    return () => {
      ctx.revert()
      revert()
    }
  }, [resizeKey])

  return (
    <section className="closing" id="reservar" ref={root}>
      <p className="eyebrow js-eyebrow">{closing.eyebrow}</p>
      <h2 className="display display--l js-split">{closing.title}</h2>
      <p className="lede js-late" style={{ textAlign: 'center' }}>
        {closing.body}
      </p>
      <a className="cta js-late" href="#reservar">
        {closing.cta}
        <span className="cta__arrow" aria-hidden="true">
          →
        </span>
      </a>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="footer">
      <span>
        © {new Date().getFullYear()} {brand.name}
      </span>
      <span>Feito para quem prefere a janela</span>
      <span className="mono">GRU · CDG · HND</span>
    </footer>
  )
}
