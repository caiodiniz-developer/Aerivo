import * as THREE from 'three'
import { createSkyState } from './palette'

/**
 * Camada renderizada no cubemap de ambiente do avião.
 * Só o céu e as nuvens entram — o próprio avião não pode se refletir.
 */
export const ENV_LAYER = 1

/** Distância de mundo percorrida ao longo do trilho 3D inteiro. */
export const TRAVEL = 2600

/** Deslocamento mesmo com o scroll parado — avião parado no ar mata a cena. */
export const CRUISE = 11

/**
 * Estado compartilhado da cena, fora do React.
 *
 * O progresso muda a 60fps; passar isso por `useState` re-renderizaria a
 * árvore inteira a cada frame. Os componentes leem daqui dentro do `useFrame`.
 * Um único `<Driver/>` (prioridade -100) escreve, todos os outros leem.
 */
export const flight = {
  /** Progresso do trilho 3D, já suavizado. */
  p: 0,
  /** Progresso cru, direto do ScrollTrigger. */
  raw: 0,
  /** Distância percorrida — alimenta a esteira das nuvens. */
  distance: 0,
  /** Quanto a distância avançou neste frame; as esteiras precisam do delta. */
  dDistance: 0,
  /** Ponteiro suavizado, para parallax. */
  mx: 0,
  my: 0,
  /** Paleta amostrada no frame atual. */
  sky: createSkyState(),

  /** 0→1: o quanto a cena já virou "modo destino" (paleta + enquadramento). */
  destBlend: 0,
  /**
   * Travessia dos destinos: `crossU` vai de 0 a 1 e reinicia, levando o avião
   * da direita para a esquerda; a cada volta `crossCount` sobe, e é isso que
   * dispara a troca da foto de fundo. Contínuo no tempo, não no scroll — a
   * cena tem de estar viva mesmo com a página parada.
   */
  crossU: 0,
  crossCount: 0,
  /** 0→1: o avião estacionando de lado, no fecho da página. */
  parkBlend: 0,
}

/**
 * Pose do avião no frame atual.
 * Escrita pelo <Aircraft/> (prioridade -50), lida pela câmera (-10) — a ordem
 * das prioridades do useFrame é o que garante que a câmera nunca mire um
 * frame atrasado.
 */
export const plane = {
  position: new THREE.Vector3(),
  quaternion: new THREE.Quaternion(),
  bank: 0,
  /** Ponta de asa esquerda/direita em mundo, origem das esteiras. */
  tipL: new THREE.Vector3(),
  tipR: new THREE.Vector3(),
}
