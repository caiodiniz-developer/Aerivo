import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger, progress } from '../lib/scroll'
import { splitLines, within, hidden, shown, revealDuration, useResizeKey } from '../lib/split'
import { motionSafe } from '../lib/env'
import { clamp } from '../lib/math'
import { flight } from '../three/state'
import { buildCrossing, releaseFlight, FlightState } from '../lib/flight'
import { destinations } from '../content'
import { setBackdropPhoto, PHOTO_FADE } from './StageBackdrop'

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
  const phase = useRef(FlightState.ENTERING)

  /* ---------------- o voo: uma timeline por travessia ---------------- */
  useLayoutEffect(() => {
    let tl = null
    let index = 0
    let disposed = false
    let onScreen = false

    const fly = () => {
      if (disposed || !onScreen) return
      tl = buildCrossing({
        loop: !!destinations[index].loop,
        onState: (s) => (phase.current = s),
        onComplete: () => {
          // Aqui o avião já está inteiramente fora de quadro pela esquerda.
          // É o único ponto em que o destino muda.
          phase.current = FlightState.CHANGING
          index = (index + 1) % destinations.length
          setActive(index)
          // A próxima travessia espera a foto acabar de entrar.
          gsap.delayedCall(PHOTO_FADE, fly)
        },
      })
    }

    // Presença na cena 3D. O voo só existe enquanto a seção está à vista:
    // fora dela ele é encerrado por completo, para não disputar a pose com o
    // pouso do fecho nem gastar frames fora de quadro.
    const blend = ScrollTrigger.create({
      trigger: track.current,
      start: 'top bottom-=10%',
      end: 'bottom top+=10%',
      onUpdate: (self) => {
        const p = self.progress
        progress.destBlend = clamp(Math.min(p / 0.1, (1 - p) / 0.1))
      },
      onToggle: (self) => {
        onScreen = self.isActive
        if (onScreen) fly()
        else {
          tl = null
          releaseFlight()
        }
      },
      onLeave: () => (progress.destBlend = 0),
      onLeaveBack: () => (progress.destBlend = 0),
    })

    ScrollTrigger.refresh()
    return () => {
      disposed = true
      tl = null
      releaseFlight()
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
