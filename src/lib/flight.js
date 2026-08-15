import gsap from 'gsap'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'
import { flight } from '../three/state'

gsap.registerPlugin(MotionPathPlugin)

/**
 * Coreografia da viagem — 100% dirigida pelo scroll.
 *
 * Cada destino é UMA curva só, percorrida por MotionPath com `curviness`.
 * Entrada, manobra e saída são o mesmo caminho contínuo, então não existe
 * emenda entre trechos — era a cadeia de `tl.to()` com coordenadas duras que
 * produzia os saltinhos e as rotações secas na volta de 360°.
 *
 * O avião é um modelo 3D, não um elemento DOM: o MotionPath anima um objeto
 * JS puro (`flight.air`), e o `useFrame` lê `x`, `y` e `rotation` de lá.
 *
 *   x  posição ao longo da tela. −34 fora à direita → +34 fora à esquerda
 *   y  altitude
 *   rotation  graus, escrito pelo `autoRotate` a partir da tangente
 */

export const OFFSCREEN_RIGHT = -34
export const OFFSCREEN_LEFT = 34

const BASE_Y = 7.5

/**
 * Curva do voo normal: sobe, afunda de leve, estabiliza. As variações são
 * pequenas de propósito — o que tira a sensação de linha reta é a curvatura
 * contínua, não a amplitude.
 */
const cruise = (lift) => [
  { x: OFFSCREEN_RIGHT, y: BASE_Y },
  { x: -18, y: BASE_Y + 1.7 * lift },
  { x: -4, y: BASE_Y - 1.3 * lift },
  { x: 12, y: BASE_Y + 0.9 * lift },
  { x: OFFSCREEN_LEFT, y: BASE_Y },
]

/**
 * Curva com looping. O laço tem ~5 unidades de largura por ~4,8 de altura —
 * na escala desta câmera, algo em torno de 210×200px no desktop. Compacto de
 * propósito: o laço anterior tinha raio 7 e varria meia tela na vertical.
 *
 * Repare que o avião AVANÇA durante a volta: entra em x=−6 e sai em −5,4,
 * então é uma espiral rasa, não um pião parado no ar.
 */
const loop = (lift) => {
  const r = 2.4 * lift
  return [
    { x: OFFSCREEN_RIGHT, y: BASE_Y },
    { x: -20, y: BASE_Y + 1.5 * lift },
    { x: -10, y: BASE_Y - 0.6 * lift },
    // entrada no laço, subindo
    { x: -6, y: BASE_Y - 0.3 },
    { x: -6 + r, y: BASE_Y + r },
    { x: -6, y: BASE_Y + r * 2 },
    { x: -6 - r, y: BASE_Y + r },
    // fecha o círculo um pouco à frente de onde entrou
    { x: -5.4, y: BASE_Y - 0.3 },
    { x: 4, y: BASE_Y + 1.1 * lift },
    { x: 16, y: BASE_Y - 0.4 * lift },
    { x: OFFSCREEN_LEFT, y: BASE_Y },
  ]
}

/** O trecho de voo ocupa a maior parte; o resto é a troca de fundo. */
const FLIGHT_PORTION = 0.8
const FADE_PORTION = 0.15

function addSegment(tl, { loop: isLoop, current, next, lift }) {
  const air = flight.air

  tl.set(air, { x: OFFSCREEN_RIGHT, y: BASE_Y, rotation: 0 })

  tl.to(air, {
    motionPath: {
      path: isLoop ? loop(lift) : cruise(lift),
      curviness: 1.3,
      // Única fonte de rotação durante o voo: a tangente da curva. Nenhum
      // outro tween toca em `rotation`, então não há conflito nem reset seco.
      autoRotate: true,
    },
    duration: FLIGHT_PORTION,
  })

  // Com o avião já fora de quadro, os dois fundos se cruzam ao mesmo tempo.
  if (next) {
    tl.to(current, { opacity: 0, scale: 1.03, duration: FADE_PORTION }, '>-0.02')
    tl.fromTo(next, { opacity: 0, scale: 1.03 }, { opacity: 1, scale: 1, duration: FADE_PORTION }, '<')
    // Normalização da rotação só aqui, com o avião invisível.
    tl.set(air, { x: OFFSCREEN_RIGHT, y: BASE_Y, rotation: 0 })
  } else {
    // Último destino: a foto fica; quem a cobre é o painel da seção final.
    tl.to({}, { duration: FADE_PORTION })
  }
}

/**
 * @param {object[]} destinations
 * @param {HTMLElement[]} layers  uma camada de fundo por destino
 * @param {boolean} mobile
 */
export function buildMasterTimeline(destinations, layers, mobile = false) {
  const tl = gsap.timeline({ defaults: { ease: 'none' } })
  const lift = mobile ? 0.6 : 1

  tl.set(layers[0], { opacity: 1, scale: 1 })
  tl.set(layers.slice(1), { opacity: 0, scale: 1.03 })

  destinations.forEach((d, i) => {
    addSegment(tl, { loop: !!d.loop, current: layers[i], next: layers[i + 1], lift })
  })

  return tl
}

/** Pouso do fecho — curva própria, também scrubbed. */
export function buildLandingTimeline(mobile = false) {
  const lift = mobile ? 0.6 : 1
  const tl = gsap.timeline({ defaults: { ease: 'none' } })

  tl.set(flight.air, { x: OFFSCREEN_RIGHT, y: BASE_Y + 6 * lift, rotation: 0 })
  tl.to(flight.air, {
    motionPath: {
      path: [
        { x: OFFSCREEN_RIGHT, y: BASE_Y + 6 * lift },
        { x: -16, y: BASE_Y + 3.4 * lift },
        { x: -6, y: BASE_Y + 0.6 },
        { x: 0, y: BASE_Y - 1.5 },
      ],
      curviness: 1.2,
      autoRotate: true,
    },
    duration: 1,
  })

  return tl
}
