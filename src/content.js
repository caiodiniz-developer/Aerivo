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

/**
 * A foto é o fundo da cena; o avião 3D voa por cima dela.
 * A travessia é igual em todos: reta, da direita para a esquerda.
 */
export const destinations = [
  {
    name: 'Itália',
    city: 'Roma',
    code: 'FCO',
    time: '11h 25',
    landmark: 'O Coliseu',
    photo: '/media/coliseu.jpg',
    basePrice: 5180,
  },
  {
    name: 'Japão',
    city: 'Tóquio',
    code: 'HND',
    time: '24h 15',
    landmark: 'A Torre de Tóquio, com o Fuji ao fundo',
    photo: '/media/torre-de-toquio.jpg',
    basePrice: 8740,
  },
  {
    name: 'Brasil',
    city: 'Rio de Janeiro',
    code: 'GIG',
    time: '01h 05',
    landmark: 'O Cristo e o Pão de Açúcar',
    photo: '/media/cristo-redentor.jpg',
    basePrice: 1240,
  },
  {
    name: 'Argentina',
    city: 'Buenos Aires',
    code: 'EZE',
    time: '03h 10',
    landmark: 'O Obelisco',
    photo: '/media/obelisco.jpg',
    basePrice: 1890,
  },
  {
    name: 'Espanha',
    city: 'Barcelona',
    code: 'BCN',
    time: '10h 45',
    landmark: 'A Sagrada Família',
    photo: '/media/sagrada-familia.jpg',
    basePrice: 4720,
  },
  {
    name: 'México',
    city: 'Yucatán',
    code: 'MEX',
    time: '10h 20',
    landmark: 'Chichén Itzá',
    photo: '/media/chichen-itza.jpg',
    basePrice: 3960,
  },
]

/** Opções do painel de reserva. */
export const booking = {
  origins: [
    { code: 'GRU', label: 'São Paulo — Guarulhos' },
    { code: 'GIG', label: 'Rio de Janeiro — Galeão' },
    { code: 'BSB', label: 'Brasília' },
    { code: 'CNF', label: 'Belo Horizonte — Confins' },
    { code: 'POA', label: 'Porto Alegre' },
  ],
  times: ['06:15', '10:40', '14:05', '19:30', '23:55'],
  cabins: [
    { id: 'economica', label: 'Econômica', multiplier: 1, note: 'Assento na janela garantido' },
    { id: 'executiva', label: 'Executiva', multiplier: 2.4, note: 'Poltrona-leito e embarque prioritário' },
    { id: 'primeira', label: 'Primeira', multiplier: 4.1, note: 'Suíte privativa com janela dupla' },
  ],
  cta: 'Quero viajar para esse lugar',
  confirm: 'Confirmar reserva',
}

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
