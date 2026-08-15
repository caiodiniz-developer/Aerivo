import { useEffect } from 'react'
import { destinations } from '../content'

/**
 * Fundos dos destinos: TODOS renderizados de uma vez, empilhados, e nenhum
 * troca de `src`. Quem acende e apaga cada camada é a master timeline, pelo
 * scroll — trocar a imagem por estado do React brigaria com o ScrollTrigger e
 * é o que causava flicker e destino pulado.
 *
 * Fica em `z-index: 0`, abaixo do canvas WebGL (`z-index: 1`), que é o que põe
 * o avião voando *sobre* a foto. Só funciona porque o canvas é alpha e, neste
 * trecho, o céu 3D sai da câmera principal (ver `WorldVisibility`).
 *
 * `position: fixed` aqui é consequência de o canvas ser fixo: os dois têm de
 * ocupar exatamente o mesmo retângulo para compor. O vazamento para a última
 * seção não é resolvido por posicionamento e sim pela própria timeline — o
 * último segmento apaga o fundo antes de o pin terminar.
 */
export default function StageBackdrop() {
  // Pré-carrega tudo: rolar rápido nunca deve mostrar imagem vazia.
  useEffect(() => {
    destinations.forEach((d) => {
      const img = new Image()
      img.src = d.photo
    })
  }, [])

  return (
    <div className="backdrop" aria-hidden="true">
      {/* `<img>` e não `background-image` num div: animar `scale` num
          background-image obriga o navegador a repintar a imagem em escala
          nova a cada frame. Com <img> + object-fit, a camada fica compostada
          na GPU e o crossfade é só opacidade + transform. */}
      {destinations.map((d, i) => (
        <img
          key={d.code}
          className="backdrop__layer"
          data-bg={i}
          src={d.photo}
          alt=""
          decoding="async"
          fetchPriority={i === 0 ? 'high' : 'low'}
        />
      ))}
      <div className="backdrop__scrim" />

      {/* Painel próprio da seção final. Vive na mesma pilha das fotos, por
          cima delas, e é ele que apaga os monumentos quando o CTA entra —
          por isso a master timeline não precisa apagar a última foto, que era
          o que abria a tela preta entre a última viagem e o CTA. */}
      <div className="backdrop__closing" />
    </div>
  )
}
