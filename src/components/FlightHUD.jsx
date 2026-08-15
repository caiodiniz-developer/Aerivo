import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { flight } from '../three/state'
import { lerp } from '../lib/math'

const fmt = new Intl.NumberFormat('pt-BR')

/**
 * Leitura de instrumentos sobre a cena.
 *
 * Escreve direto no DOM a partir do ticker do GSAP — passar isso por estado do
 * React seria um re-render por frame só para mudar quatro números.
 */
export default function FlightHUD() {
  const alt = useRef(null)
  const spd = useRef(null)
  const vs = useRef(null)
  const hdg = useRef(null)
  const lat = useRef(null)

  useEffect(() => {
    let lastAlt = 0
    const tick = (_t, dt) => {
      const p = flight.p
      const altitude = lerp(320, 11280, Math.pow(p < 0.4 ? p / 0.4 : 1, 0.75))
      const speed = lerp(285, 903, Math.min(1, p / 0.35))
      const rate = dt > 0 ? ((altitude - lastAlt) / (dt / 1000)) * 60 : 0
      lastAlt = altitude

      if (alt.current) alt.current.textContent = fmt.format(Math.round(altitude))
      if (spd.current) spd.current.textContent = fmt.format(Math.round(speed))
      if (vs.current) vs.current.textContent = (rate >= 0 ? '+' : '') + fmt.format(Math.round(rate))
      if (hdg.current) hdg.current.textContent = String(Math.round(lerp(4, 297, p))).padStart(3, '0')
      if (lat.current) lat.current.textContent = (lerp(-23.55, 51.47, p)).toFixed(2)
    }
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  }, [])

  return (
    <div className="hud" aria-hidden="true">
      <div className="hud__corner hud__corner--tl">
        <div className="hud__row">
          <span className="hud__key">alt</span>
          <span className="hud__val" ref={alt}>
            0
          </span>
          <span className="hud__key">m</span>
        </div>
        <div className="hud__row">
          <span className="hud__key">v/s</span>
          <span className="hud__val" ref={vs}>
            0
          </span>
          <span className="hud__key">m/min</span>
        </div>
      </div>

      <div className="hud__reticle" />

      <div className="hud__corner hud__corner--br">
        <div className="hud__row">
          <span className="hud__key">gs</span>
          <span className="hud__val" ref={spd}>
            0
          </span>
          <span className="hud__key">km/h</span>
        </div>
        <div className="hud__row">
          <span className="hud__key">hdg</span>
          <span className="hud__val" ref={hdg}>
            000
          </span>
          <span className="hud__key">lat</span>
          <span className="hud__val" ref={lat}>
            0.00
          </span>
        </div>
      </div>
    </div>
  )
}
