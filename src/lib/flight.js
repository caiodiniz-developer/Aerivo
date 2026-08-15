import gsap from 'gsap'
import { flight } from '../three/state'

/**
 * Coreografia da viagem — 100% dirigida pelo scroll.
 *
 * Deliberadamente simples: o avião atravessa reto, da direita para a esquerda,
 * numa linha horizontal fixa. Sem curva, sem laço, sem rotação, sem manobra
 * por país. Um tween por travessia.
 *
 * A escolha é consciente: entre efeito complexo e movimento impecável, aqui
 * vale o movimento. Um único tween linear é também o que não tem como
 * engasgar — não há emenda entre trechos nem tangente para quebrar.
 *
 *   x  −34 fora à direita  →  +34 fora à esquerda
 *   y  altitude, constante durante todo o voo
 */

export const OFFSCREEN_RIGHT = -34
export const OFFSCREEN_LEFT = 34

/** Linha de voo. Fica acima do centro, na faixa livre da composição. */
const FLIGHT_Y = 7.5

/** Proporções do segmento: travessia e, com o avião já fora, a troca de foto. */
const FLIGHT_PORTION = 0.82
const FADE_PORTION = 0.18

function addSegment(tl, { current, next }) {
  const air = flight.air

  // Um tween só, reto, `ease: 'none'`: a posição é função direta do scroll.
  tl.fromTo(
    air,
    { x: OFFSCREEN_RIGHT, y: FLIGHT_Y },
    { x: OFFSCREEN_LEFT, y: FLIGHT_Y, duration: FLIGHT_PORTION },
  )

  if (next) {
    // Com o avião fora de quadro, os dois fundos se cruzam ao mesmo tempo —
    // nunca em sequência, senão abre preto no meio.
    tl.to(current, { opacity: 0, scale: 1.03, duration: FADE_PORTION }, '>-0.02')
    tl.fromTo(
      next,
      { opacity: 0, scale: 1.03 },
      { opacity: 1, scale: 1, duration: FADE_PORTION },
      '<',
    )
    // Reset invisível: o avião já saiu, então o usuário não vê a volta.
    tl.set(air, { x: OFFSCREEN_RIGHT, y: FLIGHT_Y })
  } else {
    // Último destino: a foto fica; quem a cobre é o painel da seção final.
    tl.to({}, { duration: FADE_PORTION })
  }
}

/**
 * @param {object[]} destinations
 * @param {HTMLElement[]} layers  uma camada de fundo por destino
 */
export function buildMasterTimeline(destinations, layers) {
  const tl = gsap.timeline({ defaults: { ease: 'none' } })

  tl.set(layers[0], { opacity: 1, scale: 1 })
  tl.set(layers.slice(1), { opacity: 0, scale: 1.03 })

  destinations.forEach((d, i) => {
    addSegment(tl, { current: layers[i], next: layers[i + 1] })
  })

  return tl
}

/**
 * Chegada do fecho: entra reto pela direita, já na altura em que vai parar, e
 * encosta abaixo do botão. Sem diagonal, sem descida, sem rotação.
 */
export function buildLandingTimeline() {
  const tl = gsap.timeline({ defaults: { ease: 'none' } })

  tl.fromTo(
    flight.air,
    { x: OFFSCREEN_RIGHT, y: FLIGHT_Y },
    { x: 0, y: FLIGHT_Y, duration: 1 },
  )

  return tl
}
