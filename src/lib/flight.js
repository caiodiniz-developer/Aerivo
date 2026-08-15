import gsap from 'gsap'
import { flight } from '../three/state'

/**
 * Coreografia da viagem — 100% dirigida pelo scroll.
 *
 * Uma master timeline, `ease: 'none'` em tudo, ligada a um ScrollTrigger com
 * `scrub`. Nada aqui roda sozinho: não há `onComplete`, `delayedCall` nem
 * timer. A posição do avião é literalmente uma função do progresso do scroll,
 * então parar o dedo para o avião e voltar o scroll desfaz a manobra.
 *
 * Cada destino recebe um segmento de duração 1 — faixas exatamente iguais,
 * derivadas de `destinations.length`, para nenhum ser pulado.
 *
 * Sistema de coordenadas: a câmera do trecho olha de +X para a origem, então
 * −Z cai à DIREITA da tela. O voo vai sempre de z negativo para z positivo.
 */

/** Fora de quadro dos dois lados. A borda visível fica em |z| ≈ 19. */
export const OFFSCREEN_RIGHT = -34
export const OFFSCREEN_LEFT = 34

const BASE_Y = 7.5

/** Inclinações sutis: ~4° subindo, ~3° descendo. */
const PITCH_UP = 0.075
const PITCH_DOWN = -0.055

/** Raio do laço. Precisa casar com LOOP_R do Aircraft. */
const LOOP_R = 7

/**
 * Um segmento de destino. Soma exatamente 1 de duração.
 *
 *   0.00 → 0.62   travessia (com laço no meio, se for o caso)
 *   0.62 → 0.80   saída completa pela esquerda
 *   0.80 → 0.96   crossfade para o próximo destino
 *   0.96          reset invisível para fora da direita
 */
function addSegment(tl, { loop, current, next, mobile }) {
  const air = flight.air
  const lift = mobile ? 0.55 : 1 // no mobile o desenho vertical é mais discreto

  // Entrada pela direita, ganhando altura.
  tl.to(air, {
    z: -14,
    y: BASE_Y + 1.7 * lift,
    pitch: PITCH_UP * lift,
    duration: 0.24,
  })

  // Afunda de leve: é esta segunda curva que tira a sensação de linha reta.
  tl.to(air, {
    z: loop ? -4 : 4,
    y: BASE_Y - 1.3 * lift,
    pitch: PITCH_DOWN * lift,
    duration: 0.22,
  })

  if (loop) {
    // Laço: x, y e rotação ao mesmo tempo. O avanço em z continua durante a
    // volta — parado no eixo seria pião, não avião de papel. O arco em si é
    // somado pelo Aircraft a partir de `loopAngle`, então aqui só conduzimos
    // a trajetória-base e o ângulo, e os dois avançam juntos.
    tl.to(air, { z: '+=8', y: BASE_Y, pitch: 0, duration: 0.16 })
    tl.to(air, { loopAngle: Math.PI * 2, duration: 0.16 }, '<')
    // 2π ≡ 0: zera para a rotação não acumular de destino em destino.
    tl.set(air, { loopAngle: 0 })
    tl.to(air, { z: '+=5', y: BASE_Y + 0.6 * lift, pitch: PITCH_UP * 0.4 * lift, duration: 0.1 })
  }

  // Sai por completo pela esquerda.
  tl.to(air, { z: OFFSCREEN_LEFT, y: BASE_Y + 0.4, pitch: 0, duration: loop ? 0.12 : 0.34 })

  // Só agora, com o avião fora de quadro, os fundos se cruzam — os dois ao
  // mesmo tempo (`'<'`), nunca em sequência, senão abre preto no meio.
  if (next) {
    tl.to(current, { opacity: 0, scale: 1.03, duration: 0.15 }, '>-0.02')
    tl.fromTo(next, { opacity: 0, scale: 1.03 }, { opacity: 1, scale: 1, duration: 0.15 }, '<')

    // Reset invisível: o avião já está fora, então o "teletransporte" não é
    // visto — e, ao voltar o scroll, ele reaparece pela esquerda corretamente.
    tl.set(air, { z: OFFSCREEN_RIGHT, y: BASE_Y, pitch: 0, loopAngle: 0 })
  } else {
    // Último destino: a foto FICA. Apagá-la aqui era o que abria a tela preta
    // entre a última viagem e o CTA — quem a cobre é o painel próprio da
    // seção final, que entra por cima no scroll seguinte. E nada de reset:
    // a jornada é linear, não volta ao primeiro país.
    tl.to({}, { duration: 0.15 })
  }
}

/**
 * @param {object[]} destinations
 * @param {HTMLElement[]} layers  uma camada de fundo por destino, empilhadas
 * @param {boolean} mobile
 */
export function buildMasterTimeline(destinations, layers, mobile = false) {
  const tl = gsap.timeline({ defaults: { ease: 'none' } })

  // Estado de partida: primeiro fundo visível, avião fora à direita.
  tl.set(layers[0], { opacity: 1, scale: 1 })
  tl.set(layers.slice(1), { opacity: 0, scale: 1.03 })
  tl.set(flight.air, { z: OFFSCREEN_RIGHT, y: BASE_Y, pitch: 0, loopAngle: 0 })

  destinations.forEach((d, i) => {
    addSegment(tl, {
      loop: !!d.loop,
      current: layers[i],
      next: layers[i + 1],
      mobile,
    })
  })

  return tl
}

/**
 * Pouso do fecho — timeline própria, também scrubbed, sem relação com a dos
 * destinos. Entra pela direita mais alto, desce na diagonal e nivela.
 */
export function buildLandingTimeline(mobile = false) {
  const air = flight.air
  const lift = mobile ? 0.6 : 1
  const tl = gsap.timeline({ defaults: { ease: 'none' } })

  tl.set(air, { z: OFFSCREEN_RIGHT, y: BASE_Y + 6 * lift, pitch: -0.07, loopAngle: 0 })
  tl.to(air, { z: -9, y: BASE_Y + 2.2 * lift, pitch: -0.045, duration: 0.45 })
  tl.to(air, { z: 0, y: BASE_Y - 1.5, pitch: 0, duration: 0.55 })

  return tl
}

export { LOOP_R }
