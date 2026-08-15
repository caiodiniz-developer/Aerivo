import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { splitLines, within, hidden, shown, revealDuration, useResizeKey } from '../lib/split'

/**
 * Um bloco de texto do trecho 3D.
 *
 * Diferente da sequência de vídeo, aqui o reveal *toca* em vez de ser
 * arrastado pelo scroll: o texto precisa de ritmo próprio para ser lido, e o
 * cenário atrás já carrega o movimento contínuo.
 */
export default function SkyChapter({ id, align = 'left', wide = false, eyebrow, title, body, children }) {
  const root = useRef(null)
  const resizeKey = useResizeKey()

  useLayoutEffect(() => {
    const scope = root.current
    const brow = within(scope, '.js-eyebrow')
    const late = within(scope, '.js-late')
    const { lines, revert } = splitLines(within(scope, '.js-split'))

    const ctx = gsap.context(() => {
      if (brow.length) gsap.set(brow, { opacity: 0, y: 24 })
      if (lines.length) gsap.set(lines, hidden)

      // Fade do bloco inteiro amarrado ao scroll. Sem isso dois capítulos
      // ficam legíveis ao mesmo tempo na virada — o de saída, ainda em cima,
      // e o de entrada, já revelado. Aqui eles se cruzam.
      gsap.fromTo(
        scope,
        { opacity: 0 },
        {
          opacity: 1,
          ease: 'none',
          scrollTrigger: { trigger: scope, start: 'top 88%', end: 'top 42%', scrub: true },
        },
      )
      gsap.to(scope, {
        opacity: 0,
        ease: 'none',
        scrollTrigger: { trigger: scope, start: 'bottom 76%', end: 'bottom 26%', scrub: true },
      })

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: scope,
          start: 'top 62%',
          end: 'bottom 34%',
          toggleActions: 'play reverse play reverse',
        },
        defaults: { ease: 'expo.out' },
      })

      if (brow.length) tl.to(brow, { opacity: 1, y: 0, duration: 0.9 })
      if (lines.length) {
        tl.to(
          lines,
          { ...shown, duration: revealDuration, stagger: 0.075 },
          brow.length ? '-=0.7' : 0,
        )
      }
      if (late.length) tl.fromTo(late, { opacity: 0, y: 34 }, { opacity: 1, y: 0, duration: 1 }, '-=0.85')
    }, scope)

    return () => {
      ctx.revert()
      revert()
    }
  }, [resizeKey])

  return (
    <section
      id={id}
      ref={root}
      className={[
        'sky-chapter',
        align === 'right' && 'sky-chapter--right',
        align === 'center' && 'sky-chapter--center',
        wide && 'sky-chapter--wide',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="sky-chapter__inner">
        {eyebrow && <p className="eyebrow js-eyebrow">{eyebrow}</p>}
        <h2 className="display display--m js-split">{title}</h2>
        {body?.map((p, i) => (
          <p className="lede js-split" key={i}>
            {p}
          </p>
        ))}
        {children}
      </div>
    </section>
  )
}
