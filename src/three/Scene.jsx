import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { progress } from '../lib/scroll'
import { clamp, damp } from '../lib/math'
import { quality, tier } from '../lib/env'
import { sampleSky } from './palette'
import { flight, ENV_LAYER, TRAVEL, CRUISE } from './state'
import { getGlowTexture } from './puffTexture'
import SkyDome from './SkyDome'
import CloudField from './CloudField'
import Starfield from './Starfield'
import CityLights from './CityLights'
import Aircraft from './Aircraft'
import Contrail from './Contrail'
import CameraRig from './CameraRig'

/**
 * Escreve o estado do frame antes de qualquer outro `useFrame`.
 * Prioridade −100: todo o resto lê valores já resolvidos deste frame.
 */
function Driver() {
  const { gl, scene } = useThree()
  const elapsed = useRef(0)

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05) // uma aba em segundo plano não pode dar um salto
    elapsed.current += d

    flight.raw = progress.sky
    flight.p = damp(flight.p, flight.raw, 0.1, d)
    flight.mx = damp(flight.mx, progress.pointer.x, 0.035, d)
    flight.my = damp(flight.my, progress.pointer.y, 0.035, d)

    const before = flight.distance
    flight.distance = flight.p * TRAVEL + elapsed.current * CRUISE
    flight.dDistance = flight.distance - before

    sampleSky(flight.p, flight.sky)

    gl.toneMappingExposure = flight.sky.exposure
    if (scene.fog) {
      scene.fog.color.copy(flight.sky.fog)
      scene.fog.density = flight.sky.fogDensity
    }
  }, -100)

  return null
}

/** Sol, luz ambiente do céu e um contraluz para descolar o avião do fundo. */
function Lights() {
  const sun = useRef(null)
  const hemi = useRef(null)
  const rim = useRef(null)

  useFrame(() => {
    const s = flight.sky
    if (sun.current) {
      sun.current.position.copy(s.sunDir).multiplyScalar(140)
      sun.current.color.copy(s.sun)
      // A luz direta morre junto com o sol, mas nunca chega a zero — na noite
      // sobra o suficiente para o metal ainda ter forma.
      sun.current.intensity = 0.35 + 2.6 * s.sunPower * clamp(s.sunDir.y * 2.6 + 0.42)
    }
    if (hemi.current) {
      hemi.current.color.copy(s.mid)
      hemi.current.groundColor.copy(s.cloudDark)
      hemi.current.intensity = 0.45 + (1 - s.stars) * 0.55
    }
    if (rim.current) {
      rim.current.position.set(-s.sunDir.x * 90, 40, -s.sunDir.z * 90)
      rim.current.color.copy(s.horizon)
      rim.current.intensity = 0.55
    }
  }, -40)

  return (
    <>
      <hemisphereLight ref={hemi} intensity={0.6} />
      <directionalLight ref={sun} intensity={2} />
      <directionalLight ref={rim} intensity={0.5} />
    </>
  )
}

/**
 * Cubemap do céu usado como ambiente do avião.
 *
 * Só a camada ENV_LAYER entra, então o avião não se reflete em si mesmo.
 * Atualizado a cada N frames: a paleta muda devagar, refazer o cubo todo
 * frame seria pagar seis renders por nada.
 */
function SkyEnvironment({ every = 10 }) {
  const { gl, scene } = useThree()
  const n = useRef(0)

  const { rt, cam } = useMemo(() => {
    const rt = new THREE.WebGLCubeRenderTarget(tier === 'high' ? 128 : 64, {
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
    })
    const cam = new THREE.CubeCamera(1, 1400, rt)
    for (const child of cam.children) child.layers.set(ENV_LAYER)
    return { rt, cam }
  }, [])

  useEffect(() => {
    scene.environment = rt.texture
    return () => {
      scene.environment = null
      rt.dispose()
    }
  }, [scene, rt])

  useFrame(({ camera }) => {
    if (n.current++ % every !== 0) return
    cam.position.copy(camera.position)
    cam.update(gl, scene)
  }, -20)

  return null
}

/** Clarão aditivo sobre o disco solar do domo — o "bloom" sem custo de pós. */
function SunGlare() {
  const ref = useRef(null)
  const glow = getGlowTexture()

  useFrame(({ camera }) => {
    const s = flight.sky
    const sp = ref.current
    if (!sp) return
    sp.position.copy(s.sunDir).multiplyScalar(420).add(camera.position)
    const above = clamp(s.sunDir.y * 5 + 0.6)
    const strength = s.sunPower * above
    sp.material.color.copy(s.sun)
    sp.material.opacity = strength * 0.5
    sp.scale.setScalar(90 + strength * 130)
    sp.visible = strength > 0.02
  })

  return (
    <sprite ref={ref} renderOrder={-950}>
      <spriteMaterial
        map={glow}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
        opacity={0}
        toneMapped={false}
      />
    </sprite>
  )
}

export default function Scene({ modelUrl }) {
  const q = quality
  const heavy = tier !== 'low'

  return (
    <>
      <fogExp2 attach="fog" args={['#c4d9ee', 0.003]} />

      <Driver />
      <CameraRig />
      <Lights />
      <SkyEnvironment every={tier === 'high' ? 8 : 16} />
      <SkyDome />
      <SunGlare />
      <Starfield count={q.stars} />

      {/* Mar de nuvens: o chão da cena. Achatado e bem abaixo de propósito —
          o billboard é quadrado, então sem `thickness` baixo e sem `aspect`
          alto os sopros crescem para cima e engolem a câmera. É a distância
          desta camada que dá a leitura de altitude. */}
      <CloudField
        seed={11}
        clusters={q.clusters}
        puffs={q.puffs}
        y={-150}
        spanX={2800}
        spanY={22}
        spanZ={2600}
        radius={260}
        thickness={0.05}
        scale={[80, 150]}
        aspect={4}
        speed={0.34}
        opacity={1}
        nearFade={[140, 560]}
        renderOrder={0}
      />

      {/* Cirros altos: dão teto e escala. */}
      <CloudField
        seed={29}
        clusters={Math.round(q.clusters * 0.45)}
        puffs={Math.max(4, Math.round(q.puffs * 0.6))}
        y={330}
        spanX={2600}
        spanY={60}
        spanZ={2600}
        radius={320}
        thickness={0.05}
        scale={[90, 190]}
        aspect={5}
        speed={0.2}
        opacity={0.3}
        shade={0.3}
        nearFade={[60, 400]}
        renderOrder={1}
      />

      {/* Camada por onde o avião passa — a que dá a sensação de velocidade.
          `clearRadius` abre um túnel no eixo de voo e o dissolve de perto
          apaga o que chegaria perto demais da lente. */}
      <CloudField
        seed={47}
        clusters={Math.round(q.clusters * 0.55)}
        puffs={q.puffs}
        y={-4}
        spanX={620}
        spanY={150}
        spanZ={1500}
        radius={52}
        thickness={0.3}
        scale={[38, 105]}
        aspect={1.6}
        speed={1}
        opacity={0.62}
        clearRadius={72}
        nearFade={[45, 240]}
        renderOrder={2}
        inEnvMap={false}
      />

      <CityLights count={q.cityLights} />

      <Suspense fallback={null}>
        <Aircraft url={modelUrl} />
      </Suspense>

      {heavy && (
        <>
          <Contrail side="L" samples={q.trail} />
          <Contrail side="R" samples={q.trail} />
        </>
      )}
    </>
  )
}
