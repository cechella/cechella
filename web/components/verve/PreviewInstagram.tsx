'use client'
// Prévia FIEL ao que o público vê no Instagram. Só mostra o que será publicado (a legenda gravada no post e as imagens do carrossel), nunca um rascunho de tela.
// Dois modos: CELULAR (o feed do app, onde a maioria vê: foto 4:5, legenda cortada em "… mais") e COMPUTADOR (a página do post na web: foto à esquerda, legenda inteira à direita).
import { useState } from 'react'
import { emBrasilia } from '@/lib/verve/horario'
import { legendaRecolhida, resumoPreview, LIMITE_FEED } from '@/lib/verve/preview-legenda'

export interface PostPreview {
  id: string
  titulo: string
  tipo?: string
  legenda?: string | null
  image_urls?: string[] | null
  slides?: number | null
  scheduled_at?: string | null
  status?: string
}

const ICONE = 'w-6 h-6 fill-none stroke-current stroke-2'
const Coracao = () => <svg viewBox="0 0 24 24" className={ICONE}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
const Comentario = () => <svg viewBox="0 0 24 24" className={ICONE}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
const Enviar = () => <svg viewBox="0 0 24 24" className={ICONE}><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
const Salvar = () => <svg viewBox="0 0 24 24" className={ICONE}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>

export default function PreviewInstagram(props: {
  post: PostPreview
  slide: number
  onSlide: (n: number) => void
  onClose: () => void
  onRecusar: () => void
  onAutorizar: () => void
  rotuloAutorizar: string
}) {
  const { post, slide, onSlide, onClose, onRecusar, onAutorizar, rotuloAutorizar } = props
  const [modo, setModo] = useState<'celular' | 'pc'>('celular')
  const [claro, setClaro] = useState(false)
  const [aberta, setAberta] = useState(false)
  const imgs = (post.image_urls ?? []).filter(Boolean)
  const legenda = typeof post.legenda === 'string' ? post.legenda : ''
  const resumo = resumoPreview(post)
  const rec = legendaRecolhida(legenda)
  const quando = emBrasilia(post.scheduled_at)

  const Slide = (
    <div className="pv-img relative bg-black flex-shrink-0 select-none">
      {imgs[slide] ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imgs[slide]} alt={`Slide ${slide + 1}`} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-[#111]"><p className="text-[#444] text-sm">Gerando fotos…</p></div>
      )}
      {imgs.length > 1 && (
        <div className="absolute top-3 right-3 bg-black/60 rounded-full px-2.5 py-1 text-[11px] text-white font-medium">{slide + 1}/{imgs.length}</div>
      )}
      {slide > 0 && <button aria-label="Slide anterior" onClick={() => onSlide(slide - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 text-black text-lg leading-none">‹</button>}
      {slide < imgs.length - 1 && <button aria-label="Próximo slide" onClick={() => onSlide(slide + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 text-black text-lg leading-none">›</button>}
    </div>
  )

  const Pontos = imgs.length > 1 && (
    <div className="flex items-center justify-center gap-1">
      {imgs.map((_, i) => <span key={i} className={`rounded-full ${i === slide ? 'w-1.5 h-1.5 bg-[#0095f6]' : 'w-1.5 h-1.5 bg-[var(--pv-mudo)] opacity-60'}`} />)}
    </div>
  )

  const Cabecalho = (
    <div className="pv-head px-3 py-2.5 flex items-center gap-3 flex-shrink-0">
      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-0.5 flex-shrink-0">
        <div className="w-full h-full rounded-full bg-[var(--pv-fundo)] flex items-center justify-center"><span className="text-[9px] font-bold">VC</span></div>
      </div>
      <p className="flex-1 text-[14px] font-semibold leading-tight">viniciuscechella</p>
      <span className="text-xl leading-none px-1" aria-hidden>···</span>
    </div>
  )

  const Acoes = (
    <div className="pv-act px-3 py-2.5 flex items-center flex-shrink-0 relative">
      <div className="flex items-center gap-4"><Coracao /><Comentario /><Enviar /></div>
      <div className="pv-dots absolute left-0 right-0 flex justify-center pointer-events-none">{Pontos}</div>
      <div className="flex-1" /><Salvar />
    </div>
  )

  const Legenda = (completa: boolean) => (
    <div className="pv-cap px-3 pb-3 text-[14px] leading-snug">
      {legenda.trim() ? (
        completa || aberta || !rec.cortou ? (
          <p className="whitespace-pre-wrap"><span className="font-semibold">viniciuscechella</span> {legenda}</p>
        ) : (
          <p className="whitespace-pre-wrap"><span className="font-semibold">viniciuscechella</span> {rec.visivel}… <button onClick={() => setAberta(true)} className="text-[var(--pv-mudo)]">mais</button></p>
        )
      ) : (
        <p className="text-red-400 font-semibold">Sem legenda: será publicado sem texto.</p>
      )}
      <p className="mt-1.5 text-[11px] uppercase tracking-wide text-[var(--pv-mudo)]">{quando.data ? `Agendado para ${quando.data.split('-').reverse().join('/')} às ${quando.hora}` : 'Sem horário definido'}</p>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm" onClick={onClose}>
      <style>{`
        .pv{--pv-fundo:#000;--pv-texto:#f5f5f5;--pv-mudo:#a8a8a8;--pv-linha:#262626;color:var(--pv-texto)}
        .pv.claro{--pv-fundo:#fff;--pv-texto:#262626;--pv-mudo:#737373;--pv-linha:#dbdbdb}
        .pv-card{background:var(--pv-fundo);border:1px solid var(--pv-linha)}
        .pv-img{aspect-ratio:4/5;width:100%}
        .pv-cel{width:min(390px,95vw);max-height:100dvh;overflow-y:auto;padding:8px 0}
        .pv-cel .pv-card{border-radius:1rem}
        .pv-botoes{position:sticky;bottom:0;padding-top:8px;background:linear-gradient(to bottom,transparent,rgba(0,0,0,.92) 35%)}
        .pv-pc{width:auto;max-width:96vw}
        .pv-pc .pv-card{display:grid;grid-template-columns:calc(min(100dvh - 190px,780px)*0.8) minmax(320px,400px);grid-template-rows:auto 1fr auto;height:min(calc(100dvh - 190px),780px);border-radius:1rem;overflow:hidden}
        .pv-pc .pv-img{grid-column:1;grid-row:1 / span 3;height:100%;aspect-ratio:auto}
        .pv-pc .pv-head{grid-column:2;grid-row:1;border-bottom:1px solid var(--pv-linha)}
        .pv-pc .pv-cap{grid-column:2;grid-row:2;overflow-y:auto;padding-top:12px}
        .pv-pc .pv-act{grid-column:2;grid-row:3;border-top:1px solid var(--pv-linha)}
        .pv-pc .pv-dots{display:none}
      `}</style>
      <div className={`pv ${claro ? 'claro' : ''} ${modo === 'celular' ? 'pv-cel' : 'pv-pc'} relative flex flex-col gap-2`} onClick={e => e.stopPropagation()}>
        {/* Controles da prévia (não fazem parte do Instagram) */}
        <div className="flex items-center gap-2 text-[12px] text-white flex-shrink-0">
          <div className="flex rounded-lg overflow-hidden border border-white/20">
            <button onClick={() => setModo('celular')} className={`px-3 py-1.5 ${modo === 'celular' ? 'bg-white text-black font-semibold' : 'bg-white/5'}`}>📱 Celular (feed)</button>
            <button onClick={() => setModo('pc')} className={`px-3 py-1.5 ${modo === 'pc' ? 'bg-white text-black font-semibold' : 'bg-white/5'}`}>🖥 Computador</button>
          </div>
          <button onClick={() => setClaro(c => !c)} className="px-3 py-1.5 rounded-lg border border-white/20 bg-white/5">{claro ? '☾ Escuro' : '☀ Claro'}</button>
          <div className="flex-1" />
          <button onClick={onClose} className="px-2 py-1.5 text-white/70 hover:text-white" aria-label="Fechar">✕</button>
        </div>

        <div className="pv-card overflow-hidden flex-shrink-0">
          {Cabecalho}
          {Slide}
          {Acoes}
          {Legenda(modo === 'pc')}
        </div>

        {/* O que vai ser publicado, em fatos */}
        <div className="text-[11px] text-white/70 leading-snug flex-shrink-0">
          {resumo.avisos.map(a => <p key={a} className="text-red-300 font-semibold">⚠ {a}</p>)}
          <p>{resumo.slides} imagens (1080×1350, proporção 4:5) · legenda de {resumo.caracteres} caracteres · {resumo.hashtags} hashtags{modo === 'celular' && rec.cortou ? ` · no feed o público vê só os primeiros ~${LIMITE_FEED} caracteres antes de “mais”` : ''}.</p>
          <p>Publicação pela API oficial do Instagram, como post normal (sem “Patrocinado”).</p>
        </div>

        <div className="pv-botoes flex gap-2">
          <button onClick={onRecusar} className="flex-1 py-3 rounded-xl text-sm font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all">✕ Recusar</button>
          <button onClick={onAutorizar} className="flex-1 py-3 rounded-xl text-sm font-semibold bg-[#22c55e] text-black hover:bg-[#16a34a] transition-all">{rotuloAutorizar}</button>
        </div>
      </div>
    </div>
  )
}
