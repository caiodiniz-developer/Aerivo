import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { flight, ENV_LAYER } from './state'
import { getPuffTexture } from './puffTexture'
import { mulberry32 } from '../lib/math'

const vertex = /* glsl */ `
  attribute vec3 aPos;
  attribute vec4 aData;   // x: escala  y: alongamento  z: semente  w: multiplicador de velocidade

  uniform float uScroll;
  uniform float uSpanZ;
  uniform float uTime;
  uniform vec2  uNearFade;  // início/fim do dissolve perto da câmera
  uniform vec3  uSunDir;

  varying vec2  vUv;
  varying float vFade;
  varying float vSunFacing;
  varying float vDepth;
  varying float vSeed;

  void main() {
    vUv = uv;
    vSeed = aData.z;

    // Esteira infinita: as nuvens correm em +Z e reentram pelo fundo. É o
    // mundo que se move, não a câmera — assim a precisão de float nunca
    // degrada, por mais longo que seja o scroll.
    float z = mod(aPos.z + uScroll * aData.w + uSpanZ * 0.5, uSpanZ) - uSpanZ * 0.5;

    // Deriva vertical lenta: massas de ar, não um cenário congelado.
    float drift = sin(uTime * 0.11 + aData.z * 6.2831) * 0.9;
    vec3 wpos = vec3(aPos.x, aPos.y + drift, z);

    vec4 mv = modelViewMatrix * vec4(wpos, 1.0);

    // Billboard em espaço de visão: o quad sempre encara a câmera.
    float ang = aData.z * 6.2831;
    vec2 q = vec2(
      position.x * cos(ang) - position.y * sin(ang),
      position.x * sin(ang) + position.y * cos(ang)
    );
    mv.xy += q * vec2(aData.x * aData.y, aData.x);

    vDepth = -mv.z;
    // Dissolve o que está colado na câmera e o que está no limite do campo.
    // O dissolve de perto é o que impede a câmera de entrar dentro de um
    // billboard e a tela virar uma parede de branco.
    vFade = smoothstep(uNearFade.x, uNearFade.y, vDepth)
          * (1.0 - smoothstep(uSpanZ * 0.32, uSpanZ * 0.5, vDepth));

    // O quanto esta nuvem está entre a câmera e o sol — vira o contorno prateado.
    vSunFacing = max(dot(normalize(wpos - cameraPosition), uSunDir), 0.0);

    gl_Position = projectionMatrix * mv;
  }
`

// Sem os `_pars`: o three já os injeta no prefixo do fragment shader.
const fragment = /* glsl */ `
  uniform sampler2D uTex;
  uniform vec3  uLight, uDark, uSunColor, uFogColor;
  uniform float uOpacity, uSunPower, uFogDensity, uShade;

  varying vec2  vUv;
  varying float vFade;
  varying float vSunFacing;
  varying float vDepth;
  varying float vSeed;

  void main() {
    float mask = texture2D(uTex, vUv).a;
    if (mask < 0.004) discard;

    // Topo pega luz, base fica na própria sombra. Só esse gradiente já dá
    // volume a um cartão plano.
    float up = smoothstep(0.0, 1.0, vUv.y);
    vec3 col = mix(uDark, uLight, mix(0.18, 1.0, up) * uShade + (1.0 - uShade));

    // Contorno prateado: as bordas finas acendem quando o sol está atrás.
    float rim = pow(1.0 - mask, 2.2) * pow(vSunFacing, 4.0);
    col += uSunColor * rim * 1.5 * uSunPower;
    col += uSunColor * pow(up, 3.0) * 0.22 * uSunPower;

    // Névoa manual, igual à do resto da cena.
    float fog = 1.0 - exp(-uFogDensity * uFogDensity * vDepth * vDepth);
    col = mix(col, uFogColor, clamp(fog, 0.0, 1.0));

    float alpha = mask * uOpacity * vFade;
    if (alpha < 0.002) discard;

    gl_FragColor = vec4(col, alpha);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

/**
 * Um banco de nuvens: aglomerados de billboards instanciados em um único
 * draw call, com o deslocamento em Z resolvido dentro do shader.
 */
export default function CloudField({
  clusters = 40,
  puffs = 9,
  spanX = 320,
  spanY = 24,
  spanZ = 620,
  y = 0,
  radius = 22,
  /** Espessura do aglomerado como fração do raio. Baixo = camada achatada. */
  thickness = 0.32,
  scale = [16, 40],
  aspect = 1.6,
  speed = 1,
  opacity = 0.9,
  shade = 1,
  seed = 1,
  renderOrder = 0,
  inEnvMap = true,
  /** Dissolve perto da câmera: [invisível até, opaco a partir de]. */
  nearFade = [2, 40],
  /** Raio livre em torno do eixo de voo — mantém o corredor do avião limpo. */
  clearRadius = 0,
}) {
  const mesh = useRef(null)
  const tex = getPuffTexture()

  const geometry = useMemo(() => {
    const count = clusters * puffs
    const rand = mulberry32(seed * 9176 + 13)
    const pos = new Float32Array(count * 3)
    const data = new Float32Array(count * 4)

    let i = 0
    for (let c = 0; c < clusters; c++) {
      let cx = (rand() - 0.5) * spanX
      let cy = y + (rand() - 0.5) * spanY
      const cz = (rand() - 0.5) * spanZ

      // Empurra para fora do corredor de voo em vez de descartar: descartar
      // rarearia o campo, empurrar mantém a densidade e abre o túnel.
      if (clearRadius > 0) {
        const dx = cx
        const dy = cy - y
        const r = Math.hypot(dx, dy)
        if (r < clearRadius) {
          const k = r < 1e-3 ? clearRadius : clearRadius / r
          cx = dx * k
          cy = y + dy * k
        }
      }

      // Aglomerados achatados: nuvem real espalha na horizontal.
      const rx = radius * (0.7 + rand() * 0.9)
      const ry = radius * thickness
      const speedMul = speed * (0.85 + rand() * 0.3)

      for (let k = 0; k < puffs; k++) {
        const t = k / puffs
        pos[i * 3] = cx + (rand() - 0.5) * rx * 2
        pos[i * 3 + 1] = cy + (rand() - 0.5) * ry * 2 - t * ry * 0.4
        pos[i * 3 + 2] = cz + (rand() - 0.5) * rx * 1.4

        data[i * 4] = scale[0] + rand() * (scale[1] - scale[0])
        data[i * 4 + 1] = aspect * (0.82 + rand() * 0.42)
        data[i * 4 + 2] = rand()
        data[i * 4 + 3] = speedMul
        i++
      }
    }

    const base = new THREE.PlaneGeometry(1, 1)
    const g = new THREE.InstancedBufferGeometry()
    g.index = base.index
    g.setAttribute('position', base.attributes.position)
    g.setAttribute('uv', base.attributes.uv)
    g.setAttribute('aPos', new THREE.InstancedBufferAttribute(pos, 3))
    g.setAttribute('aData', new THREE.InstancedBufferAttribute(data, 4))
    g.instanceCount = count
    // O billboard é montado em espaço de visão; o frustum culling da CPU não
    // sabe disso, então a esfera é grande o bastante para nunca cortar nada.
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5)
    return g
    // `scale` é literal no JSX, então entra por valor e não por referência.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusters, puffs, spanX, spanY, spanZ, y, radius, thickness, scale[0], scale[1], aspect, speed, seed, clearRadius])

  useEffect(() => () => geometry.dispose(), [geometry])

  const uniforms = useMemo(
    () => ({
      uTex: { value: tex },
      uScroll: { value: 0 },
      uSpanZ: { value: spanZ },
      uTime: { value: 0 },
      uNearFade: { value: new THREE.Vector2(nearFade[0], nearFade[1]) },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uLight: { value: new THREE.Color('#ffffff') },
      uDark: { value: new THREE.Color('#8fa5c4') },
      uSunColor: { value: new THREE.Color('#ffffff') },
      uFogColor: { value: new THREE.Color('#c4d9ee') },
      uOpacity: { value: opacity },
      uSunPower: { value: 1 },
      uFogDensity: { value: 0.003 },
      uShade: { value: shade },
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }),
    [tex, spanZ, opacity, shade, nearFade[0], nearFade[1]],
  )

  useEffect(() => {
    if (inEnvMap) mesh.current?.layers.enable(ENV_LAYER)
  }, [inEnvMap])

  useFrame((_, dt) => {
    const s = flight.sky
    uniforms.uScroll.value = flight.distance
    uniforms.uTime.value += dt
    uniforms.uSunDir.value.copy(s.sunDir)
    uniforms.uLight.value.copy(s.cloudLight)
    uniforms.uDark.value.copy(s.cloudDark)
    uniforms.uSunColor.value.copy(s.sun)
    uniforms.uFogColor.value.copy(s.fog)
    uniforms.uSunPower.value = s.sunPower
    uniforms.uFogDensity.value = s.fogDensity
  })

  return (
    <mesh ref={mesh} geometry={geometry} renderOrder={renderOrder} frustumCulled={false}>
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
