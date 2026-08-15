import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { progress, scrollTo } from '../lib/scroll'
import { brand, nav as navItems } from '../content'

export function Nav() {
  const onJump = (e, href) => {
    e.preventDefault()
    const el = document.querySelector(href)
    if (el) scrollTo(el, { offset: -1 })
  }

  return (
    <header className="nav">
      <a className="nav__brand" href="#top" onClick={(e) => onJump(e, '#top')}>
        <img className="nav__logo" src="/logo-nav.png" alt={brand.name} />
        <span>{brand.tag}</span>
      </a>
      <nav className="nav__links" aria-label="Seções">
        {navItems.map((item) => (
          <a key={item.href} href={item.href} onClick={(e) => onJump(e, item.href)}>
            {item.label}
          </a>
        ))}
      </nav>
    </header>
  )
}

/** Fio de progresso no topo. Escrito direto no DOM, um write por frame. */
export function ProgressRail() {
  const fill = useRef(null)

  useEffect(() => {
    const tick = () => {
      if (fill.current) fill.current.style.transform = `scaleX(${progress.page})`
    }
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  }, [])

  return (
    <div className="progress-rail" aria-hidden="true">
      <div className="progress-rail__fill" ref={fill} />
    </div>
  )
}

export function FilmGrain() {
  return (
    <>
      <div className="grain" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />
    </>
  )
}
