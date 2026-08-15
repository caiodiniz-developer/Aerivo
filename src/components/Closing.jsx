import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger, progress } from '../lib/scroll'
import { splitLines, within, hidden, shown, revealDuration, useResizeKey } from '../lib/split'
import { motionSafe } from '../lib/env'
import { clamp } from '../lib/math'
import { buildLandingTimeline } from '../lib/flight'
import { closing, brand } from '../content'

export default function Closing() {
  const root = useRef(null)
  const resizeKey = useResizeKey()

  // O avião chega pela direita, desce na diagonal e para logo abaixo do
  // botão. Uma vez só: aqui a jornada acaba, não repete.
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia()
      const setup = (mobile) => () => {
        // Timeline exclusiva desta seção, também scrubbed — sem relação
        // nenhuma com a dos destinos.
        // O painel próprio da seção cobre os monumentos. Entra cedo, junto
        // com o topo da seção, para não haver quadro nenhum com foto de país
        // atrás do "Reserve sua janela".
        // Elemento direto, não seletor: o `gsap.context` limita seletores ao
        // seu root, e o backdrop é montado fora desta seção.
        const coverPanel = document.querySelector('.backdrop__closing')
        if (!coverPanel) return
        const panel = gsap.timeline({ defaults: { ease: 'none' } })
        panel.fromTo(coverPanel, { opacity: 0 }, { opacity: 1, duration: 1 })
        const cover = ScrollTrigger.create({
          trigger: root.current,
          start: 'top bottom',
          end: 'top 55%',
          scrub: 0.1,
          invalidateOnRefresh: true,
          animation: panel,
        })

        const st = ScrollTrigger.create({
          trigger: root.current,
          start: 'top 85%',
          end: 'top 20%',
          scrub: 0.1,
          invalidateOnRefresh: true,
          animation: buildLandingTimeline(mobile),
          onUpdate: (self) => (progress.parkBlend = clamp(self.progress / 0.2)),
          onLeaveBack: () => (progress.parkBlend = 0),
        })

        return () => {
          cover.kill()
          st.kill()
          progress.parkBlend = 0
        }
      }
      mm.add('(min-width: 861px)', setup(false))
      mm.add('(max-width: 860px)', setup(true))
    }, root)

    return () => ctx.revert()
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
