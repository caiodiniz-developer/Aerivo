import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { flight, plane } from './state'
import { band, clamp } from '../lib/math'

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// Sem os `_pars`: o three já os injeta no prefixo do fragment shader.
// `common` entra pelo PI usado no perfil de borda.
const fragment = /* glsl */ `
  #include <common>

  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;

  void main() {
    // vUv.y: 0 na ponta da asa, 1 na cauda da esteira.
    float along = pow(1.0 - vUv.y, 1.5) * smoothstep(0.0, 0.035, vUv.y);
    // Borda macia na largura — uma faixa de alfa constante lê como fita de papel.
    float across = sin(vUv.x * PI);
    across = pow(across, 1.6);
    float a = along * across * uOpacity;
    if (a < 0.003) discard;
    gl_FragColor = vec4(uColor, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

/**
 * Esteira de condensação como fita de geometria.
 *
 * O histórico é mantido em coordenadas de mundo e empurrado em +Z na mesma
 * velocidade da esteira de nuvens a cada frame — é isso que faz o rastro
 * ficar para trás em vez de acompanhar o avião como um adesivo.
 */
export default function Contrail({ side = 'L', samples = 64, width = 0.42, maxOpacity = 0.5 }) {
  const meshRef = useRef(null)
  const started = useRef(false)

  const { geometry, positions } = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const positions = new Float32Array(samples * 2 * 3)
    const uv = new Float32Array(samples * 2 * 2)
    const index = new Uint16Array((samples - 1) * 6)

    for (let i = 0; i < samples; i++) {
      const t = i / (samples - 1)
      uv[i * 4 + 0] = 0
      uv[i * 4 + 1] = t
      uv[i * 4 + 2] = 1
      uv[i * 4 + 3] = t
    }
    for (let i = 0; i < samples - 1; i++) {
      const a = i * 2
      index.set([a, a + 1, a + 2, a + 1, a + 3, a + 2], i * 6)
    }

    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
    g.setIndex(new THREE.BufferAttribute(index, 1))
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4)
    return { geometry: g, positions }
  }, [samples])

  const history = useMemo(
    () => Array.from({ length: samples }, () => new THREE.Vector3()),
    [samples],
  )

  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color('#ffffff') },
      uOpacity: { value: 0 },
    }),
    [],
  )

  const tmp = useMemo(
    () => ({ tangent: new THREE.Vector3(), toCam: new THREE.Vector3(), sideV: new THREE.Vector3() }),
    [],
  )

  useFrame(({ camera }) => {
    const head = side === 'L' ? plane.tipL : plane.tipR

    if (!started.current) {
      if (head.lengthSq() === 0) return // o avião ainda não posou o primeiro frame
      for (const p of history) p.copy(head)
      started.current = true
    }

    // Todo o rastro anda junto com o mundo; só depois entra a amostra nova.
    const dz = flight.dDistance
    for (let i = samples - 1; i > 0; i--) {
      history[i].copy(history[i - 1])
      history[i].z += dz
    }
    history[0].copy(head)

    for (let i = 0; i < samples; i++) {
      const prev = history[Math.max(i - 1, 0)]
      const next = history[Math.min(i + 1, samples - 1)]
      tmp.tangent.subVectors(next, prev)
      if (tmp.tangent.lengthSq() < 1e-8) tmp.tangent.set(0, 0, 1)
      tmp.tangent.normalize()

      tmp.toCam.subVectors(camera.position, history[i]).normalize()
      tmp.sideV.crossVectors(tmp.tangent, tmp.toCam)
      if (tmp.sideV.lengthSq() < 1e-8) tmp.sideV.set(1, 0, 0)
      tmp.sideV.normalize()

      // A esteira nasce fina e se abre conforme se dispersa.
      const t = i / (samples - 1)
      const w = width * (0.28 + Math.pow(t, 0.6) * 2.4)
      const sag = t * t * 0.35 // ela também afunda um pouco

      const o = i * 6
      const p = history[i]
      positions[o + 0] = p.x - tmp.sideV.x * w
      positions[o + 1] = p.y - tmp.sideV.y * w - sag
      positions[o + 2] = p.z - tmp.sideV.z * w
      positions[o + 3] = p.x + tmp.sideV.x * w
      positions[o + 4] = p.y + tmp.sideV.y * w - sag
      positions[o + 5] = p.z + tmp.sideV.z * w
    }

    geometry.attributes.position.needsUpdate = true

    // Rastro de condensação só existe no ar frio e rarefeito da altitude.
    const strength = band(flight.p, 0.14, 0.9, 0.16)
    uniforms.uOpacity.value = strength * maxOpacity * clamp(1 - flight.sky.city * 0.5)
    uniforms.uColor.value.copy(flight.sky.cloudLight)
  })

  return (
    <mesh ref={meshRef} geometry={geometry} frustumCulled={false} renderOrder={20}>
      <shaderMaterial
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
