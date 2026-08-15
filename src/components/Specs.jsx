import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { reducedMotion } from '../lib/env'

const fmt = new Intl.NumberFormat('pt-BR')

/** Painel de dados de voo. Os números sobem até o valor ao entrar em quadro. */
export default function Specs({ items }) {
  const root = useRef(null)

  useLayoutEffect(() => {
    if (reducedMotion) return
    const ctx = gsap.context(() => {
      const nodes = gsap.utils.toArray('.js-count')
      nodes.forEach((node) => {
        const target = Number(node.dataset.value)
        const proxy = { v: 0 }
        gsap.to(proxy, {
          v: target,
          duration: 2.1,
          ease: 'expo.out',
          // Dispara já na borda inferior da viewport. Um start mais tarde
          // ('top 88%') deixava a contagem por terminar — ou nem começar — em
          // saltos de scroll grandes, e o painel aparecia zerado.
          scrollTrigger: { trigger: node, start: 'top bottom-=5%', once: true },
          onUpdate: () => {
            node.textContent = fmt.format(Math.round(proxy.v))
          },
        })
      })

      gsap.from('.spec', {
        opacity: 0,
        y: 40,
        duration: 1.1,
        ease: 'expo.out',
        stagger: 0.09,
        scrollTrigger: { trigger: root.current, start: 'top bottom-=5%', once: true },
      })
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <div className="specs js-late" ref={root}>
      {items.map((s) => (
        <div className="spec" key={s.label}>
          <div className="spec__value">
            <span className="js-count mono" data-value={s.n}>
              {reducedMotion ? fmt.format(s.n) : '0'}
            </span>
            <span className="spec__unit">{s.unit}</span>
          </div>
          <div className="spec__label">{s.label}</div>
        </div>
      ))}
    </div>
  )
}
