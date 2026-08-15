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

  /* ---------------- a travessia é o scroll ---------------- */
  useLayoutEffect(() => {
    // Um bloco de scroll por destino. Dentro de cada bloco o avião atravessa
    // uma vez, da direita para a esquerda; ao virar o bloco, a foto troca.
    const cross = ScrollTrigger.create({
      trigger: track.current,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        const total = self.progress * destinations.length
        const i = clamp(Math.floor(total), 0, destinations.length - 1)
        flight.crossU = clamp(total - i)
        flight.loopThisPass = !!destinations[i].loop
        // O React descarta o set quando o índice não muda, então isto não
        // custa re-render por frame de scroll.
        setActive(i)
      },
    })

    // Presença na cena 3D: entra antes da seção aparecer e sai depois dela.
    const blend = ScrollTrigger.create({
      trigger: track.current,
      start: 'top bottom-=10%',
      end: 'bottom top+=10%',
      onUpdate: (self) => {
        const p = self.progress
        progress.destBlend = clamp(Math.min(p / 0.1, (1 - p) / 0.1))
      },
      onLeave: () => (progress.destBlend = 0),
      onLeaveBack: () => (progress.destBlend = 0),
    })

    ScrollTrigger.refresh()
    return () => {
      cross.kill()
      blend.kill()
      progress.destBlend = 0
    }
  }, [])

  /* ---------------- foto de fundo ---------------- */
  useEffect(() => {
    setBackdropPhoto(destinations[active].photo)
  }, [active])

  // Pré-carrega todas: a troca é instantânea e o crossfade nunca mostra vazio.
  useEffect(() => {
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

      {/* Um bloco de scroll por destino: é o que dá a cada um a sua travessia
          inteira, da direita até o fim da tela. */}
      <div style={{ height: `${destinations.length * 95}vh` }} aria-hidden="true" />
    </section>
  )
}
