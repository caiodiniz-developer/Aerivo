import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { flight, ENV_LAYER } from './state'

const vertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    // A esfera é centrada na câmera, então a posição local já é a direção do olhar.
    vDir = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// O three já injeta tonemapping_pars_fragment e colorspace_pars_fragment no
// prefixo de todo fragment shader — reincluí-los aqui redefine as funções e
// o shader não compila. Só os `_fragment` (sem `_pars`) entram no corpo.
const fragment = /* glsl */ `
  uniform vec3 uTop, uMid, uHorizon, uGround, uSunColor, uSunDir;
  uniform float uSunPower;
  varying vec3 vDir;

  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;

    // Empilhamento de três bandas com transições largas — nada de linha dura
    // no horizonte, que é onde o olho procura emenda.
    vec3 col = mix(uGround, uHorizon, smoothstep(-0.42, -0.005, h));
    col = mix(col, uMid, smoothstep(0.0, 0.30, h));
    col = mix(col, uTop, smoothstep(0.24, 0.92, h));

    float sd = max(dot(d, uSunDir), 0.0);

    // Disco + halo apertado + difusão larga. As três escalas juntas é o que
    // dá a sensação de sol de verdade em vez de um ponto branco colado.
    col += uSunColor * pow(sd, 2200.0) * 6.0 * uSunPower;
    col += uSunColor * pow(sd, 48.0) * 0.55 * uSunPower;
    col += uSunColor * pow(sd, 5.0) * 0.16 * uSunPower;
    // O calor perto do horizonte se espalha no eixo horizontal.
    col += uSunColor * pow(sd, 2.0) * 0.07 * uSunPower * smoothstep(0.35, 0.0, abs(h));

    // Dither de 1/255: sem isso um gradiente de céu inteiro mostra banding.
    float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    col += (n - 0.5) / 255.0;

    gl_FragColor = vec4(col, 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export default function SkyDome() {
  const mesh = useRef(null)

  const uniforms = useMemo(
    () => ({
      uTop: { value: new THREE.Color() },
      uMid: { value: new THREE.Color() },
      uHorizon: { value: new THREE.Color() },
      uGround: { value: new THREE.Color() },
      uSunColor: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uSunPower: { value: 1 },
    }),
    [],
  )

  // Também visível para a CubeCamera que gera o reflexo do avião.
  useEffect(() => void mesh.current?.layers.enable(ENV_LAYER), [])

  useFrame(({ camera }) => {
    const s = flight.sky
    uniforms.uTop.value.copy(s.top)
    uniforms.uMid.value.copy(s.mid)
    uniforms.uHorizon.value.copy(s.horizon)
    uniforms.uGround.value.copy(s.ground)
    uniforms.uSunColor.value.copy(s.sun)
    uniforms.uSunDir.value.copy(s.sunDir)
    uniforms.uSunPower.value = s.sunPower
    // O domo acompanha a câmera: ele é infinito, nunca deve se aproximar.
    if (mesh.current) mesh.current.position.copy(camera.position)
  })

  return (
    <mesh ref={mesh} frustumCulled={false} renderOrder={-1000}>
      <sphereGeometry args={[900, 48, 32]} />
      <shaderMaterial
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
        fog={false}
      />
    </mesh>
  )
}
