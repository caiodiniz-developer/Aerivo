import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { flight, plane, TRAVEL } from './state'
import { getGlowTexture } from './puffTexture'
import { band, clamp, damp, lerp } from '../lib/math'
import { motionSafe } from '../lib/env'

/** Rumo do sobrevoo no modo destino: reto, para −Z. */
const FORWARD = new THREE.Vector3(0, 0, -1)

/** Raio do laço de 360°. */
const LOOP_R = 7

/**
 * Orientação do aviao.glb, apurada lendo o binário (ver a análise em
 * scripts/): a matriz do nó raiz do Sketchfab manda o +Y do modelo (onde está
 * a deriva) para o −Z do mundo, ou seja, o nariz nasce apontando para +Z.
 * O `lookAt` do three orienta o −Z local para o alvo, então o modelo precisa
 * de meia volta em Y para "para frente" significar a mesma coisa nos dois.
 */
const MODEL_YAW = Math.PI

/** Comprimento do avião em unidades de cena. Tudo mais é dimensionado a partir daqui. */
const TARGET_LENGTH = 7

/**
 * Exagero da atitude.
 *
 * A trajetória sobe ~13 unidades enquanto o mundo corre 2.600 — o ângulo de
 * subida real seria de menos de 1°, invisível. Estes fatores multiplicam a
 * componente vertical/lateral da velocidade *antes* de derivar a orientação,
 * então o avião arfa uns 14° na subida e guina uns poucos graus nas curvas.
 * Ancorar em TRAVEL (e não na diferença entre duas amostras) mantém o ângulo
 * estável independentemente do passo de amostragem e da parametrização
 * não-uniforme da Catmull-Rom.
 */
const PITCH_GAIN = 16
const YAW_GAIN = 10
const BANK_GAIN = 0.014
const MAX_BANK = 0.42

/** Passo de amostragem da derivada da curva. */
const DP = 0.004

/** Trajetória: sobe, cruza, ondula e começa a descer. */
const PATH = [
  [0.4, -9.5, 0],
  [-0.8, -4.6, 0],
  [0.6, -0.4, 0],
  [2.4, 2.2, 0],
  [0.2, 3.4, 0],
  [-2.6, 2.6, 0],
  [-1.2, 0.6, 0],
  [1.6, -1.2, 0],
  [0.2, -3.6, 0],
]

/** Varre os vértices atrás das duas pontas de asa — de onde saem as esteiras. */
function findWingtips(root) {
  root.updateWorldMatrix(true, true)
  const toLocal = new THREE.Matrix4().copy(root.matrixWorld).invert()
  const v = new THREE.Vector3()
  const m = new THREE.Matrix4()
  const left = new THREE.Vector3(Infinity, 0, 0)
  const right = new THREE.Vector3(-Infinity, 0, 0)

  root.traverse((o) => {
    if (!o.isMesh) return
    const pos = o.geometry.attributes.position
    m.multiplyMatrices(toLocal, o.matrixWorld)
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m)
      if (v.x > right.x) right.copy(v)
      if (v.x < left.x) left.copy(v)
    }
  })
  return { left, right }
}

export default function Aircraft({ url }) {
  const { scene } = useGLTF(url)
  const outer = useRef(null)
  const pivot = useRef(null)

  /* ---- normalização: centrar, escalar e apontar o nariz para −Z ---- */
  const { model, tips, tail, span } = useMemo(() => {
    const model = scene.clone(true)

    model.traverse((o) => {
      if (!o.isMesh) return
      o.castShadow = false
      o.receiveShadow = false
      o.frustumCulled = false
      const mats = Array.isArray(o.material) ? o.material : [o.material]
      for (const mat of mats) {
        // O envMap vem do cubemap do céu; sem isso o alumínio fica de plástico.
        mat.envMapIntensity = 1.25
        if (mat.metalness !== undefined) mat.metalness = Math.max(mat.metalness, 0.72)
        if (mat.roughness !== undefined) mat.roughness = THREE.MathUtils.clamp(mat.roughness, 0.16, 0.45)
        mat.needsUpdate = true
      }
    })

    const box = new THREE.Box3().setFromObject(model)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)

    const scale = TARGET_LENGTH / Math.max(size.z, 1e-6)
    model.position.sub(center)
    model.updateMatrixWorld(true)

    const holder = new THREE.Group()
    holder.add(model)
    holder.scale.setScalar(scale)
    holder.rotation.y = MODEL_YAW

    // Um nível a mais: as medidas precisam sair já com a escala e a meia volta
    // aplicadas, porque é nesse referencial que as luzes e as esteiras vivem.
    const root = new THREE.Group()
    root.add(holder)
    root.updateMatrixWorld(true)

    const tips = findWingtips(root)
    const bounds = new THREE.Box3().setFromObject(root)

    return {
      model: root,
      tips,
      // Nariz em −Z, logo a saída dos motores é o extremo +Z.
      tail: new THREE.Vector3(0, bounds.min.y * 0.25, bounds.max.z * 0.92),
      span: Math.abs(tips.right.x - tips.left.x),
    }
  }, [scene])

  /* ---- percurso ---- */
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        PATH.map((p) => new THREE.Vector3(...p)),
        false,
        'catmullrom',
        0.5,
      ),
    [],
  )

  const tmp = useMemo(
    () => ({
      here: new THREE.Vector3(),
      ahead: new THREE.Vector3(),
      forward: new THREE.Vector3(),
      dummy: new THREE.Object3D(),
    }),
    [],
  )

  const smooth = useRef({ bank: 0 })
  const clock = useRef(0)

  // Elementos que reagem à narrativa: pós-combustão na subida,
  // luzes de navegação à noite.
  const burner = useRef(null)
  const navL = useRef(null)
  const navR = useRef(null)
  const glow = getGlowTexture()

  useFrame((_, dt) => {
    const g = outer.current
    if (!g) return
    clock.current += dt

    const p = clamp(flight.p)
    const t = clock.current

    curve.getPoint(p, tmp.here)
    curve.getPoint(Math.min(p + DP, 1), tmp.ahead)

    // Velocidade em unidades de mundo por unidade de progresso. O mundo corre
    // em +Z a TRAVEL por unidade, então a componente para frente é −TRAVEL e
    // a curva só contribui com desvio lateral/vertical.
    const vx = (tmp.ahead.x - tmp.here.x) / DP
    const vy = (tmp.ahead.y - tmp.here.y) / DP
    tmp.forward.set(vx * YAW_GAIN, vy * PITCH_GAIN, -TRAVEL).normalize()

    // Respiração: o avião nunca fica parado, mesmo com o scroll parado.
    // Some sob reduced-motion — é exatamente o tipo de balanço contínuo que
    // a preferência pede para tirar.
    const bobY = motionSafe ? Math.sin(t * 0.62) * 0.16 + Math.sin(t * 0.23) * 0.1 : 0
    const swayX = motionSafe ? Math.sin(t * 0.41 + 1.7) * 0.2 : 0

    const px = tmp.here.x + swayX + flight.mx * 0.6
    const py = tmp.here.y + bobY - flight.my * 0.4
    const pz = tmp.here.z

    // Curva à esquerda → inclina para a esquerda. Físico, e é o que vende
    // a ideia de que ele está mesmo manobrando. Limitado a ~24°: acima disso
    // deixa de ler como avião de linha e vira caça.
    const targetBank =
      THREE.MathUtils.clamp(-vx * BANK_GAIN, -MAX_BANK, MAX_BANK) +
      (motionSafe ? Math.sin(t * 0.34) * 0.05 : 0)
    smooth.current.bank = damp(smooth.current.bank, targetBank, 0.06, dt)

    // Modo destino: o avião assume uma rota reta e cruza o quadro de perfil,
    // no rumo do monumento. A mistura é gradual, então a transição entre a
    // narrativa do céu e o trecho dos destinos não tem corte.
    const db = flight.destBlend
    const pb = flight.parkBlend
    let fx = px
    let fy = py
    let fz = pz
    let loopAngle = 0

    // Destinos e pouso partilham a mesma pose, escrita por uma timeline. O
    // laço soma um arco por cima da trajetória-base: assim o giro acontece
    // *durante* o deslocamento, e não com o avião parado girando no lugar.
    const rig = Math.max(db, pb)
    if (rig > 0.001) {
      const a = flight.air
      const arcY = LOOP_R * (1 - Math.cos(a.loopAngle))
      const arcZ = -LOOP_R * Math.sin(a.loopAngle)

      fx = lerp(px, 0, rig)
      fy = lerp(py, a.y + arcY, rig)
      fz = lerp(pz, a.z + arcZ, rig)
      loopAngle = (a.pitch + a.loopAngle) * rig
      tmp.forward.lerp(FORWARD, rig).normalize()
      smooth.current.bank *= 1 - rig
    }

    const d = tmp.dummy
    d.position.set(fx, fy, fz)
    // O `lookAt` já embute o arfamento da trajetória — somar pitch aqui
    // contaria a subida duas vezes. Só sobra a respiração.
    d.lookAt(fx + tmp.forward.x, fy + tmp.forward.y, fz + tmp.forward.z)
    d.rotateZ(smooth.current.bank)
    d.rotateX((motionSafe ? Math.sin(t * 0.5) * 0.014 : 0) + loopAngle)
    d.updateMatrixWorld(true)

    g.position.copy(d.position)
    g.quaternion.copy(d.quaternion)
    g.updateMatrixWorld(true)

    plane.position.copy(g.position)
    plane.quaternion.copy(g.quaternion)
    plane.bank = smooth.current.bank
    plane.tipL.copy(tips.left).applyMatrix4(g.matrixWorld)
    plane.tipR.copy(tips.right).applyMatrix4(g.matrixWorld)

    // Pós-combustão: forte na subida, apagando conforme entra em cruzeiro.
    if (burner.current) {
      const thrust = band(p, -0.2, 0.26, 0.14)
      const flicker = 0.82 + Math.sin(t * 41) * 0.1 + Math.sin(t * 17.3) * 0.08
      burner.current.visible = thrust > 0.01
      burner.current.scale.setScalar(TARGET_LENGTH * 0.34 * thrust * flicker)
      burner.current.material.opacity = thrust * 0.9
    }

    // Estroboscópicas de navegação: só fazem sentido quando escurece.
    const night = clamp(flight.sky.stars * 1.4)
    const strobe = motionSafe ? Math.pow((Math.sin(t * 2.4) + 1) * 0.5, 8) : 0.5
    for (const ref of [navL, navR]) {
      if (!ref.current) continue
      ref.current.material.opacity = night * (0.35 + strobe * 0.65)
      ref.current.scale.setScalar(span * 0.16 * (0.85 + strobe * 0.4))
    }
  }, -50)

  const glowMat = (color) => (
    <spriteMaterial
      map={glow}
      color={color}
      transparent
      depthWrite={false}
      blending={THREE.AdditiveBlending}
      opacity={0}
      toneMapped={false}
    />
  )

  return (
    <group ref={outer}>
      <group ref={pivot}>
        <primitive object={model} />

        {/* Pós-combustão */}
        <sprite ref={burner} position={tail.toArray()} scale={0.001}>
          <spriteMaterial
            map={glow}
            color="#ff9a4d"
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            opacity={0}
            toneMapped={false}
          />
        </sprite>

        {/* Luzes de navegação — vermelha a bombordo, verde a boreste */}
        <sprite ref={navL} position={tips.left.toArray()} scale={0.001}>
          {glowMat('#ff3b30')}
        </sprite>
        <sprite ref={navR} position={tips.right.toArray()} scale={0.001}>
          {glowMat('#39ff88')}
        </sprite>
      </group>
    </group>
  )
}
