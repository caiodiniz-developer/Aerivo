import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { flight, plane } from './state'
import { clamp, damp } from '../lib/math'
import { motionSafe } from '../lib/env'

/**
 * Decupagem em sete planos. `pos` é a posição da câmera; `look` é um
 * deslocamento aplicado à posição do avião — a mira segue a aeronave, então
 * ela nunca sai de quadro por mais que a trajetória a jogue para os lados.
 *
 * O `look` também é o que faz o enquadramento: mirar à direita do avião joga
 * o avião para a esquerda da tela. Cada plano é composto contra o texto do
 * capítulo que cai naquele ponto do scroll — capítulo à esquerda, avião à
 * direita; capítulo centralizado, avião embaixo. Sem isso o avião fica
 * exatamente atrás do título.
 *
 *  0  atrás e abaixo, subindo    3  cruzeiro, perfil lateral
 *  1  ombro, subindo com ele     4  passagem alta
 *  2  perfil, saindo das nuvens  5  contraluz da hora dourada
 *                                6  plano geral, noite chegando
 */
const SHOTS = [
  { pos: [1.5, -13, 26], look: [-3, 1.5, -6], fov: 30, roll: 0.0 },
  { pos: [6.5, -5.5, 19], look: [-6, 1.0, -5], fov: 33, roll: -0.03 },
  { pos: [16, 2, 15], look: [3.4, 0.5, -3], fov: 31, roll: 0.02 },
  { pos: [23, 3.5, -3], look: [4.4, 0.5, 0], fov: 34, roll: 0.0 },
  { pos: [7, 12, -19], look: [2, 7.5, 2], fov: 40, roll: 0.05 },
  { pos: [-19, 0.5, -15], look: [-2, 6.0, 1], fov: 44, roll: -0.05 },
  { pos: [-8, 9, 30], look: [-7, -1.0, -4], fov: 50, roll: 0.02 },
]

const KEY_COUNT = SHOTS.length

/**
 * Plano fixo do trecho de destinos.
 *
 * Câmera em +X olhando para a origem, com o avião voando em −Z: nessa
 * combinação o −Z cai à direita da tela, então ele cruza o quadro da esquerda
 * para a direita, de perfil, indo na direção do monumento. A mira sobe um
 * pouco para o avião ficar no terço superior e deixar a silhueta livre.
 */
const DEST_SHOT = {
  pos: new THREE.Vector3(40, 13, 0),
  // `look` é somado à posição do avião: mirar acima dele o joga para baixo na
  // tela. Aqui a mira desce, então ele sobe para o terço superior — que é a
  // faixa livre acima da silhueta do monumento.
  look: new THREE.Vector3(0, -4, 0),
  fov: 30,
}

/** Fecho: avião parado, de perfil, abaixo do centro do quadro. */
const PARK_SHOT = {
  pos: new THREE.Vector3(34, 4, 0),
  look: new THREE.Vector3(0, 4.6, 0),
  fov: 26,
}

/** Proporção em que os planos foram compostos. */
const REF_ASPECT = 16 / 9

export default function CameraRig() {
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        SHOTS.map((s) => new THREE.Vector3(...s.pos)),
        false,
        'catmullrom',
        0.4,
      ),
    [],
  )

  const tmp = useMemo(
    () => ({
      pos: new THREE.Vector3(),
      look: new THREE.Vector3(),
      offset: new THREE.Vector3(),
      target: new THREE.Vector3(),
    }),
    [],
  )

  const smooth = useRef({ fov: SHOTS[0].fov, roll: 0, shake: 0 })
  const clock = useRef(0)

  useFrame(({ camera }, dt) => {
    clock.current += dt
    const t = clock.current
    const p = clamp(flight.p)

    // Posição base na spline dos planos.
    curve.getPoint(p, tmp.pos)

    // Interpolação linear dos escalares entre os dois planos vizinhos.
    const f = p * (KEY_COUNT - 1)
    const i = Math.min(Math.floor(f), KEY_COUNT - 2)
    const k = f - i
    const a = SHOTS[i]
    const b = SHOTS[i + 1]
    const roll = a.roll + (b.roll - a.roll) * k
    tmp.offset.set(
      a.look[0] + (b.look[0] - a.look[0]) * k,
      a.look[1] + (b.look[1] - a.look[1]) * k,
      a.look[2] + (b.look[2] - a.look[2]) * k,
    )

    // Modo destino: câmera perpendicular à rota, para o avião passar de
    // perfil — é assim que ele "entra" na cena do lugar.
    const db = flight.destBlend
    if (db > 0.001) {
      tmp.pos.lerp(DEST_SHOT.pos, db)
      tmp.offset.lerp(DEST_SHOT.look, db)
    }

    // Fecho: mesmo perfil lateral, mas a mira sobe para o avião assentar
    // abaixo do centro — logo abaixo do botão.
    const pb = flight.parkBlend
    if (pb > 0.001) {
      tmp.pos.lerp(PARK_SHOT.pos, pb)
      tmp.offset.lerp(PARK_SHOT.look, pb)
    }

    // Correção de proporção. Numa tela em pé o campo horizontal encolhe muito;
    // com os mesmos números do 16:9 o avião simplesmente sai de quadro pela
    // lateral. Em tela estreita: abre o campo, afasta a câmera e reduz o
    // deslocamento lateral do enquadramento.
    const narrow = clamp((REF_ASPECT - camera.aspect) / (REF_ASPECT - 0.5))
    const shotFov = a.fov + (b.fov - a.fov) * k
    const blended = shotFov * (1 - db) + DEST_SHOT.fov * db
    const fov = blended * (1 - pb) + PARK_SHOT.fov * pb + narrow * 18
    const pullBack = 1 + narrow * 0.45
    tmp.offset.x *= 1 - narrow * 0.72
    tmp.pos.multiplyScalar(pullBack)

    // Parallax de ponteiro: leve, e sempre em oposição ao cursor. É o que dá
    // a sensação de que existe um operador de câmera atrás do plano.
    const px = flight.mx * 2.4
    const py = flight.my * 1.6

    // Micro-tremor de câmera na mão. Duas frequências irracionais entre si
    // para nunca repetir um padrão perceptível. É movimento autônomo — sai
    // inteiro sob reduced-motion.
    const shake = motionSafe ? 0.14 : 0
    const sx = (Math.sin(t * 0.73) + Math.sin(t * 1.91) * 0.5) * shake
    const sy = (Math.cos(t * 0.61) + Math.sin(t * 1.37) * 0.5) * shake

    camera.position.set(
      damp(camera.position.x, tmp.pos.x - px + sx, 0.14, dt),
      damp(camera.position.y, tmp.pos.y - py + sy, 0.14, dt),
      damp(camera.position.z, tmp.pos.z, 0.14, dt),
    )

    // O alvo é o avião, não um ponto fixo — o enquadramento segue a manobra.
    tmp.target.copy(plane.position).add(tmp.offset)
    tmp.look.lerp(tmp.target, 1 - Math.pow(0.001, dt))
    camera.lookAt(tmp.look)

    // Inclinação de câmera aplicada depois do lookAt, no eixo de visão.
    smooth.current.roll = damp(smooth.current.roll, roll + plane.bank * 0.18, 0.05, dt)
    camera.rotateZ(smooth.current.roll)

    smooth.current.fov = damp(smooth.current.fov, fov, 0.08, dt)
    if (Math.abs(camera.fov - smooth.current.fov) > 0.01) {
      camera.fov = smooth.current.fov
      camera.updateProjectionMatrix()
    }
  }, -10)

  return null
}
