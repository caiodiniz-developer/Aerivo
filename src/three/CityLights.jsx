import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { flight } from './state'
import { mulberry32 } from '../lib/math'
import { motionSafe } from '../lib/env'

const vertex = /* glsl */ `
  attribute float aSize;
  attribute float aSeed;
  uniform float uScroll, uSpanZ, uTime, uOpacity, uPixelRatio, uSizeScale;
  varying float vAlpha;
  varying float vSeed;

  void main() {
    float z = mod(position.z + uScroll * 0.55 + uSpanZ * 0.5, uSpanZ) - uSpanZ * 0.5;
    vec4 mv = modelViewMatrix * vec4(position.x, position.y, z, 1.0);
    float dist = -mv.z;

    // Some no limite do campo, senão a borda do plano de luzes aparece.
    float fade = smoothstep(uSpanZ * 0.46, uSpanZ * 0.22, dist) * smoothstep(60.0, 300.0, dist);
    // Cintilação atmosférica: quanto mais longe, mais a luz treme.
    float twinkle = 0.72 + 0.28 * sin(uTime * (0.9 + aSeed * 2.2) + aSeed * 31.0);

    vAlpha = uOpacity * fade * twinkle;
    vSeed = aSeed;
    gl_PointSize = aSize * uPixelRatio * (uSizeScale / max(dist, 80.0));
    gl_Position = projectionMatrix * mv;
  }
`

const fragment = /* glsl */ `
  uniform vec3 uWarm, uCool;
  varying float vAlpha;
  varying float vSeed;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float core = pow(smoothstep(0.5, 0.0, d), 3.0);
    float halo = pow(smoothstep(0.5, 0.1, d), 1.2) * 0.28;
    float a = (core + halo) * vAlpha;
    if (a < 0.004) discard;
    // A maioria sódio-alaranjada, algumas frias — é o que faz a mancha
    // urbana parecer real vista de onze mil metros.
    gl_FragColor = vec4(mix(uWarm, uCool, step(0.86, vSeed)), a);
  }
`

/**
 * Malha urbana lá embaixo: só aparece quando a paleta chega na noite.
 * Fica bem abaixo do mar de nuvens e brilha pelas frestas — as luzes são
 * aditivas, então atravessam as bordas finas dos billboards.
 */
export default function CityLights({ count = 1400, spanX = 3000, spanZ = 3000, y = -520 }) {
  const geometry = useMemo(() => {
    const rand = mulberry32(0x7c31)
    const pos = new Float32Array(count * 3)
    const size = new Float32Array(count)
    const seed = new Float32Array(count)

    // Cidades são aglomerados com subúrbios se esparramando, não ruído branco.
    const cities = Math.max(4, Math.round(count / 90))
    const centers = Array.from({ length: cities }, () => [
      (rand() - 0.5) * spanX,
      (rand() - 0.5) * spanZ,
      60 + rand() * 260,
    ])

    for (let i = 0; i < count; i++) {
      const inCity = rand() < 0.82
      let x, z
      if (inCity) {
        const [cx, cz, r] = centers[(rand() * cities) | 0]
        const a = rand() * Math.PI * 2
        const d = Math.pow(rand(), 1.8) * r
        x = cx + Math.cos(a) * d
        z = cz + Math.sin(a) * d * 1.3
      } else {
        x = (rand() - 0.5) * spanX
        z = (rand() - 0.5) * spanZ
      }
      pos[i * 3] = x
      pos[i * 3 + 1] = y + (rand() - 0.5) * 18
      pos[i * 3 + 2] = z
      size[i] = 0.4 + Math.pow(rand(), 3) * 2.2
      seed[i] = rand()
    }

    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, y, 0), 1e5)
    return g
  }, [count, spanX, spanZ, y])

  const uniforms = useMemo(
    () => ({
      uScroll: { value: 0 },
      uSpanZ: { value: spanZ },
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uPixelRatio: { value: 1 },
      uSizeScale: { value: 1300 },
      uWarm: { value: new THREE.Color('#ffb765') },
      uCool: { value: new THREE.Color('#bcd8ff') },
    }),
    [spanZ],
  )

  useFrame(({ gl }, dt) => {
    if (motionSafe) uniforms.uTime.value += dt
    uniforms.uScroll.value = flight.distance
    uniforms.uOpacity.value = flight.sky.city
    uniforms.uPixelRatio.value = gl.getPixelRatio()
  })

  return (
    <points geometry={geometry} frustumCulled={false} renderOrder={-800}>
      <shaderMaterial
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
