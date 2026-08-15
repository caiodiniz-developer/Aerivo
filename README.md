# Além do horizonte

Experiência cinematográfica scroll-driven para companhia aérea. O scroll conduz
duas sequências encadeadas: primeiro um vídeo real cujo `currentTime` é
controlado quadro a quadro pela posição da página, depois uma cena 3D em WebGL
onde o avião atravessa um céu que vai do amanhecer à noite.

**Stack:** React 19 · Vite · GSAP (ScrollTrigger + SplitText) · Lenis ·
three.js / React Three Fiber · CSS puro.

---

## Rodando

```bash
npm install
npm run assets   # gera public/media e public/models a partir de assets/
npm run dev
```

`npm run build` gera `dist/`, `npm run preview` serve o build.

O passo `assets` é obrigatório em uma cópia limpa do repositório: `public/` é
derivado de `assets/` e não é versionado.

---

## As duas sequências

### 1. Scrub de vídeo (`src/components/VideoStage.jsx`)

Um trilho de 620vh com o vídeo fixo. O vídeo **nunca dá play**: o scroll define
um tempo-alvo e um laço no ticker do GSAP persegue esse alvo.

Três decisões sustentam a fluidez:

- **O mp4 é all-intra** — um keyframe por quadro. `scripts/encode-scrub-video.mjs`
  encoda com `-g 1 -keyint_min 1 -sc_threshold 0` e confere o resultado com o
  ffprobe. Sem isso, cada seek obriga o decoder a voltar até o keyframe
  anterior, e o scrub engasga. (O `jet-v7-web.mp4` entregue já era all-intra,
  então ele é aproveitado como está.)
- **O tempo aplicado persegue o alvo com damping**, em vez de seguir o scroll
  direto. Ligar um ao outro sem folga transforma cada tick de roda em um seek.
- **O tempo é arredondado para o quadro mais próximo** e só é escrito quando o
  quadro muda, descartando seeks que não mudariam nada na tela.

### 2. Cena 3D (`src/three/`)

Um `<Canvas>` fixo que acorda uma tela antes de entrar em quadro — a compilação
dos shaders acontece atrás de `opacity: 0`, não como engasgo na transição.

| Arquivo | Papel |
| --- | --- |
| `palette.js` | Os cinco tempos do céu (amanhecer → dia → hora dourada → hora azul → noite). Domo, nuvens, luzes, névoa, estrelas e exposição saem todos daqui, então nada sai de tom. |
| `state.js` | Estado compartilhado fora do React. O progresso muda a 60fps; passar isso por `useState` re-renderizaria a árvore a cada quadro. |
| `Scene.jsx` | Composição, luzes e o `<Driver/>` (prioridade −100) que escreve o estado do quadro antes de todos os outros `useFrame`. |
| `SkyDome.jsx` | Gradiente de céu em shader, com disco solar, halo e difusão em três escalas. |
| `CloudField.jsx` | Bancos de nuvens: billboards instanciados em um draw call, com a esteira infinita resolvida dentro do vertex shader. |
| `Aircraft.jsx` | Carrega o GLB, normaliza e voa. |
| `Contrail.jsx` | Esteiras de condensação como fita de geometria, em coordenadas de mundo. |
| `CameraRig.jsx` | Sete planos interpolados por spline, compostos contra o texto de cada capítulo. |

**O mundo é que se move.** O avião fica perto da origem e as nuvens correm em
+Z. Isso mantém a precisão de float estável por mais longo que seja o scroll, e
o embaralhamento (`mod`) fica invisível. A parte do deslocamento que não vem do
scroll (`CRUISE`) segue correndo com o scroll parado — avião parado no ar mata
a cena.

**Orientação do modelo.** A matriz do nó raiz do Sketchfab manda o +Y do modelo
(onde está a deriva) para o −Z do mundo, ou seja, o nariz nasce apontando para
+Z. O `lookAt` do three orienta o −Z local para o alvo, então o modelo leva meia
volta em Y. Ver `MODEL_YAW` em `Aircraft.jsx`.

**Atitude de voo.** A trajetória sobe ~13 unidades enquanto o mundo corre 2.600:
o ângulo de subida real seria de menos de 1°, invisível. `PITCH_GAIN` /
`YAW_GAIN` / `BANK_GAIN` exageram isso para uns 14° de arfagem e 24° de
inclinação máxima. Os ganhos são ancorados em `TRAVEL`, não na diferença entre
duas amostras da curva, então o ângulo não depende do passo de amostragem.

---

## Desempenho e acessibilidade

`src/lib/env.js` decide tudo uma vez, no load:

- **`prefers-reduced-motion: reduce`** → sem scrub, sem WebGL, sem preloader.
  `VideoStage` e `SkyStage` renderizam uma versão em fluxo normal, com o mesmo
  texto (a fonte do copy é única, em `src/content.js`).
- **Tela pequena ou conexão econômica** → variante `jet-scrub-mobile.mp4`
  (720px, 4 MB contra 14 MB).
- **Três níveis de qualidade** (`quality`) dimensionam contagem de nuvens,
  estrelas, luzes urbanas, amostras de esteira e DPR a partir de
  `hardwareConcurrency` / `deviceMemory`.

---

## Armadilhas que já custaram caro aqui

Estão comentadas no código, mas vale a lista:

- **`ScrollTrigger.defaults({ invalidateOnRefresh: true })` quebra `fromTo`.**
  O refresh chama `invalidate()`, que descarta os valores gravados. Numa
  timeline com scrub, os blocos posicionados adiante do playhead perdem o
  estado "escondido" e o texto aparece todo empilhado sobre a hero.
- **O `gsap.context` não limita o SplitText.** Ele resolve o seletor no
  documento inteiro. Sempre passe elementos (`within(scope, '.js-split')`),
  nunca uma string.
- **`autoSplit: true` apaga o estado do GSAP.** Ele refatia no load das fontes e
  troca os elementos de linha por novos, sem os estilos inline aplicados.
- **O three já injeta `tonemapping_pars_fragment` e `colorspace_pars_fragment`**
  no prefixo de todo fragment shader. Reincluí-los redefine as funções e o
  shader não compila.
- **Billboard de nuvem é quadrado.** Sem `thickness` baixo e `aspect` alto, o
  "mar de nuvens" cresce para cima e engole a câmera.
- **A névoa é exp²:** a densidade entra ao quadrado junto com a distância. Na
  escala desta cena, qualquer valor acima de ~0,002 vira leite.
