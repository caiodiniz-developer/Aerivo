import { useEffect, useState } from 'react'
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import { motionSafe } from './env'

gsap.registerPlugin(SplitText)

/**
 * Chave que muda quando a largura da janela muda de forma relevante.
 *
 * Usada como dependência dos efeitos que fatiam texto: as linhas do SplitText
 * são congeladas na largura em que foram medidas, e se o container encolher
 * depois, o texto reflui *dentro* de uma linha só — o que produz aquela quebra
 * órfã no meio do parágrafo. Refazer o split ao redimensionar resolve.
 *
 * Só a largura entra na conta: no mobile a barra do navegador recolhe e
 * dispara `resize` por mudança de altura o tempo todo, e refatiar aí seria
 * trabalho jogado fora.
 */
export function useResizeKey(threshold = 48, delay = 250) {
  const [key, setKey] = useState(0)

  useEffect(() => {
    let last = window.innerWidth
    let timer = 0
    const onResize = () => {
      if (Math.abs(window.innerWidth - last) < threshold) return
      last = window.innerWidth
      clearTimeout(timer)
      timer = setTimeout(() => setKey((k) => k + 1), delay)
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      clearTimeout(timer)
    }
  }, [threshold, delay])

  return key
}

/**
 * IMPORTANTE: sempre passe elementos, nunca uma string de seletor.
 *
 * O `gsap.context` limita seletores só para os tweens do próprio GSAP — o
 * SplitText resolve o seletor no documento inteiro. Um `splitLines('.js-split')`
 * dentro de um componente acaba fatiando o texto de todos os outros também,
 * e o segundo componente a montar refatia o que o primeiro já tinha quebrado.
 * Daí o helper abaixo: consulta sempre dentro de um escopo.
 */
export const within = (scope, selector) =>
  scope ? Array.from(scope.querySelectorAll(selector)) : []

/**
 * Quebra elementos em linhas mascaradas.
 *
 * `mask: 'lines'` embrulha cada linha em um wrapper com overflow hidden, então
 * a linha pode subir de fora da máscara sem vazar sobre a vizinha. O split
 * precisa das webfonts já carregadas — medir com a fonte de fallback produz
 * quebras de linha erradas.
 */
export function splitLines(targets) {
  const list = Array.isArray(targets) ? targets : targets ? [targets] : []
  if (!list.length) return { lines: [], revert: () => {} }
  // Sem `autoSplit`: ele refatia no load das fontes / no resize, e o refatiar
  // troca os elementos de linha por novos — sem os estilos inline que o GSAP
  // tinha aplicado. Na prática o texto que devia estar escondido reaparecia.
  // O preload já espera `document.fonts.ready`, então medimos uma vez só.
  const split = SplitText.create(list, {
    type: 'lines',
    mask: 'lines',
    linesClass: 'reveal-line',
  })
  return { lines: split.lines, revert: () => split.revert() }
}

export function splitChars(target) {
  if (!target) return { chars: [], lines: [], revert: () => {} }
  const split = SplitText.create(target, {
    type: 'chars,lines',
    mask: 'lines',
    linesClass: 'reveal-line',
  })
  return { chars: split.chars, lines: split.lines, revert: () => split.revert() }
}

/**
 * Estado inicial/final compartilhado por todos os reveals de texto.
 *
 * Sob reduced-motion o reveal continua existindo — o texto ainda entra com o
 * scroll — mas sem deslocamento nem desfoque: só opacidade. É a acomodação que
 * mantém o ritmo da leitura sem disparar gatilho vestibular, e evita o outro
 * extremo, que era não animar nada e deixar os capítulos empilhados.
 */
export const hidden = motionSafe
  ? { yPercent: 118, opacity: 0, filter: 'blur(14px)' }
  : { opacity: 0 }

export const shown = motionSafe
  ? { yPercent: 0, opacity: 1, filter: 'blur(0px)' }
  : { opacity: 1 }

/** Duração-base dos reveals. Curta quando o movimento tem de ser discreto. */
export const revealDuration = motionSafe ? 1.25 : 0.45
