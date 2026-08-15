/** Fonte única do texto do site — o modo reduced-motion reusa exatamente o mesmo copy. */

export const brand = {
  name: 'Aerivo',
  tag: 'Cia. Aérea',
}

export const hero = {
  title: 'Além do horizonte',
  sub: 'Onde toda jornada começa.',
  hint: 'Scroll to explore',
  meta: '23°33′S 46°38′W — embarque contínuo',
}

export const chapters = {
  journey: {
    eyebrow: '01 — A jornada',
    title: 'Mais do que um voo.',
    body: [
      'Viajar nunca foi atravessar a distância entre dois pontos. É o instante em que a cidade encolhe, o ruído se dissolve e o mundo inteiro passa a caber numa janela oval.',
      'Cada decolagem é uma pergunta em voz baixa: o que existe do outro lado? Liberdade é descobrir que o horizonte nunca foi uma linha — sempre foi um convite.',
    ],
  },
  board: {
    eyebrow: '',
    title: 'Entre. A vista é sua.',
  },
  ascent: {
    eyebrow: '02 — Ascensão',
    title: 'O céu não é o limite. É o ponto de partida.',
    body: ['Trinta segundos depois da pista, a gravidade vira detalhe. O que ficou para trás começa a parecer pequeno — e é exatamente esse o ponto.'],
  },
  altitude: {
    eyebrow: '03 — Altitude de cruzeiro',
    title: 'Onze mil metros acima de qualquer pressa.',
    body: ['Aqui em cima o tempo se comporta diferente. Não há trânsito, não há fila, não há amanhã. Há só o zumbido baixo das turbinas e um oceano de nuvens que não termina.'],
    specs: [
      { n: 11280, unit: 'm', label: 'Altitude de cruzeiro' },
      { n: 903, unit: 'km/h', label: 'Velocidade no ar' },
      { n: -56, unit: '°C', label: 'Temperatura externa' },
      { n: 132, unit: 'destinos', label: 'Malha global' },
    ],
  },
  golden: {
    eyebrow: '04 — Hora dourada',
    title: 'A hora dourada dura o voo inteiro.',
    body: ['Voando para o oeste, o pôr do sol vira companhia de viagem. A luz atravessa a cabine, encontra o alumínio e transforma trinta e nove mil pés em cinema.'],
  },
  night: {
    eyebrow: '05 — Chegada',
    title: 'E então as cidades viram constelações.',
    body: ['A descida começa sem aviso. Lá embaixo, milhares de luzes desenham ruas que você ainda não conhece. Em poucos minutos, uma delas será a sua.'],
  },
}

export const destinations = [
  { name: 'Lisboa', code: 'LIS', time: '09h 40' },
  { name: 'Tóquio', code: 'HND', time: '24h 15' },
  { name: 'Cidade do Cabo', code: 'CPT', time: '11h 55' },
  { name: 'Reykjavík', code: 'KEF', time: '10h 30' },
  { name: 'Santiago', code: 'SCL', time: '04h 05' },
  { name: 'Marrakech', code: 'RAK', time: '09h 20' },
]

export const closing = {
  eyebrow: 'Última chamada',
  title: 'Reserve sua janela.',
  body: 'Assentos limitados em cada hora dourada.',
  cta: 'Planejar viagem',
}

export const nav = [
  { label: 'A jornada', href: '#jornada' },
  { label: 'Voo', href: '#voo' },
  { label: 'Destinos', href: '#destinos' },
  { label: 'Reservar', href: '#reservar' },
]
