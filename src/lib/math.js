export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v)

export const lerp = (a, b, t) => a + (b - a) * t

/** Lerp independente de framerate. `l` = fração recuperada por 60fps-frame. */
export const damp = (a, b, l, dt) => lerp(a, b, 1 - Math.pow(1 - l, dt * 60))

export const smoothstep = (a, b, v) => {
  const t = clamp((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}

/** 1 dentro de [a,b], subindo em `fade` e descendo em `fade`. Usado para "cenas". */
export const band = (v, a, b, fade = 0.06) =>
  smoothstep(a - fade, a + fade, v) * (1 - smoothstep(b - fade, b + fade, v))

/** Remapeia v de [a,b] para [0,1]. */
export const range = (v, a, b) => clamp((v - a) / (b - a))

/** PRNG determinístico — a cena precisa ser idêntica a cada reload. */
export const mulberry32 = (seed) => () => {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
