/**
 * Prepara tudo que sai de `assets/` para `public/`: as variantes de vídeo do
 * scrub, o poster e o modelo 3D.
 *
 * PASSO LOCAL, NÃO DE BUILD. O `public/` já vai versionado e pronto, então o
 * deploy nunca roda este script — ele só é necessário quando os masters em
 * `assets/` mudarem. É por isso que `assets/` fica fora do repositório.
 *
 * Requisito do scrub: GOP de 1 (all-intra). Cada frame vira um keyframe, então
 * `video.currentTime = t` resolve sem precisar decodificar um GOP inteiro — é o
 * que elimina o "travamento" clássico do scroll-scrub.
 *
 * O jet-v7-web.mp4 entregue já é all-intra 1280x720, então ele é só copiado.
 * O que falta é a variante leve para mobile / conexão lenta.
 *
 *   npm run assets
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, copyFileSync, existsSync, statSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import ffmpeg from 'ffmpeg-static'
import ffprobe from 'ffprobe-static'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = resolve(root, 'assets/jet-v7.mp4')
const webSrc = resolve(root, 'assets/jet-v7-web.mp4')
const outDir = resolve(root, 'public/media')
const modelDir = resolve(root, 'public/models')

mkdirSync(outDir, { recursive: true })
mkdirSync(modelDir, { recursive: true })

const mb = (p) => (statSync(p).size / 1024 / 1024).toFixed(1) + ' MB'

/** Flags que forçam all-intra: um keyframe por frame, sem detecção de cena. */
const allIntra = ['-g', '1', '-keyint_min', '1', '-sc_threshold', '0']

function encode({ input, out, width, crf, preset = 'slow' }) {
  console.log(`\n→ ${out.split(/[\\/]/).pop()}  (${width}px, crf ${crf}, GOP 1)`)
  execFileSync(
    ffmpeg,
    [
      '-y',
      '-i', input,
      '-an', // sem áudio: o vídeo é dirigido pelo scroll, nunca toca
      '-c:v', 'libx264',
      '-profile:v', 'high',
      '-pix_fmt', 'yuv420p',
      '-vf', `scale=${width}:-2:flags=lanczos`,
      '-crf', String(crf),
      '-preset', preset,
      ...allIntra,
      '-movflags', '+faststart',
      out,
    ],
    { stdio: ['ignore', 'ignore', 'inherit'] },
  )
  console.log(`  ${mb(out)}`)
}

/** Confere que a saída realmente ficou 1 keyframe por frame. */
function verifyAllIntra(file) {
  const out = execFileSync(ffprobe.path, [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'frame=key_frame',
    '-of', 'csv=p=0',
    file,
  ]).toString()
  const frames = out.trim().split('\n').filter(Boolean)
  const keys = frames.filter((f) => f.trim() === '1').length
  const ok = keys === frames.length
  console.log(`  keyframes ${keys}/${frames.length} ${ok ? '✓ all-intra' : '✗ NÃO all-intra'}`)
  return ok
}

const hqOut = resolve(outDir, 'jet-scrub-hq.mp4')
const desktopOut = resolve(outDir, 'jet-scrub.mp4')
const mobileOut = resolve(outDir, 'jet-scrub-mobile.mp4')

// Full HD all-intra, direto do master de 1920x1080. É o que roda em tela
// grande com conexão boa: em 1600px de largura o 720p chega esticado e a
// fuselagem perde o brilho especular, que é justamente o assunto do plano.
if (existsSync(src)) {
  encode({ input: src, out: hqOut, width: 1920, crf: 23 })
  verifyAllIntra(hqOut)
}

// Desktop: o arquivo entregue já é all-intra 720p. Só copiamos.
if (existsSync(webSrc)) {
  copyFileSync(webSrc, desktopOut)
  console.log(`\n→ jet-scrub.mp4 (copiado de jet-v7-web.mp4)  ${mb(desktopOut)}`)
  if (!verifyAllIntra(desktopOut) && existsSync(src)) {
    console.log('  reencodando a partir do master…')
    encode({ input: src, out: desktopOut, width: 1280, crf: 26 })
    verifyAllIntra(desktopOut)
  }
}

// Mobile / conexão lenta.
encode({ input: existsSync(src) ? src : webSrc, out: mobileOut, width: 720, crf: 30, preset: 'medium' })
verifyAllIntra(mobileOut)

// Poster = primeiro frame, para a hero já nascer preenchida.
const posterOut = resolve(outDir, 'poster.jpg')
execFileSync(
  ffmpeg,
  ['-y', '-i', existsSync(src) ? src : webSrc, '-vf', 'scale=1600:-2:flags=lanczos', '-frames:v', '1', '-q:v', '4', posterOut],
  { stdio: ['ignore', 'ignore', 'inherit'] },
)
console.log(`\n→ poster.jpg  ${mb(posterOut)}`)

// Modelo 3D: só cópia, mas precisa estar em public/ para o GLTFLoader buscar.
const modelSrc = resolve(root, 'assets/aviao.glb')
const modelOut = resolve(modelDir, 'aviao.glb')
if (existsSync(modelSrc)) {
  copyFileSync(modelSrc, modelOut)
  console.log(`→ aviao.glb   ${mb(modelOut)}`)
}

console.log('\nPronto.\n')
