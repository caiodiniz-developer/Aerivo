import { useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger, progress } from '../lib/scroll'
import { videoSrc, canScrub, motionSafe } from '../lib/env'
import {
  splitChars,
  splitLines,
  within,
  hidden,
  shown,
  revealDuration,
  useResizeKey,
} from '../lib/split'
import { damp } from '../lib/math'
import { hero, chapters } from '../content'

/** Quanto scroll a sequência de vídeo ocupa. ~5 telas de aproximação. */
const TRACK_VH = 620
const FPS = 24

/**
 * Liga a posição do scroll ao `currentTime` do vídeo.
 *
 * Três detalhes separam "travado" de "manteiga":
 *  1. o alvo vem do scroll, mas o valor aplicado persegue o alvo com damping —
 *     sem isso cada tick de scroll vira um seek e o decoder engasga;
 *  2. o tempo é arredondado para o frame mais próximo e só é escrito quando o
 *     frame muda, o que descarta seeks que não mudariam nada na tela;
 *  3. o mp4 é all-intra (ver scripts/encode-scrub-video.mjs), então qualquer
 *     frame decodifica sozinho, sem depender do keyframe anterior.
 */
function useVideoScrub(videoRef, trackRef, active) {
  useEffect(() => {
    if (!active) return
    const video = videoRef.current
    const track = trackRef.current
    if (!video || !track) return

    let duration = 0
    let target = 0
    let current = 0
    let lastFrame = -1

    const syncTarget = (p) => {
      progress.hero = p
      target = p * duration
    }

    const onMeta = () => {
      duration = Number.isFinite(video.duration) ? video.duration : 0
      syncTarget(progress.hero)
    }
    const onData = () => video.classList.add('is-ready')

    video.addEventListener('loadedmetadata', onMeta)
    video.addEventListener('loadeddata', onData, { once: true })
    if (video.readyState >= 1) onMeta()
    if (video.readyState >= 2) onData()

    const st = ScrollTrigger.create({
      trigger: track,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => syncTarget(self.progress),
      onRefresh: (self) => syncTarget(self.progress),
    })

    const tick = (_t, dt) => {
      if (!duration || video.readyState < 1) return
      current = damp(current, target, 0.18, Math.min(dt, 50) / 1000)
      const frame = Math.round(current * FPS)
      if (frame === lastFrame) return
      lastFrame = frame
      // Meio do frame: garante que o decoder caia dentro do frame pedido.
      video.currentTime = Math.max(0, Math.min(duration - 1 / FPS, (frame + 0.5) / FPS))
    }
    gsap.ticker.add(tick)

    // iOS só libera mexer no currentTime depois de um gesto do usuário.
    const unlock = () => {
      const p = video.play()
      if (p?.then) p.then(() => video.pause()).catch(() => {})
    }
    window.addEventListener('touchstart', unlock, { once: true, passive: true })
    window.addEventListener('pointerdown', unlock, { once: true })

    return () => {
      gsap.ticker.remove(tick)
      st.kill()
      video.removeEventListener('loadedmetadata', onMeta)
      video.removeEventListener('loadeddata', onData)
      window.removeEventListener('touchstart', unlock)
      window.removeEventListener('pointerdown', unlock)
    }
  }, [active, videoRef, trackRef])
}

/* ------------------------------------------------------------------ */

export default function VideoStage({ ready }) {
  const track = useRef(null)
  const stage = useRef(null)
  const video = useRef(null)
  const media = useRef(null)
  const resizeKey = useResizeKey()
  const introPlayed = useRef(false)

  useVideoScrub(video, track, ready && canScrub)

  useLayoutEffect(() => {
    if (!ready) return

    const scope = stage.current
    // Elementos, não seletores: o SplitText não respeita o escopo do
    // gsap.context e sairia fatiando o texto dos outros componentes.
    const title = splitChars(scope.querySelector('.hero__title'))
    const sub = splitLines(within(scope, '.hero__sub'))
    const journey = splitLines(within(scope, '#copy-journey .js-split'))
    const board = splitLines(within(scope, '#copy-board .js-split'))

    const ctx = gsap.context(() => {
      // Estado inicial explícito. Depender do immediateRender dos `fromTo`
      // posicionados adiante na timeline é frágil demais para o que está em
      // jogo aqui: se falhar, todo o texto da narrativa aparece empilhado
      // sobre a hero.
      gsap.set([...journey.lines, ...board.lines], hidden)
      gsap.set('#copy-journey .eyebrow', { opacity: 0, y: 26 })
      gsap.set('.video-stage__cut', { opacity: 0 })

      /* -------- entrada, uma vez só, quando a cortina sobe -------- */
      // Um resize refaz o split, mas a abertura não se repete: ela pertence
      // ao momento em que a cortina sobe, não a cada mudança de largura.
      if (!introPlayed.current) {
        introPlayed.current = true
        gsap
          .timeline({ defaults: { ease: 'expo.out' } })
          .fromTo(
            title.chars,
            motionSafe
              ? { yPercent: 118, opacity: 0, filter: 'blur(16px)' }
              : { opacity: 0 },
            {
              yPercent: 0,
              opacity: 1,
              filter: 'blur(0px)',
              duration: motionSafe ? 1.5 : 0.5,
              stagger: motionSafe ? 0.028 : 0.008,
            },
          )
          .fromTo(sub.lines, hidden, { ...shown, duration: revealDuration, stagger: 0.08 }, '-=1.05')
          .fromTo(
            ['.hero__meta', '.scroll-hint'],
            { opacity: 0, y: motionSafe ? 18 : 0 },
            { opacity: 1, y: 0, duration: 1, stagger: 0.1 },
            '-=0.8',
          )
      }

      /* -------- coreografia amarrada ao scroll -------- */
      const tl = gsap.timeline({
        scrollTrigger: { trigger: track.current, start: 'top top', end: 'bottom bottom', scrub: 0.7 },
        defaults: { ease: 'none' },
      })

      // Empurra o enquadramento junto com a aproximação do avião. No sentido
      // contrário o quadro abriria enquanto o avião se aproxima, e as duas
      // coisas se cancelariam.
      tl.fromTo(media.current, { scale: 1 }, { scale: 1.13, duration: 1 }, 0)

      // A indicação de scroll some no primeiro gesto.
      tl.to('.scroll-hint', { opacity: 0, y: -14, duration: 0.045, ease: 'power2.in' }, 0)

      // Hero sai.
      tl.to(
        title.chars,
        { yPercent: -118, opacity: 0, filter: 'blur(12px)', duration: 0.14, stagger: 0.004, ease: 'power2.in' },
        0.02,
      )
      tl.to(sub.lines, { yPercent: -115, opacity: 0, duration: 0.1, ease: 'power2.in' }, 0.02)
      tl.to('.hero__meta', { opacity: 0, y: -22, duration: 0.1, ease: 'power2.in' }, 0.02)

      // 01 — A jornada.
      tl.fromTo(
        '#copy-journey .eyebrow',
        { opacity: 0, y: 26 },
        { opacity: 1, y: 0, duration: 0.06, ease: 'power2.out' },
        0.2,
      )
      tl.fromTo(
        journey.lines,
        hidden,
        { ...shown, duration: 0.15, stagger: 0.012, ease: 'expo.out' },
        0.21,
      )
      tl.to(
        ['#copy-journey .eyebrow', ...journey.lines],
        { yPercent: -70, opacity: 0, filter: 'blur(10px)', duration: 0.12, stagger: 0.008, ease: 'power2.in' },
        0.46,
      )

      // O convite para entrar.
      tl.fromTo(
        board.lines,
        hidden,
        { ...shown, duration: 0.14, stagger: 0.02, ease: 'expo.out' },
        0.64,
      )
      tl.to(board.lines, { opacity: 0, filter: 'blur(16px)', duration: 0.09, ease: 'power2.in' }, 0.84)

      // Corte para o preto: cobre a troca de vídeo para WebGL.
      tl.fromTo('.video-stage__cut', { opacity: 0 }, { opacity: 1, duration: 0.12, ease: 'power2.in' }, 0.88)

      ScrollTrigger.refresh()
    }, scope)

    return () => {
      ctx.revert()
      title.revert()
      sub.revert()
      journey.revert()
      board.revert()
    }
  }, [ready, resizeKey])

  return (
    <section className="track" ref={track} id="jornada" style={{ height: `${TRACK_VH}vh` }}>
      <div className="stage video-stage" ref={stage}>
        <div className="video-stage__media" ref={media}>
          <img
            className="video-stage__poster"
            src="/media/poster.jpg"
            alt=""
            aria-hidden="true"
            fetchPriority="high"
          />
          {canScrub && (
            <video
              className="video-stage__video"
              ref={video}
              src={videoSrc}
              poster="/media/poster.jpg"
              muted
              playsInline
              preload="auto"
              disablePictureInPicture
              tabIndex={-1}
              aria-hidden="true"
            />
          )}
          <div className="video-stage__scrim" />
        </div>

        <div className="hero">
          <div className="hero__head">
            <h1 className="hero__title display display--xl">{hero.title}</h1>
            <p className="hero__sub">{hero.sub}</p>
          </div>
          <div className="hero__foot">
            <p className="hero__meta">{hero.meta}</p>
            <div className="scroll-hint" aria-hidden="true">
              <span className="scroll-hint__rail">
                <i className="scroll-hint__dot" />
              </span>
              <span>{hero.hint} ↓</span>
            </div>
          </div>
        </div>

        <div className="chapter-copy" id="copy-journey" style={{ opacity: 1 }}>
          <p className="eyebrow">{chapters.journey.eyebrow}</p>
          <h2 className="display display--l js-split">{chapters.journey.title}</h2>
          <div className="lede js-split">
            {chapters.journey.body.map((p, i) => (
              <p key={i} style={{ marginTop: i ? '1em' : 0 }}>
                {p}
              </p>
            ))}
          </div>
        </div>

        <div className="chapter-copy chapter-copy--center" id="copy-board" style={{ opacity: 1 }}>
          <h2 className="display display--l js-split">{chapters.board.title}</h2>
        </div>

        <div className="video-stage__cut" />
      </div>
    </section>
  )
}
