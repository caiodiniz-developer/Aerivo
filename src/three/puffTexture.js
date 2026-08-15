import * as THREE from 'three'
import { mulberry32 } from '../lib/math'

let cached = null
let glow = null

/** Halo radial usado nas luzes de navegação, no pós-combustão e no sol. */
export function getGlowTexture(size = 128) {
  if (glow) return glow
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  // Núcleo pequeno e duro com queda longa: é o perfil que lê como "luz",
  // e não como "bolinha borrada".
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.08, 'rgba(255,255,255,0.85)')
  g.addColorStop(0.22, 'rgba(255,255,255,0.32)')
  g.addColorStop(0.55, 'rgba(255,255,255,0.07)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  glow = new THREE.CanvasTexture(canvas)
  glow.colorSpace = THREE.NoColorSpace
  return glow
}

/**
 * Textura de "sopro" de nuvem, desenhada em canvas.
 *
 * Feita em código de propósito: nenhum arquivo extra para baixar, e o alfa sai
 * com a curva exata que o billboard precisa — núcleo denso, borda que dissolve
 * em nada. Uma borda dura aqui denuncia o cartão retangular na hora.
 */
export function getPuffTexture(size = 256) {
  if (cached) return cached

  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const rand = mulberry32(0x51f7)

  // Lóbulos sobrepostos: uma nuvem é um aglomerado, não um círculo.
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 22; i++) {
    const a = rand() * Math.PI * 2
    const r = Math.pow(rand(), 0.55) * size * 0.2
    const x = size / 2 + Math.cos(a) * r
    const y = size / 2 + Math.sin(a) * r * 0.7
    const rad = size * (0.09 + rand() * 0.15)
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad)
    g.addColorStop(0, 'rgba(255,255,255,0.40)')
    g.addColorStop(0.42, 'rgba(255,255,255,0.16)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, rad, 0, Math.PI * 2)
    ctx.fill()
  }

  // Recorte radial: garante alfa zero na borda do quad, custe o que custar.
  const img = ctx.getImageData(0, 0, size, size)
  const d = img.data
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const nx = (x / (size - 1) - 0.5) * 2
      const ny = (y / (size - 1) - 0.5) * 2
      const dist = Math.min(1, Math.sqrt(nx * nx + ny * ny))
      const falloff = 1 - dist * dist * (3 - 2 * dist)
      let a = Math.min(1, (d[i + 3] / 255) * 1.75) * falloff
      a = a * a * (3 - 2 * a)
      d[i] = d[i + 1] = d[i + 2] = 255
      d[i + 3] = a * 255
    }
  }
  ctx.putImageData(img, 0, 0)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.NoColorSpace // é uma máscara de alfa, não cor
  tex.generateMipmaps = true
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
  cached = tex
  return tex
}
