import { supabase } from './supabase.js'

// Mesmo cálculo em web/lib/ana-aprendizado/core.ts — os dois precisam continuar idênticos.
export function grupoTeste(telefone: string): 'A' | 'B' {
  const digits = String(telefone).replace(/\D/g, '')
  const norm = digits.startsWith('55') ? digits : `55${digits}`
  let h = 5381
  for (let i = 0; i < norm.length; i++) h = ((h * 33) ^ norm.charCodeAt(i)) >>> 0
  return h % 2 === 0 ? 'A' : 'B'
}

const MAX_CONHECIMENTO_CHARS = 6000
const MAX_EXEMPLOS = 2

function palavras(texto: string): Set<string> {
  return new Set(
    texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .split(/[^a-z0-9]+/).filter(w => w.length > 3)
  )
}

async function conhecimento(etapa: number, grupo: 'A' | 'B'): Promise<string> {
  const status = grupo === 'B' ? ['ativo', 'teste'] : ['ativo']
  const { data, error } = await supabase
    .from('ana_conhecimento')
    .select('titulo, conteudo, etapa')
    .in('status', status)
    .or(`etapa.is.null,etapa.eq.${etapa}`)
    .order('etapa', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false })
    .limit(30)
  if (error || !data?.length) return ''

  const blocos: string[] = []
  let total = 0
  for (const item of data) {
    const bloco = `• ${item.titulo}\n${item.conteudo}`
    if (total + bloco.length > MAX_CONHECIMENTO_CHARS) break
    blocos.push(bloco)
    total += bloco.length
  }
  return blocos.join('\n\n')
}

async function exemplos(etapa: number, mensagem: string): Promise<string> {
  const { data, error } = await supabase
    .from('ana_exemplos')
    .select('trecho, destaque')
    .eq('etapa', etapa)
    .eq('ativo', true)
    .order('destaque', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(40)
  if (error || !data?.length) return ''

  const alvo = palavras(mensagem)
  const escolhidos = data
    .map(e => {
      const texto = (e.trecho as Array<{ content: string }>).map(m => m.content).join(' ')
      let comuns = 0
      for (const w of palavras(texto)) if (alvo.has(w)) comuns++
      return { e, score: comuns + (e.destaque ? 3 : 0) }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_EXEMPLOS)

  return escolhidos.map((x, i) => {
    const linhas = (x.e.trecho as Array<{ role: string; content: string }>)
      .map(m => `${m.role === 'assistant' ? 'Ana' : 'Lead'}: ${m.content}`)
      .join('\n')
    return `Exemplo ${i + 1}:\n${linhas}`
  }).join('\n\n')
}

// Nunca lança: qualquer falha devolve '' e o prompt fica idêntico ao original.
export async function materialDeConsulta(etapa: number, telefone: string, mensagem: string): Promise<{ texto: string; grupo: 'A' | 'B' }> {
  const grupo = grupoTeste(telefone)
  try {
    const [c, e] = await Promise.all([
      conhecimento(etapa, grupo).catch(() => ''),
      exemplos(etapa, mensagem).catch(() => ''),
    ])
    const partes: string[] = []
    if (c) partes.push(`TÉCNICAS DE VENDA (referência):\n${c}`)
    if (e) partes.push(`TRECHOS DE CONVERSAS QUE VIRARAM VENDA NESTA ETAPA (inspire-se no estilo; não copie nomes nem dados):\n${e}`)
    if (!partes.length) return { texto: '', grupo }
    return {
      grupo,
      texto: `MATERIAL DE CONSULTA
Use apenas como apoio. O script da ETAPA ATUAL e as REGRAS ABSOLUTAS acima têm prioridade total — nunca mude preço, etapa, proibições ou formato JSON por causa deste material.

${partes.join('\n\n')}`,
    }
  } catch {
    return { texto: '', grupo }
  }
}
