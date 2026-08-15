import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { splitLines, within, hidden, shown, useResizeKey } from '../lib/split'
import { reducedMotion } from '../lib/env'
import { destinations } from '../content'

export default function Destinations() {
  const root = useRef(null)
  const resizeKey = useResizeKey()

  useLayoutEffect(() => {
    const scope = root.current
    const head = splitLines(within(scope, '.js-split'))

    const ctx = gsap.context(() => {
      gsap.fromTo(head.lines, hidden, {
        ...shown,
        duration: 1.2,
        ease: 'expo.out',
        stagger: 0.08,
        scrollTrigger: { trigger: '.section__head', start: 'top 82%', once: true },
      })

      // Cada linha sobe por trás da régua acima dela — daí o clip.
      gsap.fromTo(
        '.dest',
        { yPercent: 40, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1.05,
          ease: 'expo.out',
          stagger: 0.07,
          scrollTrigger: { trigger: '.destinations', start: 'top 80%', once: true },
        },
      )
    }, scope)

    return () => {
      ctx.revert()
      head.revert()
    }
  }, [resizeKey])

  return (
    <section className="section" id="destinos" ref={root}>
      <div className="section__head">
        <p className="eyebrow">06 — Malha</p>
        <h2 className="display display--m js-split">
          Cento e trinta e dois motivos para olhar pela janela.
        </h2>
      </div>

      <ul className="destinations" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {destinations.map((d, i) => (
          <li className="dest" key={d.code}>
            <span className="dest__glow" />
            <span className="dest__index mono">{String(i + 1).padStart(2, '0')}</span>
            <span className="dest__name">{d.name}</span>
            <span className="dest__code mono">{d.code}</span>
            <span className="dest__time mono">{d.time}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
