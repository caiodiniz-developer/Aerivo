import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { reducedMotion } from './env'

gsap.registerPlugin(ScrollTrigger)

/**
 * Store de progresso compartilhado.
 *
 * Nada aqui passa por estado do React: o ScrollTrigger escreve, o `useFrame` do
 * R3F e o HUD leem. Um `setState` por frame de scroll re-renderizaria a árvore
 * inteira 60x/s — este objeto mutável é o que mantém a cena a 60fps.
 */
export const progress = {
  /** 0→1 ao longo do trilho do vídeo. */
  hero: 0,
  /** 0→1 ao longo do trilho 3D. */
  sky: 0,
  /**
   * Trecho dos destinos. `destBlend` diz o quanto a cena 3D já assumiu a
   * paleta e o enquadramento daquele lugar; `dest` é o avanço dentro do
   * destino ativo (0→1), que move o avião de um lado ao outro do quadro.
   */
  destBlend: 0,
  dest: 0,
  /** 0→1 no fecho: o avião estaciona de lado sob o botão. */
  parkBlend: 0,
  /** 0→1 na página toda. */
  page: 0,
  /** Ponteiro normalizado (-1..1) para parallax. */
  pointer: { x: 0, y: 0 },
  /** Velocidade instantânea de scroll, normalizada. */
  velocity: 0,
}

let lenis = null

export function initSmoothScroll() {
  if (lenis) return lenis

  lenis = new Lenis({
    // `lerp` em vez de `duration`: é o modo recomendado do Lenis e independe
    // de framerate. `duration` reinicia uma animação por evento de roda, o
    // que em trackpad (dezenas de eventos por segundo) se atropela.
    lerp: 0.12,
    smoothWheel: !reducedMotion,
    // Touch fica nativo: suavizar o dedo deixa a página com sensação pesada.
    syncTouch: false,
    wheelMultiplier: 1,
    touchMultiplier: 1,
    // O rAF é nosso, via ticker do GSAP — nunca os dois ao mesmo tempo.
    autoRaf: false,
  })

  lenis.on('scroll', ScrollTrigger.update)

  // Um único relógio para Lenis e GSAP evita os dois brigarem por rAF.
  gsap.ticker.add((time) => lenis.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)

  // Nada de `invalidateOnRefresh` global: o refresh chama `invalidate()` nas
  // animações, o que descarta os valores gravados dos `fromTo`. Numa timeline
  // com scrub, os blocos posicionados adiante do playhead perdem o estado
  // "escondido" e o texto aparece todo de uma vez no topo da página.

  // Progresso global da página, para o trilho de progresso do header.
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => {
      progress.page = self.progress
      progress.velocity = gsap.utils.clamp(-1, 1, self.getVelocity() / 3000)
    },
  })

  if (!reducedMotion) {
    window.addEventListener(
      'pointermove',
      (e) => {
        progress.pointer.x = (e.clientX / window.innerWidth) * 2 - 1
        progress.pointer.y = (e.clientY / window.innerHeight) * 2 - 1
      },
      { passive: true },
    )
  }

  return lenis
}

export const getLenis = () => lenis

export function stopScroll() {
  lenis?.stop()
  document.documentElement.classList.add('is-locked')
}

export function startScroll() {
  lenis?.start()
  document.documentElement.classList.remove('is-locked')
}

/**
 * Rede de segurança: se por qualquer caminho o Lenis ficar parado depois do
 * preloader, a página volta a rolar nativamente — sem suavização nenhuma, que
 * é exatamente o sintoma de "o smooth scroll não funciona". Isto garante que
 * ele esteja rodando quando a página está visível.
 */
export function ensureScrollRunning() {
  if (!lenis) return
  if (lenis.isStopped) lenis.start()
  document.documentElement.classList.remove('is-locked')
}

export function scrollTo(target, opts) {
  lenis?.scrollTo(target, { duration: 1.6, ...opts })
}

export { gsap, ScrollTrigger }
