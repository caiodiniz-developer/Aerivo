import * as THREE from 'three'
import { clamp } from '../lib/math'

/**
 * O céu inteiro é um único gradiente de cinco tempos: amanhecer → dia →
 * hora dourada → hora azul → noite. Tudo (domo, nuvens, luzes, névoa,
 * estrelas, exposição) sai daqui, então nada nunca sai de tom entre si.
 *
 * `at` é a posição no progresso do trilho 3D (0→1).
 *
 * Sobre `fogDensity`: a névoa é exp², então o valor entra ao quadrado junto
 * com a distância. Na escala desta cena (avião = 7 unidades, teto de nuvens a
 * ~1.300 unidades) qualquer coisa acima de ~0,002 transforma o horizonte
 * inteiro em leite. Estes valores dão perspectiva aérea sem apagar o céu.
 */
const KEYS = [
  {
    at: 0.0,
    name: 'amanhecer',
    top: '#0a1734',
    mid: '#2d5390',
    horizon: '#f2a563',
    ground: '#131d31',
    sun: '#ffd7a3',
    sunEl: 3,
    sunAz: 8,
    sunPower: 1.35,
    cloudLight: '#ffd3ab',
    cloudDark: '#3d4d70',
    fog: '#5b6f97',
    fogDensity: 0.00085,
    stars: 0.55,
    city: 0.15,
    exposure: 1.02,
  },
  {
    at: 0.3,
    name: 'dia',
    top: '#0f3374',
    mid: '#3f83c9',
    horizon: '#d6e9f8',
    ground: '#8fb4d6',
    sun: '#fff5e2',
    sunEl: 52,
    sunAz: 24,
    sunPower: 1.0,
    cloudLight: '#ffffff',
    cloudDark: '#9db6d3',
    fog: '#c4d9ee',
    fogDensity: 0.00055,
    stars: 0.0,
    city: 0.0,
    exposure: 1.0,
  },
  {
    at: 0.62,
    name: 'hora dourada',
    top: '#231a4c',
    mid: '#a04a5f',
    horizon: '#ffb257',
    ground: '#553642',
    sun: '#ffb257',
    sunEl: 2,
    sunAz: -46,
    sunPower: 1.9,
    cloudLight: '#ffc98d',
    cloudDark: '#65405e',
    fog: '#c8805f',
    fogDensity: 0.00098,
    stars: 0.1,
    city: 0.18,
    exposure: 1.06,
  },
  {
    at: 0.83,
    name: 'hora azul',
    top: '#060a1e',
    mid: '#1b2a56',
    horizon: '#c86a4c',
    ground: '#0e1428',
    sun: '#e8794a',
    sunEl: -5,
    sunAz: -62,
    sunPower: 1.4,
    cloudLight: '#a8829a',
    cloudDark: '#232c4c',
    fog: '#3f4a72',
    fogDensity: 0.00115,
    stars: 0.7,
    city: 0.62,
    exposure: 1.05,
  },
  {
    at: 1.0,
    name: 'noite',
    top: '#010207',
    mid: '#050b1c',
    horizon: '#14243f',
    ground: '#04060d',
    sun: '#38508a',
    sunEl: -18,
    sunAz: -74,
    sunPower: 0.35,
    cloudLight: '#48587a',
    cloudDark: '#0a1122',
    fog: '#080e1c',
    fogDensity: 0.0013,
    stars: 1.0,
    city: 1.0,
    exposure: 1.12,
  },
]

const COLOR_KEYS = ['top', 'mid', 'horizon', 'ground', 'sun', 'cloudLight', 'cloudDark', 'fog']
const NUM_KEYS = ['sunEl', 'sunAz', 'sunPower', 'fogDensity', 'stars', 'city', 'exposure']

// Hex → THREE.Color uma vez só; o gerenciamento de cor do three converte
// o sRGB do hex para o espaço linear de trabalho.
const parsed = KEYS.map((k) => {
  const out = { at: k.at }
  for (const c of COLOR_KEYS) out[c] = new THREE.Color(k[c])
  for (const n of NUM_KEYS) out[n] = k[n]
  return out
})

/** Alvo mutável — reaproveitado a cada frame para não alocar nada no loop. */
export function createSkyState() {
  const s = { sunDir: new THREE.Vector3(0, 1, 0) }
  for (const c of COLOR_KEYS) s[c] = new THREE.Color()
  for (const n of NUM_KEYS) s[n] = 0
  return s
}

const DEG = Math.PI / 180

/** Amostra a paleta em `p` (0→1) escrevendo dentro de `out`. */
export function sampleSky(p, out) {
  p = clamp(p)
  let i = 0
  while (i < parsed.length - 2 && p > parsed[i + 1].at) i++
  const a = parsed[i]
  const b = parsed[i + 1]
  const raw = clamp((p - a.at) / (b.at - a.at))
  const t = raw * raw * (3 - 2 * raw) // smoothstep

  for (const c of COLOR_KEYS) out[c].copy(a[c]).lerp(b[c], t)
  for (const n of NUM_KEYS) out[n] = a[n] + (b[n] - a[n]) * t

  // Elevação/azimute → direção. O sol descendo é o que dita toda a narrativa
  // de luz da sequência.
  const el = out.sunEl * DEG
  const az = out.sunAz * DEG
  out.sunDir.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize()

  return out
}
