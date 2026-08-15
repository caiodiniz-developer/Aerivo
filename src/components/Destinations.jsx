import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger, progress } from '../lib/scroll'
import { splitLines, within, hidden, shown, revealDuration, useResizeKey } from '../lib/split'
import { motionSafe } from '../lib/env'
import { clamp } from '../lib/math'
import { flight } from '../three/state'
import { destinations } from '../content'
import { setBackdropPhoto } from './StageBackdrop'

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
})

export default function Destinations() {
  const root = useRef(null)
  const track = useRef(null)
  const resizeKey = useResizeKey()
  const [active, setActive] = useState(0)

  /* ---------------- presença do trecho na cena 3D ---------------- */
  useLayoutEffect(() => {
    const st = ScrollTrigger.create({
      trigger: track.current,
      start: 'top bottom-=10%',
      end: 'bottom top+=10%',
      onUpdate: (self) => {
        // Sobe rápido na entrada, cai rápido na saída, cheio no meio.
        const p = self.progress
        progress.destBlend = clamp(Math.min(p / 0.1, (1 - p) / 0.1))
      },
      onLeave: () => (progress.destBlend = 0),
      onLeaveBack: () => (progress.destBlend = 0),
    })
    ScrollTrigger.refresh()
    return () => {
      st.kill()
      progress.destBlend = 0
    }
  }, [])

  /* ---------------- a foto troca quando o avião sai de quadro ---------------- */
  useEffect(() => {
    let lastCount = -1
    const tick = () => {
      if (flight.crossCount === lastCount) return
      lastCount = flight.crossCount
      const next = flight.crossCount % destinations.length
      setActive(next)
      // Só a passagem seguinte é que sabe se leva laço — assim o giro nunca
      // começa no meio de uma travessia já em curso.
      flight.loopThisPass = !!destinations[next].loop
      setBackdropPhoto(destinations[next].photo)
    }
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  }, [])

  // Primeira foto: entra já montada, sem esperar a primeira volta.
  useEffect(() => {
    setBackdropPhoto(destinations[0].photo)
    flight.loopThisPass = !!destinations[0].loop
    destinations.forEach((d) => {
      const img = new Image()
      img.src = d.photo
    })
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
    <section id="destinos" className="dest-track" ref={track}>
      <div className="dest-stage" ref={root}>
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

      {/* Altura de scroll do trecho. A troca de destino é do relógio da
          travessia, não do scroll — isto só define quanto tempo a seção fica
          em cena. */}
      <div style={{ height: `${destinations.length * 62}vh` }} aria-hidden="true" />
    </section>
  )
}
