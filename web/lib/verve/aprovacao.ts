// Aprovação de um post a pedido do CEO, feita pelo Gustavo (ATLAS) com o token do agendador. A decisão é sempre do CEO (ele autoriza e confirma no WhatsApp);
// aqui só se aplicam as travas de segurança no servidor, independentes do que o ATLAS afirma. Falhou uma trava = nada é aprovado.
import { problemaDoPost } from './publish-core.ts'
import { complianceViolations } from './compliance.ts'

export const MAX_APROVACOES_POR_DIA = 3
export const MAX_DIAS_A_FRENTE = 14
export const MARGEM_AGORA_MS = 3 * 60 * 1000            // "agora" = daqui a 3 min (o agendador roda a cada 5 e publica até 2 min antes)
export const STATUS_APROVAVEIS = ['rascunho', 'aguardando']

export interface PostParaAprovar { status?: unknown; tipo?: unknown; image_urls?: unknown; legenda?: unknown; titulo?: unknown }

export interface Decisao { ok: boolean; problemas: string[]; scheduled_at?: string }

// quando: 'agora' | ISO | undefined (mantém o horário já marcado, se futuro; senão 'agora')
export function avaliarAprovacao(post: PostParaAprovar, quando: unknown, agora: Date, aprovadosHoje: number, horarioAtual?: unknown): Decisao {
  const p: string[] = []
  if (!STATUS_APROVAVEIS.includes(String(post.status))) p.push(`status_${String(post.status)}_nao_aprovavel`)
  const img = problemaDoPost({ tipo: post.tipo, image_urls: post.image_urls })
  if (img) p.push(img)
  const legenda = String(post.legenda ?? '')
  if (legenda.trim().length < 10) p.push('legenda_vazia')
  if (legenda.length > 2200) p.push('legenda_acima_de_2200')
  if ((legenda.match(/#\w+/g) ?? []).length > 5) p.push('mais_de_5_hashtags')
  if (!legenda.includes('38765') || !/m[ée]dico/i.test(legenda)) p.push('falta_identificacao_do_medico')
  for (const v of complianceViolations(`${post.titulo ?? ''}\n${legenda}`)) p.push(`publicidade_medica:${v}`)
  if (aprovadosHoje >= MAX_APROVACOES_POR_DIA) p.push('limite_diario_de_aprovacoes')
  let alvo: number
  if (quando === 'agora' || quando === undefined || quando === null || quando === '') {
    const t = typeof horarioAtual === 'string' ? Date.parse(horarioAtual) : NaN
    alvo = quando === undefined && !Number.isNaN(t) && t > agora.getTime() ? t : agora.getTime() + MARGEM_AGORA_MS
  } else {
    alvo = typeof quando === 'string' ? Date.parse(quando) : NaN
    if (Number.isNaN(alvo)) p.push('horario_invalido')
    else if (alvo < agora.getTime() - 60_000) p.push('horario_no_passado')
    else if (alvo > agora.getTime() + MAX_DIAS_A_FRENTE * 86_400_000) p.push('horario_alem_de_14_dias')
  }
  if (p.length) return { ok: false, problemas: p }
  return { ok: true, problemas: [], scheduled_at: new Date(alvo).toISOString() }
}
