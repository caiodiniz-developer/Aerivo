import { videoSrc, reducedMotion } from './env'

const MODEL_SRC = '/models/aviao.glb'
const POSTER_SRC = '/media/poster.jpg'

/** Nunca deixa o preloader travar por um asset que não responde. */
const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise((res) => setTimeout(res, ms))])

function loadImage(src, onBit) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = img.onerror = () => {
      onBit()
      resolve()
    }
    img.src = src
  })
}

function loadFonts(onBit) {
  const p = document.fonts?.ready ?? Promise.resolve()
  return p.then(() => onBit())
}

/**
 * Baixa o GLB com progresso por byte e devolve um object URL.
 * O modelo é o asset mais pesado (5,5 MB), então ele domina a barra — buscá-lo
 * aqui, e não no primeiro render do Canvas, evita o pop-in do avião.
 */
function loadModel(onChunk) {
  return fetch(MODEL_SRC)
    .then((res) => {
      const total = Number(res.headers.get('content-length')) || 5_600_000
      if (!res.body) return res.blob()
      let received = 0
      const reader = res.body.getReader()
      const chunks = []
      const pump = () =>
        reader.read().then(({ done, value }) => {
          if (done) return new Blob(chunks)
          chunks.push(value)
          received += value.length
          onChunk(Math.min(1, received / total))
          return pump()
        })
      return pump()
    })
    .then((blob) => URL.createObjectURL(blob))
    .catch(() => MODEL_SRC) // se algo falhar, o GLTFLoader busca pela rede
}

function loadVideo(onBit) {
  return new Promise((resolve) => {
    const v = document.createElement('video')
    v.muted = true
    v.playsInline = true
    v.preload = 'auto'
    v.src = videoSrc
    const done = () => {
      onBit()
      resolve()
    }
    v.addEventListener('canplaythrough', done, { once: true })
    v.addEventListener('error', done, { once: true })
    v.load()
  })
}

/**
 * @param {(p:number)=>void} onProgress recebe 0→1
 * @returns {Promise<{modelUrl:string}>}
 */
export function preloadAssets(onProgress) {
  // Pesos: o modelo domina, o resto são marcos discretos.
  const weights = { fonts: 0.08, poster: 0.07, video: 0.25, model: 0.6 }
  const state = { fonts: 0, poster: 0, video: 0, model: 0 }

  const emit = () => {
    let sum = 0
    for (const k in weights) sum += weights[k] * state[k]
    onProgress(Math.min(1, sum))
  }

  const mark = (k) => () => {
    state[k] = 1
    emit()
  }

  let modelUrl = MODEL_SRC

  const jobs = [
    withTimeout(loadFonts(mark('fonts')), 3000).then(mark('fonts')),
    withTimeout(loadImage(POSTER_SRC, mark('poster')), 6000).then(mark('poster')),
    withTimeout(
      loadModel((p) => {
        state.model = p
        emit()
      }),
      25000,
    ).then((url) => {
      if (url) modelUrl = url
      state.model = 1
      emit()
    }),
    // Sem scrub não faz sentido esperar 14 MB de vídeo.
    reducedMotion
      ? Promise.resolve(mark('video')())
      : withTimeout(loadVideo(mark('video')), 20000).then(mark('video')),
  ]

  return Promise.all(jobs).then(() => ({ modelUrl }))
}
