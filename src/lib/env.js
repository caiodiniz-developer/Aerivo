/**
 * Detecção de capacidade feita uma única vez, no load.
 * Tudo que é caro (scrub de vídeo, campo de nuvens, trilhas) consulta daqui
 * em vez de espalhar `matchMedia` pelos componentes.
 */

const mq = (q) =>
  typeof window !== "undefined" ? window.matchMedia(q).matches : false;

const forceMotion = (() => {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("forceMotion") === "1" || params.get("motion") === "1";
})();

/**
 * Vale só para movimento *autônomo* — o que se mexe sozinho, sem o usuário
 * pedir: deriva ociosa do mundo, tremor de câmera, parallax de ponteiro, grão,
 * inércia de scroll, cintilação.
 *
 * NÃO desliga a sequência de scroll. Ela é resposta 1:1 ao gesto do usuário,
 * como arrastar uma imagem — parar o dedo para o quadro. Desligá-la aqui
 * apagava a hero em vídeo e a cena 3D inteiras para quem tem "efeitos de
 * animação" desligados no Windows, economia de bateria ligada ou "Reduce
 * motion" no macOS.
 */
export const reducedMotion =
  !forceMotion && mq("(prefers-reduced-motion: reduce)");

/** Atalho de leitura para o gate acima. */
export const motionSafe = !reducedMotion;

/**
 * Sem WebGL não há o que fazer com a cena 3D — este é o único caso em que a
 * narrativa realmente cai para uma versão estática.
 */
export const hasWebGL = (() => {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
})();

export const isTouch =
  typeof window !== "undefined" &&
  window.matchMedia("(pointer: coarse)").matches;

export const isSmall = mq("(max-width: 860px)");

const conn = typeof navigator !== "undefined" ? navigator.connection : null;

/** Conexão econômica ou lenta: cai para a variante leve e desliga o scrub. */
export const saveData =
  !!conn?.saveData || ["slow-2g", "2g", "3g"].includes(conn?.effectiveType);

const cores =
  (typeof navigator !== "undefined" && navigator.hardwareConcurrency) || 4;
const mem = (typeof navigator !== "undefined" && navigator.deviceMemory) || 4;

/** 'low' | 'mid' | 'high' — dimensiona contagem de nuvens, estrelas e DPR. */
export const tier = (() => {
  if (reducedMotion || saveData) return "low";
  if (isSmall || cores <= 4 || mem <= 4) return "low";
  if (cores <= 8 || mem <= 8) return "mid";
  return "high";
})();

/**
 * O scrub roda em todo lugar onde ele é suave. Só sai numa conexão econômica,
 * onde baixar 14 MB de vídeo é que seria o desrespeito — reduced-motion não
 * entra nesta conta (ver a nota em `reducedMotion`).
 */
export const canScrub = !saveData;

/**
 * Três cortes do mesmo plano, todos all-intra.
 *
 *   hq      1920x1080  34 MB — tela grande e conexão boa
 *   padrão  1280x720   14 MB — o resto do desktop
 *   mobile   720x406    4 MB — telas pequenas e conexão econômica
 *
 * O HQ é grande porque all-intra em Full HD é caro; ele só vale onde a tela
 * realmente mostra a diferença, e o 720p esticado em 1600px é justamente onde
 * o brilho especular da fuselagem — o assunto do plano — se perde.
 */
export const videoSrc = (() => {
  if (isSmall || saveData) return "/media/jet-scrub-mobile.mp4";

  const wide = typeof window !== "undefined" && window.innerWidth >= 1400;
  const fastLink = !conn?.effectiveType || conn.effectiveType === "4g";
  const beefy = mem >= 8;

  return wide && fastLink && beefy
    ? "/media/jet-scrub-hq.mp4"
    : "/media/jet-scrub.mp4";
})();

export const dpr =
  tier === "high" ? [1, 2] : tier === "mid" ? [1, 1.5] : [1, 1.25];

export const quality = {
  low: {
    clusters: 26,
    puffs: 7,
    stars: 900,
    cityLights: 500,
    trail: 44,
    shadows: false,
  },
  mid: {
    clusters: 46,
    puffs: 9,
    stars: 1600,
    cityLights: 1100,
    trail: 64,
    shadows: false,
  },
  high: {
    clusters: 68,
    puffs: 11,
    stars: 2600,
    cityLights: 2000,
    trail: 90,
    shadows: true,
  },
}[tier];
