/**
 * Silhuetas dos monumentos, em SVG.
 *
 * Desenhadas em código de propósito: nenhuma imagem para baixar, escalam sem
 * perder, e o recorte em contraluz é a mesma linguagem do resto do site — o
 * avião do vídeo da hero também aparece recortado contra o céu.
 *
 * Todas assentam na linha de base y=400 dentro de um viewBox 0 0 1200 400,
 * e o preenchimento vem por `currentColor`, então a cena controla o tom.
 */

/** Arcada repetida — o Coliseu é feito disso em três andares. */
function Arcade({ x, y, w, h, count, arch = 0.42 }) {
  const step = w / count
  const r = (step * arch) / 2
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const cx = x + i * step + step / 2
        return (
          <path
            key={i}
            d={`M${cx - r} ${y + h} L${cx - r} ${y + r * 1.15} A${r} ${r} 0 0 1 ${cx + r} ${
              y + r * 1.15
            } L${cx + r} ${y + h} Z`}
            fill="#000"
            opacity="0.55"
          />
        )
      })}
    </>
  )
}

function Italia() {
  const left = 330
  const width = 540
  return (
    <g>
      {/* anel externo: o lado alto à esquerda, a ruína descendo à direita */}
      <path
        d={`M${left} 400 L${left} 150 Q${left + 40} 96 ${left + 150} 92
            L${left + 300} 92 Q${left + 400} 96 ${left + 430} 150
            L${left + 430} 236 L${left + 500} 236 L${left + 500} 400 Z`}
      />
      {/* andares vazados */}
      <Arcade x={left + 18} y={132} w={width - 116} h={78} count={9} />
      <Arcade x={left + 18} y={224} w={width - 116} h={78} count={9} />
      <Arcade x={left + 18} y={316} w={width - 116} h={66} count={9} arch={0.34} />
      {/* Cornijas. As duas de cima param em 430 porque acima de y=236 a
          parede direita está recuada — passar disso deixava uma faixa
          cinza sobrando contra o céu. */}
      <rect x={left} y="126" width={430} height="8" opacity="0.35" />
      <rect x={left} y="218" width={430} height="8" opacity="0.35" />
      <rect x={left} y="310" width={width - 80} height="8" opacity="0.35" />
      {/* pinheiros romanos */}
      <g opacity="0.85">
        <rect x="196" y="300" width="9" height="100" />
        <path d="M200 306 q-62-26-84 6 q46-12 84 10 q38-22 84-10 q-22-32-84-6 z" />
        <rect x="960" y="326" width="8" height="74" />
        <path d="M964 332 q-50-21-68 5 q37-10 68 8 q31-18 68-8 q-18-26-68-5 z" />
      </g>
    </g>
  )
}

function Japao() {
  return (
    <g>
      {/* Fuji, recuado à esquerda para não disputar quadro com a torre */}
      <path d="M96 400 L262 252 Q282 234 302 252 L468 400 Z" opacity="0.34" />
      <path d="M246 266 L262 252 Q282 234 302 252 L318 266 L298 260 L280 268 L262 258 Z" opacity="0.16" />
      {/* Torre de Tóquio */}
      <path d="M676 400 Q730 328 744 268 L800 268 Q814 328 868 400 L836 400 Q800 330 790 276 L754 276 Q744 330 708 400 Z" />
      <rect x="728" y="248" width="88" height="22" />
      <path d="M752 248 L757 158 L787 158 L792 248 Z" />
      <rect x="744" y="140" width="56" height="20" />
      <path d="M766 60 L778 60 L776 140 L768 140 Z" />
      <path
        d="M744 320 L800 356 M800 320 L744 356"
        stroke="currentColor"
        strokeWidth="5"
        fill="none"
        opacity="0.55"
      />
    </g>
  )
}

function Brasil() {
  return (
    <g>
      {/* Pão de Açúcar e a Urca, os dois morros que fazem a baía */}
      <path d="M700 400 Q740 252 812 236 Q884 252 924 400 Z" />
      <path d="M560 400 Q596 316 648 306 Q700 316 736 400 Z" opacity="0.78" />
      {/* Corcovado */}
      <path d="M120 400 Q240 208 356 190 Q472 208 592 400 Z" opacity="0.6" />
      {/* Cristo Redentor no alto do Corcovado */}
      <g transform="translate(356 92)">
        <rect x="-26" y="86" width="52" height="14" opacity="0.9" />
        <rect x="-14" y="60" width="28" height="30" />
        <rect x="-7" y="24" width="14" height="40" />
        <circle cx="0" cy="16" r="9" />
        {/* braços abertos */}
        <rect x="-56" y="28" width="112" height="10" />
        <rect x="-56" y="28" width="10" height="26" />
        <rect x="46" y="28" width="10" height="26" />
      </g>
      {/* mar */}
      <rect y="372" width="1200" height="28" opacity="0.25" />
    </g>
  )
}

function Argentina() {
  return (
    <g>
      {/* Obelisco */}
      <path d="M578 60 L622 60 L638 356 L562 356 Z" />
      <rect x="548" y="356" width="104" height="44" />
      <rect x="586" y="120" width="28" height="18" opacity="0.4" />
      {/* avenida 9 de Julio: blocos baixos dos dois lados */}
      <g opacity="0.72">
        <rect x="180" y="268" width="86" height="132" />
        <rect x="276" y="300" width="64" height="100" />
        <rect x="350" y="248" width="74" height="152" />
        <rect x="434" y="312" width="58" height="88" />
        <rect x="712" y="292" width="70" height="108" />
        <rect x="792" y="244" width="88" height="156" />
        <rect x="890" y="304" width="62" height="96" />
        <rect x="962" y="272" width="78" height="128" />
      </g>
      {/* janelas acesas */}
      <g opacity="0.22">
        <rect x="368" y="270" width="10" height="12" fill="#fff" />
        <rect x="392" y="298" width="10" height="12" fill="#fff" />
        <rect x="812" y="268" width="10" height="12" fill="#fff" />
        <rect x="840" y="310" width="10" height="12" fill="#fff" />
      </g>
    </g>
  )
}

function Espanha() {
  /** As torres da Sagrada Família: cônicas, com o pináculo em bulbo. */
  const Spire = ({ x, top, w }) => (
    <g>
      <path d={`M${x - w} 400 L${x - w * 0.55} ${top + 30} L${x + w * 0.55} ${top + 30} L${x + w} 400 Z`} />
      <path d={`M${x - w * 0.55} ${top + 32} L${x} ${top} L${x + w * 0.55} ${top + 32} Z`} />
      <circle cx={x} cy={top - 6} r={w * 0.3} />
    </g>
  )
  return (
    <g>
      {/* nave */}
      <path d="M392 400 L392 300 L808 300 L808 400 Z" />
      <Spire x={452} top={150} w={34} />
      <Spire x={528} top={96} w={38} />
      <Spire x={600} top={54} w={44} />
      <Spire x={672} top={96} w={38} />
      <Spire x={748} top={150} w={34} />
      {/* rosácea */}
      <circle cx="600" cy="330" r="26" opacity="0.35" />
      {/* guindaste: a obra nunca termina, e isso faz parte da silhueta */}
      <g opacity="0.55">
        <rect x="862" y="120" width="7" height="280" />
        <rect x="770" y="120" width="190" height="7" />
        <rect x="866" y="98" width="4" height="24" />
        <rect x="800" y="127" width="3" height="34" />
      </g>
    </g>
  )
}

function Mexico() {
  return (
    <g>
      {/* Kukulcán: nove plataformas em degrau */}
      {Array.from({ length: 9 }, (_, i) => {
        const inset = i * 26
        const y = 400 - (i + 1) * 26
        return <rect key={i} x={360 + inset} y={y} width={480 - inset * 2} height={27} />
      })}
      {/* escadaria central */}
      <path d="M566 400 L566 176 L634 176 L634 400 Z" fill="#000" opacity="0.4" />
      {/* templo no topo */}
      <rect x="536" y="128" width="128" height="50" />
      <path d="M536 128 L556 108 L644 108 L664 128 Z" />
      {/* selva dos dois lados */}
      <g opacity="0.8">
        <path d="M0 400 L0 340 q54-34 108-6 q52-30 104 6 q40-24 78 12 L290 400 Z" />
        <path d="M910 400 L910 352 q60-36 118-4 q54-28 110 8 q34-18 62 8 L1200 400 L1200 400 Z" />
      </g>
    </g>
  )
}

const MONUMENTS = {
  italia: Italia,
  japao: Japao,
  brasil: Brasil,
  argentina: Argentina,
  espanha: Espanha,
  mexico: Mexico,
}

export function Monument({ id }) {
  const Shape = MONUMENTS[id]
  return Shape ? <Shape /> : null
}
