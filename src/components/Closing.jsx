import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger, progress } from '../lib/scroll'
import { splitLines, within, hidden, shown, revealDuration, useResizeKey } from '../lib/split'
import { motionSafe } from '../lib/env'
import { clamp } from '../lib/math'
import { buildLanding } from '../lib/flight'
import { closing, brand } from '../content'

export default function Closing() {
  const root = useRef(null)
  const resizeKey = useResizeKey()

  // O avião chega pela direita, desce na diagonal e para logo abaixo do
  // botão. Uma vez só: aqui a jornada acaba, não repete.
  useLayoutEffect(() => {
    let landing = null

    const st = ScrollTrigger.create({
      trigger: root.current,
      start: 'top bottom-=25%',
      end: 'bottom bottom',
      onUpdate: (self) => (progress.parkBlend = clamp(self.progress / 0.3)),
      onEnter: () => {
        landing?.kill()
        landing = buildLanding()
      },
      onLeaveBack: () => {
        progress.parkBlend = 0
        landing?.kill()
        landing = null
      },
    })

    return () => {
      st.kill()
      landing?.kill()
      progress.parkBlend = 0
    }
  }, [])

  useLayoutEffect(() => {
    const scope = root.current
    const { lines, revert } = splitLines(within(scope, '.js-split'))

    const ctx = gsap.context(() => {
      gsap
        .timeline({
          scrollTrigger: { trigger: scope, start: 'top 72%', once: true },
          defaults: { ease: 'expo.out' },
        })
        .fromTo(
          '.js-eyebrow',
          { opacity: 0, y: motionSafe ? 22 : 0 },
          { opacity: 1, y: 0, duration: 0.9 },
        )
        .fromTo(lines, hidden, { ...shown, duration: revealDuration, stagger: 0.08 }, '-=0.6')
        .fromTo(
          '.js-late',
          { opacity: 0, y: motionSafe ? 30 : 0 },
          { opacity: 1, y: 0, duration: 1, stagger: 0.1 },
          '-=0.9',
        )
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
