import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import * as THREE from 'three'
import { ScrollTrigger, progress } from '../lib/scroll'
import { splitLines, within, hidden, shown, revealDuration, useResizeKey } from '../lib/split'
import { motionSafe } from '../lib/env'
import { clamp } from '../lib/math'
import { destinations } from '../content'
import { Monument } from './landmarks'

/** Quanto scroll cada destino ocupa. */
const ROW_VH = 88

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
})

// Cores pré-convertidas: o loop de render não pode alocar THREE.Color.
const SKIES = destinations.map((d) => d.sky.map((hex) => new THREE.Color(hex)))

export default function Destinations() {
  const root = useRef(null)
  const track = useRef(null)
  const resizeKey = useResizeKey()
  const [active, setActive] = useState(0)

  // Hover tem prioridade sobre o scroll: se a pessoa aponta um destino, é
  // aquele que ela quer ver, mesmo que o scroll ainda esteja em outro.
  const hovered = useRef(null)
  const fromScroll = useRef(0)

  const apply = useCallback((index, u) => {
    const i = clamp(index, 0, destinations.length - 1)
    setActive(i)
    progress.dest = u
    progress.destSky = SKIES[i]
  }, [])

  /* ---------------- trilho: define o destino ativo e o modo 3D ---------------- */
  useLayoutEffect(() => {
    const st = ScrollTrigger.create({
      trigger: track.current,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        const total = self.progress * destinations.length
        fromScroll.current = Math.floor(total)
        const index = hovered.current ?? fromScroll.current
        apply(index, total % 1)
      },
    })

    // `destBlend` sobe antes da seção entrar e cai depois de sair, para a
    // paleta 3D chegar ao lugar já vestida.
    const blend = ScrollTrigger.create({
      trigger: track.current,
      start: 'top bottom-=15%',
      end: 'bottom top+=15%',
      onUpdate: (self) => {
        const p = self.progress
        progress.destBlend = clamp(Math.min(p / 0.12, (1 - p) / 0.12))
      },
      onLeave: () => (progress.destBlend = 0),
      onLeaveBack: () => (progress.destBlend = 0),
    })

    ScrollTrigger.refresh()
    return () => {
      st.kill()
      blend.kill()
      progress.destBlend = 0
    }
  }, [apply])

  /* ---------------- cabeçalho ---------------- */
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

  /* ---------------- o monumento "aparece do nada" ---------------- */
  useLayoutEffect(() => {
    if (!motionSafe) return
    const ctx = gsap.context(() => {
      gsap
        .timeline()
        .fromTo(
          '.dest-monument__art',
          { opacity: 0, yPercent: 12, filter: 'blur(18px)' },
          { opacity: 1, yPercent: 0, filter: 'blur(0px)', duration: 0.65, ease: 'expo.out' },
        )
        .fromTo(
          '.dest-card > *',
          { opacity: 0, y: 26 },
          { opacity: 1, y: 0, duration: 0.7, stagger: 0.07, ease: 'expo.out' },
          0.1,
        )
    }, root)
    return () => ctx.revert()
  }, [active])

  const d = destinations[active]

  return (
    <section id="destinos" className="dest-track" ref={track}>
      <div className="dest-stage" ref={root}>
        {/* Silhueta em primeiro plano, por cima do canvas 3D: o avião voa
            atrás dela, no céu de verdade. */}
        <div className="dest-monument" aria-hidden="true">
          {/* `meet` e não `slice`: com slice a silhueta era ampliada 2,25× e
              tomava a tela inteira. Encaixada na base, ela vira horizonte e
              sobra céu em cima para o avião cruzar. */}
          <svg viewBox="0 0 1200 400" preserveAspectRatio="xMidYMax meet">
            <g className="dest-monument__art" color="rgba(6,8,14,0.92)" fill="currentColor">
              <Monument id={d.monument} />
            </g>
          </svg>
        </div>

        <div className="dest-inner">
          <div className="dest-head">
            <p className="eyebrow">06 — Malha</p>
            <h2 className="display display--m js-split">Escolha uma janela.</h2>
          </div>

          <ul className="dest-list">
            {destinations.map((item, i) => (
              <li key={item.code}>
                <button
                  className={`dest-row${i === active ? ' is-on' : ''}`}
                  onMouseEnter={() => {
                    hovered.current = i
                    apply(i, progress.dest)
                  }}
                  onMouseLeave={() => {
                    hovered.current = null
                    apply(fromScroll.current, progress.dest)
                  }}
                  onFocus={() => {
                    hovered.current = i
                    apply(i, progress.dest)
                  }}
                  onBlur={() => {
                    hovered.current = null
                    apply(fromScroll.current, progress.dest)
                  }}
                  aria-current={i === active}
                >
                  <span className="dest-row__index mono">{String(i + 1).padStart(2, '0')}</span>
                  <span className="dest-row__name">{item.name}</span>
                  <span className="dest-row__code mono">{item.code}</span>
                </button>
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

      {/* Um bloco de altura por destino: é o que dá tempo de scroll para a
          troca de cada cena. */}
      <div style={{ height: `${destinations.length * ROW_VH}vh` }} aria-hidden="true" />
    </section>
  )
}
