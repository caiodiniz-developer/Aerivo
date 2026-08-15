import gsap from 'gsap'
import { flight } from '../three/state'

/**
 * Coreografia do voo entre destinos.
 *
 * Uma timeline por travessia, e uma só de cada vez. Quem escreve a pose é o
 * GSAP; quem lê é o `useFrame` do avião. Nada de `setTimeout`, nada de duas
 * animações disputando os mesmos números.
 *
 * Sistema de coordenadas: a câmera do trecho olha de +X para a origem, então
 * −Z cai à DIREITA da tela. O voo é sempre de z negativo para z positivo.
 */

/** Fora de quadro dos dois lados. A borda visível fica em |z| ≈ 19. */
export const OFFSCREEN_RIGHT = -34
export const OFFSCREEN_LEFT = 34

/** Altitude de cruzeiro da travessia. */
const BASE_Y = 7.5

/** Inclinações sutis: ~4° subindo, ~3° descendo. */
const PITCH_UP = 0.075
const PITCH_DOWN = -0.055

/**
 * Estados possíveis. O índice do destino só muda em `changing-destination` —
 * nunca durante o voo, que é o que mantém foto e avião em sincronia.
 *
 * entering → flying → maneuver? → leaving → changing-destination → entering
 */
/**
 * Posse exclusiva da pose.
 *
 * Só uma timeline pode escrever em `flight.air` por vez. Sem isto, ao entrar
 * no fecho a travessia dos destinos continuava viva e disputava os mesmos
 * números com o pouso — o avião simplesmente sumia. Quem começa, toma.
 */
let owner = null

export function releaseFlight() {
  owner?.kill()
  owner = null
  gsap.killTweensOf(flight.air)
}

const take = (tl) => {
  releaseFlight()
  owner = tl
  return tl
}

export const FlightState = {
  ENTERING: 'entering',
  FLYING: 'flying',
  MANEUVER: 'maneuver',
  LEAVING: 'leaving',
  CHANGING: 'changing-destination',
}

/**
 * Monta a travessia de um destino.
 *
 * @param {object} opts
 * @param {boolean} opts.loop        executa a manobra de 360° no meio
 * @param {(s:string)=>void} opts.onState  avisa a mudança de estado
 * @param {()=>void} opts.onComplete chamado com o avião já fora de quadro
 */
export function buildCrossing({ loop, onState, onComplete }) {
  const air = flight.air
  const tl = take(gsap.timeline({ onComplete }))
  const mark = (s) => () => onState?.(s)

  // Nasce fora, à direita. Como está invisível, o "teletransporte" do reset
  // acontece aqui e o usuário nunca vê.
  tl.set(air, { z: OFFSCREEN_RIGHT, y: BASE_Y, pitch: 0, loopAngle: 0 })
  tl.call(mark(FlightState.ENTERING))

  // Entra e ganha altura — o primeiro respiro da trajetória.
  tl.to(air, {
    z: -14,
    y: BASE_Y + 1.7,
    pitch: PITCH_UP,
    duration: 1.6,
    ease: 'sine.inOut',
  })

  tl.call(mark(FlightState.FLYING))

  // Afunda de leve e nivela: é essa segunda curva que tira a sensação de
  // objeto deslizando na horizontal.
  tl.to(air, {
    z: loop ? -3 : 4,
    y: BASE_Y - 1.3,
    pitch: PITCH_DOWN,
    duration: 1.4,
    ease: 'sine.inOut',
  })

  if (loop) {
    tl.call(mark(FlightState.MANEUVER))
    // Manobra: perde velocidade horizontal e faz o laço. O avanço em z segue
    // acontecendo *durante* a rotação — parado seria pião, não avião de papel.
    tl.to(air, { z: '+=7', y: BASE_Y, pitch: 0, duration: 1.05, ease: 'sine.inOut' })
    tl.to(air, { loopAngle: Math.PI * 2, duration: 1.05, ease: 'power1.inOut' }, '<')
    // 2π ≡ 0: zera para o próximo voo não começar de uma volta inteira.
    tl.set(air, { loopAngle: 0 })
    // Retoma o ritmo.
    tl.to(air, { z: '+=6', y: BASE_Y + 0.6, pitch: PITCH_UP * 0.5, duration: 0.9, ease: 'sine.out' })
  }

  tl.call(mark(FlightState.LEAVING))

  // Sai por completo pela esquerda. Só depois disto o destino troca.
  tl.to(air, {
    z: OFFSCREEN_LEFT,
    y: BASE_Y + 0.4,
    pitch: 0,
    duration: 1.7,
    ease: 'power1.in',
  })

  return tl
}

/**
 * Pouso do fecho: entra pela direita mais alto e desce na diagonal até parar
 * centralizado. `power2.out` dá a desaceleração; a inclinação vai de nariz
 * baixo a nivelado, como um avião assentando.
 */
export function buildLanding() {
  const air = flight.air
  const tl = take(gsap.timeline())

  tl.set(air, { z: OFFSCREEN_RIGHT, y: BASE_Y + 6, pitch: -0.07, loopAngle: 0 })
  tl.to(air, { z: -9, y: BASE_Y + 2.2, pitch: -0.045, duration: 1.5, ease: 'sine.inOut' })
  tl.to(air, { z: 0, y: BASE_Y - 1.5, pitch: 0, duration: 1.7, ease: 'power2.out' })

  return tl
}
