import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger, progress } from '../lib/scroll'
import { splitLines, within, hidden, shown, revealDuration, useResizeKey } from '../lib/split'
import { motionSafe } from '../lib/env'
import { clamp } from '../lib/math'
import { buildMasterTimeline } from '../lib/flight'
import { destinations } from '../content'

/**
 * Alturas de viewport de scroll por destino. Compacto de propósito: a
 * velocidade continua sendo do usuário, o que muda é quantos pixels de scroll
 * equivalem a uma viagem inteira.
 */
const SCROLL_PER_DEST = 0.75

/**
 * Interpolação entre o progresso do scroll e o da timeline.
 *
 * Curto de propósito: quem suaviza o input da roda é o Lenis, globalmente.
 * Somar um scrub longo aqui seria interpolar duas vezes — Lenis suaviza, GSAP
 * suaviza de novo — e o avião passaria a correr atrás do dedo.
 */
const SCRUB = 0.1

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
})

export default function Destinations() {
  const root = useRef(null)
  const stage = useRef(null)
  const resizeKey = useResizeKey()
  const [active, setActive] = useState(0)
  const indexRef = useRef(0)

  /* ---------------- a viagem inteira, pilotada pelo scroll ---------------- */
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia()

      mm.add('(min-width: 861px)', () => setupFlight(false))
      mm.add('(max-width: 860px)', () => setupFlight(true))

      function setupFlight(mobile) {
        // `document.querySelectorAll` de propósito: o `gsap.context` limita
        // seletores ao seu root, e o backdrop é montado fora desta seção —
        // pelo seletor escopado a lista vinha vazia e o pin nunca nascia.
        const layers = Array.from(document.querySelectorAll('.backdrop__layer'))
        if (!layers.length) return

        const master = buildMasterTimeline(destinations, layers)

        const st = ScrollTrigger.create({
          trigger: stage.current,
          start: 'top top',
          // Faixa igual por destino, recalculada no refresh — nada de pixel
          // fixo pensado numa tela só.
          end: () => `+=${destinations.length * window.innerHeight * SCROLL_PER_DEST}`,
          pin: true,
          pinSpacing: true,
          scrub: SCRUB,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          animation: master,
          onUpdate: (self) => {
            // O 3D acompanha o mesmo progresso.
            progress.destBlend = clamp(Math.min(self.progress / 0.04, (1 - self.progress) / 0.04))
            // O texto troca só quando o índice muda de verdade — um setState
            // por frame de scroll derrubaria o framerate.
            const i = clamp(
              Math.floor(self.progress * destinations.length),
              0,
              destinations.length - 1,
            )
            if (i !== indexRef.current) {
              indexRef.current = i
              setActive(i)
            }
          },
          onLeave: () => (progress.destBlend = 0),
          onLeaveBack: () => (progress.destBlend = 0),
        })

        return () => {
          st.kill()
          progress.destBlend = 0
        }
      }
    }, root)

    return () => ctx.revert()
  }, [])

  /* ---------------- reveals ---------------- */
  useLayoutEffect(() => {
    const scope = root.current
    const head = splitLines(within(scope, '.js-split'))
    const ctx = gsap.context(() => {
      gsap.fromTo(head.lines, hidden, {
        ...shown,
        duration: revealDuration,
        ease: 'expo.out',
        stagger: 0.08,
        scrollTrigger: { trigger: '.dest-head', start: 'top 82%', once: true },
      })
    }, scope)
    return () => {
      ctx.revert()
      head.revert()
    }
  }, [resizeKey])

  useLayoutEffect(() => {
    if (!motionSafe) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.dest-card > *',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.8, stagger: 0.07, ease: 'expo.out' },
      )
    }, root)
    return () => ctx.revert()
  }, [active])

  const d = destinations[active]

  return (
    <section id="destinos" className="dest-track" ref={root}>
      <div className="dest-stage" ref={stage}>
        <div className="dest-inner">
          <div className="dest-head">
            <p className="eyebrow">06 — Malha</p>
            <h2 className="display display--m js-split">Escolha uma janela.</h2>
          </div>

          <ul className="dest-list">
            {destinations.map((item, i) => (
              <li key={item.code} className={`dest-row${i === active ? ' is-on' : ''}`}>
                <span className="dest-row__index mono">{String(i + 1).padStart(2, '0')}</span>
                <span className="dest-row__name">{item.name}</span>
                <span className="dest-row__code mono">{item.code}</span>
              </li>
            ))}
          </ul>

          <aside className="dest-card" key={d.code}>
            <p className="eyebrow">
              {d.city} · {d.code}
            </p>
            <p className="dest-card__landmark">{d.landmark}</p>
            <dl className="dest-card__facts">
              <div>
                <dt>Duração</dt>
                <dd className="mono">{d.time}</dd>
              </div>
              <div>
                <dt>A partir de</dt>
                <dd className="mono">{brl.format(d.basePrice)}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </div>

      {/* Nada de espaçador manual: o `pin` do ScrollTrigger cria o espaço, e
          o `end` deriva de destinations.length — assim a faixa de cada
          destino é sempre idêntica, em qualquer altura de tela. */}
    </section>
  )
}
