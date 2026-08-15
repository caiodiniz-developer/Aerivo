import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { flight } from './state'
import { mulberry32 } from '../lib/math'
import { motionSafe } from '../lib/env'

const vertex = /* glsl */ `
  attribute float aSize;
  attribute float aSeed;
  uniform float uTime, uOpacity, uPixelRatio;
  varying float vAlpha;
  varying float vWarm;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    // Cintilação com período próprio por estrela — em fase todas juntas
    // vira pisca-pisca, e o olho percebe na hora.
    float tw = 0.68 + 0.32 * sin(uTime * (0.5 + aSeed * 1.9) + aSeed * 53.0);
    vAlpha = uOpacity * tw;
    vWarm = aSeed;
    gl_PointSize = aSize * uPixelRatio;
  }
`

const fragment = /* glsl */ `
  uniform vec3 uCool, uWarm;
  varying float vAlpha;
  varying float vWarm;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = pow(smoothstep(0.5, 0.0, d), 2.2);
    if (a * vAlpha < 0.004) discard;
    gl_FragColor = vec4(mix(uCool, uWarm, vWarm), a * vAlpha);
  }
`

export default function Starfield({ count = 1800, radius = 480 }) {
  const points = useRef(null)

  const geometry = useMemo(() => {
    const rand = mulberry32(0x2b17)
    const pos = new Float32Array(count * 3)
    const size = new Float32Array(count)
    const seed = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      // Distribuição uniforme na esfera (o método ingênuo acumula nos polos).
      const u = rand() * 2 - 1
      const th = rand() * Math.PI * 2
      const r = Math.sqrt(1 - u * u)
      pos[i * 3] = Math.cos(th) * r * radius
      pos[i * 3 + 1] = u * radius
      pos[i * 3 + 2] = Math.sin(th) * r * radius
      // Poucas brilhantes, muitas fracas — a magnitude real é assim.
      size[i] = 0.7 + Math.pow(rand(), 4) * 5.2
      seed[i] = rand()
    }

    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), radius * 1.2)
    return g
  }, [count, radius])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uPixelRatio: { value: 1 },
      uCool: { value: new THREE.Color('#cfe0ff') },
      uWarm: { value: new THREE.Color('#ffd9b0') },
    }),
    [],
  )

  useFrame(({ camera, gl }, dt) => {
    // A cintilação é o único movimento daqui; congela sob reduced-motion.
    if (motionSafe) uniforms.uTime.value += dt
    uniforms.uOpacity.value = flight.sky.stars
    uniforms.uPixelRatio.value = gl.getPixelRatio()
    if (points.current) points.current.position.copy(camera.position)
  })

  return (
    <points ref={points} geometry={geometry} frustumCulled={false} renderOrder={-900}>
      <shaderMaterial
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
