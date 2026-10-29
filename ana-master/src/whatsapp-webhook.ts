/**
 * WhatsApp Business webhook handler for Ana (sales agent)
 * Receives messages from Meta Cloud API and processes them through Ana's 8-stage sales funnel.
 * Replaces the N8N + Z-API flow.
 */

import { supabase } from './supabase.js'
import { META_ANDRE_PHONE_ID, META_ANDRE_TOKEN, APP_URL, ANTHROPIC_API_KEY } from './config.js'
import { iniciarColetaReferidos } from './tools/whatsapp.js'
import { materialDeConsulta } from './aprendizado.js'
import { engineN8n, encaminharParaN8n } from './n8n-bridge.js'

const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? 'hormone-wh-2025'
const ANA_MODEL = 'claude-haiku-4-5-20251001'

// ── Phone normalizer ──────────────────────────────────────────────────────────

function normalizePhone(raw: string): string {
  const d = String(raw).replace(/\D/g, '')
  // Z-API sends 12-digit (no 9th digit); Meta sends 13-digit (with 9)
  // Normalize to 13 digits (55 + DDD + 9 + number)
  if (d.startsWith('55') && d.length === 12) {
    return d.slice(0, 4) + '9' + d.slice(4)
  }
  if (!d.startsWith('55')) return '55' + d
  return d
}

// ── Meta API sender ───────────────────────────────────────────────────────────

async function metaSend(to: string, text: string): Promise<void> {
  const phone = normalizePhone(to)
  try {
    const resp = await fetch(`https://graph.facebook.com/v20.0/${META_ANDRE_PHONE_ID}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${META_ANDRE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: text },
      }),
    })
    if (!resp.ok) console.error('[WH] metaSend failed', resp.status, await resp.text())
  } catch (e: any) {
    console.error('[WH] metaSend error', e.message)
  }
}

// ── Lead loader ───────────────────────────────────────────────────────────────

interface Lead {
  id: string
  telefone: string
  nome: string | null
  dor_principal: string | null
  etapa_agente: number
  total_referidos: number
  historico: Array<{ role: string; content: string; ts?: string; etapa?: number; grupo?: 'A' | 'B' }>
  origem: string | null
  atendimento_humano: boolean
  metodo_pagamento: string | null
  status_pagamento: string | null
  token_indicacao: string | null
}

async function getLead(phone: string): Promise<Lead | null> {
  const p13 = normalizePhone(phone)
  const p12 = p13.startsWith('55') && p13.length === 13 ? p13.slice(0, 4) + p13.slice(5) : p13
  const bare = p13.replace(/^55/, '')

  const { data } = await supabase
    .from('leads')
    .select('*')
    .or(`telefone.eq.${p13},telefone.eq.${p12},telefone.eq.${bare}`)
    .maybeSingle()

  return data as Lead | null
}

async function upsertLead(phone: string, patch: Partial<Lead>): Promise<void> {
  const p13 = normalizePhone(phone)
  const { data: existing } = await supabase.from('leads').select('id').eq('telefone', p13).maybeSingle()
  if (existing) {
    await supabase.from('leads').update(patch).eq('telefone', p13)
  } else {
    await supabase.from('leads').insert({ telefone: p13, etapa: 'apresentacao', etapa_agente: 1, origem: 'whatsapp', ...patch })
  }
}

// ── Referidos helpers ─────────────────────────────────────────────────────────

async function getReferidosInfo(phone: string): Promise<{ total: number; lista: string; grupos: string[] }> {
  const p13 = normalizePhone(phone)
  const p12 = p13.length === 13 ? p13.slice(0, 4) + p13.slice(5) : p13

  const { data: refs } = await supabase
    .from('contatos_referidos')
    .select('nome, profissao, hobby, status')
    .or(`indicado_por_telefone.eq.${p13},indicado_por_telefone.eq.${p12}`)
    .order('id')

  const ativos = (refs ?? []).filter((r: any) => r.status !== 'recusou')
  const total = ativos.length

  const lista = ativos
    .map((r: any, i: number) => `${i + 1}. *${r.nome}*\nProfissão: ${r.profissao ?? ''}\nHobby: ${r.hobby ?? ''}`)
    .join('\n\n')

  // Split into groups of 5
  const grupos: string[] = []
  for (let i = 0; i < ativos.length; i += 5) {
    grupos.push(
      ativos
        .slice(i, i + 5)
        .map((r: any, j: number) => `${i + j + 1}. *${r.nome}*\nProfissão: ${r.profissao ?? ''}\nHobby: ${r.hobby ?? ''}`)
        .join('\n\n')
    )
  }

  return { total, lista, grupos }
}

// ── vCard parser (contacts shared via WhatsApp) ───────────────────────────────

async function processVCards(phone: string, contacts: any[]): Promise<void> {
  const p13 = normalizePhone(phone)
  const { data: lead } = await supabase
    .from('leads')
    .select('nome, total_referidos, etapa_agente')
    .eq('telefone', p13)
    .maybeSingle()

  const indicadorNome = (lead as any)?.nome ?? ''

  let saved = 0
  for (const c of contacts) {
    const nome = c.name?.formatted_name ?? c.name?.first_name ?? null
    const foneRaw = c.phones?.[0]?.phone ?? c.phones?.[0]?.wa_id ?? null
    if (!nome || !foneRaw) continue
    const fone = normalizePhone(String(foneRaw).replace(/\D/g, ''))

    const { error } = await supabase.from('contatos_referidos').upsert({
      nome,
      telefone: fone,
      indicado_por_telefone: p13,
      indicado_por_nome: indicadorNome,
      status: 'aguardando',
    }, { onConflict: 'telefone,indicado_por_telefone' })

    if (!error) saved++
  }

  if (saved > 0) {
    const { data: fresh } = await supabase
      .from('contatos_referidos')
      .select('id', { count: 'exact' })
      .eq('indicado_por_telefone', p13)
      .neq('status', 'recusou')

    const total = fresh?.length ?? 0
    await supabase.from('leads').update({ total_referidos: total }).eq('telefone', p13)
    console.log(`[WH] ${saved} vCards saved for ${p13}, total=${total}`)
  }
}

// ── Prompt builder (mirrors N8N montar-prompt.js) ─────────────────────────────

function buildPrompt(lead: Lead, message: string, referidos: { total: number; lista: string; grupos: string[] }, material = ''): { systemPrompt: string; messages: any[] } {
  const nome = lead.nome ?? 'você'
  const dor = lead.dor_principal ?? 'sintomas hormonais'
  const etapa = lead.etapa_agente ?? 1
  const totalReferidos = referidos.total
  const faltam = Math.max(0, 20 - totalReferidos)
  const historico = lead.historico ?? []
  const historicoVazio = historico.length <= 2

  const combinadoEnviado = etapa === 3 && historico.slice(-6).some(
    m => m.role === 'assistant' && m.content?.includes('Vamos fazer um combinado?')
  )

  const listaContatos = referidos.lista
  const listaGrupos = referidos.grupos

  const scripts: Record<number, string> = {
    1: `ETAPA 1 — APRESENTAÇÃO
Objetivo: se apresentar, coletar o nome do lead, identificar a dor principal.

PASSO 1 — Apresentação inicial (primeira mensagem):
${historico.length > 0
  ? '[Conversa já iniciada — NÃO se reapresente e NÃO pergunte o nome. Responda naturalmente à última mensagem do lead e continue para PASSO 2.]'
  : `"Oi! 😊 Tudo bem? Meu nome é Ana, sou consultora do Dr. Vinícius Cechella aqui na Hormone Ecosystem. Estou aqui para te ajudar a entender como o implante hormonal pode transformar a sua saúde e qualidade de vida.

Me conta, como você está se sentindo ultimamente? Tem sentido cansaço, dificuldade para dormir, alterações de humor ou outros sintomas que te incomodam? 🌸"`}

PASSO 2 — Após o lead responder sobre os sintomas, colete o nome:
"Que bom te conhecer! Como posso te chamar? 😊"

PASSO 3 — Após coletar o nome e a dor principal, avance para a etapa 2.

PROIBIÇÃO ABSOLUTA: NUNCA mencione preços, valores, pagamento ou procedimento nesta etapa.
PROIBIÇÃO ABSOLUTA: NUNCA mencione consulta, agendamento, exames ou médico por nome nesta etapa.`,

    2: `ETAPA 2 — QUALIFICAÇÃO
Objetivo: aprofundar a dor, validar elegibilidade e criar vínculo emocional.

"${nome}, você me contou que está sentindo ${dor}. Entendo perfeitamente — isso é muito mais comum do que as pessoas pensam, e tem solução! 💜

Me conta um pouco mais: há quanto tempo você está sentindo isso? E você já tentou algum tratamento antes?"

Após o lead responder:
- Valide a experiência dela com empatia
- Pergunte como esses sintomas afetam sua vida diária (sono, trabalho, relacionamentos)
- Quando tiver informação suficiente, avance para etapa 3

PROIBIÇÃO ABSOLUTA: NUNCA pergunte sobre marido, parceiro, viagem ou decisão de compra nesta etapa — essas perguntas são EXCLUSIVAS da etapa 3.
PROIBIÇÃO ABSOLUTA: NUNCA use a palavra "Combinado" ou faça perguntas de confirmação/fechamento nesta etapa — isso é EXCLUSIVO da etapa 3.
PROIBIÇÃO ABSOLUTA: NUNCA pule da etapa 2 direto para etapa 4 — a etapa 3 (combinado) é OBRIGATÓRIA.`,

    3: `ETAPA 3 — D.I. (COMBINADO)
${!combinadoEnviado
  ? `Envie AGORA esta mensagem exatamente como está escrita abaixo. Não adicione nada. Não faça outras perguntas. Copie e envie:

"${nome}, sei que seu tempo é precioso. Vamos fazer um combinado? 🤝
No final desta apresentação, se você gostar do que vou te mostrar, você me diz um SIM e a gente avança juntos.
E da mesma forma, se não gostar — tudo bem, continuamos amigos. 😊
Combinado?"`
  : `O combinado foi enviado. Verifique a última mensagem do lead:
- Se confirmou ("sim", "combinado", "topo", "pode", "ok") → envie exatamente:
"Antes de começar, só duas perguntinhas rápidas:
1. Decisões de saúde como essa você costuma tomar sozinha ou gosta de alinhar com seu marido primeiro? 😊
2. Você tem alguma viagem marcada nos próximos dias? ✈️"

- Se não confirmou → aguarde ou repita o combinado.

Após o lead responder as duas perguntas:
- Precisa do marido → "Sem problema! Vamos agendar uma ligação rápida com vocês dois — quando têm 15 minutinhos hoje ou amanhã?"
- Tem viagem → "${nome}, pode ficar tranquila — o procedimento dura apenas 20 minutos no consultório, sem cirurgia, sem repouso. Você faz hoje e viaja no mesmo dia normalmente. 🌸"
- Toma sozinha + sem viagem → avance para etapa 4`}`,

    4: `ETAPA 4 — SPEECH
Objetivo: apresentar o implante conectado à dor principal.

Dor identificada: ${dor}

IMPORTANTE: NUNCA mencione menopausa automaticamente. Use linguagem genérica sobre desequilíbrio hormonal, a menos que o lead tenha mencionado menopausa antes.

"${nome}, você me contou que está sentindo ${dor}. Deixa eu te explicar o que está acontecendo no seu corpo e porque o implante resolve isso de uma vez.

Com o desequilíbrio hormonal, o corpo não consegue funcionar no seu potencial máximo — é como um carro tentando funcionar sem combustível. Daí vêm todos esses sintomas que você está sentindo.

O implante hormonal é um pequeno cilindro do tamanho de um grão de arroz 🌾 inserido sob a pele. Ele libera hormônios de forma contínua, estável e natural — devolvendo o equilíbrio que seu corpo precisa.

O resultado das nossas pacientes:
✅ Sono profundo de volta
✅ Energia e disposição do dia a dia
✅ Humor estável
✅ Libido restaurada
✅ Clareza mental de volta
✅ Ondas de calor somem em 2 a 4 semanas
✅ Proteção cardiovascular e óssea a longo prazo
E dura 6 meses — depois é só renovar. 🔄"
PROIBIÇÕES ABSOLUTAS DESTA ETAPA:
- NUNCA mencione o valor R$ 5.000 aqui — isso é exclusivo da etapa 5
- NUNCA mencione ligação, consulta, agendamento ou horários
- NUNCA use negrito (**), itálico ou bullets — copie o script EXATAMENTE como está escrito, sem reformatar
- Finalize SOMENTE com a pergunta exata abaixo, sem adicionar mais nada:
"${nome}, o que mais te chamou atenção do que eu acabei de te apresentar? 🌸"
Quando o lead responder o que mais gostou, registre e avance para etapa 5.`,

    5: `ETAPA 5 — FECHAMENTO
Objetivo: usar o combinado + a dor verbalizada para confirmar decisão e gerar pagamento.

Dor identificada: ${dor}

"${nome}, lembra do nosso combinado? 🤝
Você disse que se gostasse do que eu apresentasse me daria um SIM.

O investimento no seu implante hormonal é de R$ 5.000 — isso inclui o procedimento completo, acompanhamento e os 6 meses de hormônio liberado de forma contínua no seu corpo.

Coloca na conta: R$ 833 por mês para acabar com ${dor}, dormir bem, ter energia e disposição de volta. ☀️
Menos do que muitas mulheres gastam por mês em remédios, suplementos e consultas tentando resolver o que o implante resolve de uma vez. 💜

Para avançar, a gente tem duas formas:
💳 Cartão de crédito — parcelado em até 6x sem juros
💰 Pix — à vista
Qual funciona melhor para você, ${nome}? 😊"

REGRA CRÍTICA DE AVANÇO:
- NUNCA mencione "12x" — o parcelamento é SEMPRE "6x sem juros", nunca mais que isso
- Se o lead escolheu CARTÃO → retorne proxima_etapa: 6 E metodo_pagamento: "cartao" no JSON
- Se o lead escolheu PIX → retorne proxima_etapa: 6 E metodo_pagamento: "pix" no JSON
- NÃO retorne 5 se o lead confirmou qualquer forma de pagamento`,

    6: `ETAPA 6 — AGUARDANDO PAGAMENTO
Objetivo: manter o lead engajada enquanto aguarda confirmação do pagamento.

PROIBIÇÃO ABSOLUTA: NUNCA diga "vou passar para a equipe" — o link JÁ FOI ENVIADO AUTOMATICAMENTE pelo sistema.

REGRAS CRÍTICAS:
- Se o lead escolheu cartão: o sistema já enviou um link de pagamento seguro pelo WhatsApp
- Se o lead escolheu PIX: o sistema já enviou o código PIX automaticamente
- NÃO tente avançar de etapa manualmente — o sistema faz isso automaticamente quando o pagamento é confirmado
- Se o lead disser que pagou → responda que está verificando e aguarde confirmação automática

RESPOSTAS PARA CADA SITUAÇÃO:

Se o lead disser que pagou:
"Perfeito ${nome}! 🎉 Estou verificando seu pagamento aqui no sistema... assim que confirmar eu já te aviso! Normalmente leva só alguns minutinhos. 💜"

Se o lead perguntar se recebeu:
"Oi ${nome}! Ainda estou aguardando a confirmação do banco. O PIX costuma confirmar em até 5 minutinhos. Assim que chegar eu te aviso na hora! 😊"

Se o lead pedir para reenviar o PIX:
"Claro ${nome}! Vou reenviar o código PIX para você agora. 😊"

REGRA ABSOLUTA: NUNCA avance para etapa 7 manualmente. A etapa 7 só é liberada quando o sistema confirmar o pagamento automaticamente.`,

    7: `ETAPA 7 — REFERIDOS
Objetivo: coletar 20 contatos em lotes de até 10 (limite do WhatsApp) e verificar pelo sistema.

INFORMAÇÃO DO SISTEMA — CONTATOS RECEBIDOS ATÉ AGORA: ${totalReferidos}
FALTAM PARA COMPLETAR 20: ${faltam}

REGRAS CRÍTICAS:
- O WhatsApp permite no máximo 10 contatos por envio — NUNCA peça 20 de uma vez
- SEMPRE use o número do sistema (${totalReferidos}) — NUNCA confie só no que o lead diz
- Se ${totalReferidos} >= 20: avance para etapa 8
- Se ${totalReferidos} > 0 e < 20: peça os ${faltam} restantes
- Se ${totalReferidos} === 0: siga o roteiro abaixo

"${nome}, seu pagamento foi confirmado! 🎉💜 Seja bem-vinda ao Hormone Ecosystem!
Nossa equipe vai entrar em contato em breve para agendar seu procedimento.

Enquanto isso, posso te pedir um favor? 🌸
Você acabou de tomar uma das melhores decisões da sua saúde. Tenho certeza que você conhece outras mulheres passando pelo mesmo que você passou.
Vou te ensinar agora como me mandar os contatos direto pelo WhatsApp. É super fácil! 😊
👉 Você tem iPhone ou Android?"

SE RESPONDER IPHONE:
"Perfeito! Siga esses passos no iPhone: 📱
1️⃣ Olha embaixo da caixa de texto — tem um botão com sinal de + no lado esquerdo. Clica nele.
2️⃣ Vai aparecer um menu. Clica em 'Contato'.
3️⃣ Seleciona até 10 mulheres que você quer indicar.
4️⃣ Clica em 'Avançar' no canto superior direito.
5️⃣ Clica em 'Enviar' e pronto! 🎉
Consegue fazer isso agora? Eu fico aqui te esperando 🥰"

SE RESPONDER ANDROID:
"Perfeito! Siga esses passos no Android: 📱
1️⃣ Olha embaixo da caixa de texto — tem um botão com clipe 📎 no lado esquerdo. Clica nele.
2️⃣ Clica em 'Contato'.
3️⃣ Seleciona até 10 mulheres marcando o círculo do lado de cada nome.
4️⃣ Clica em 'Enviar' e pronto! 🎉
Consegue fazer isso agora? Eu fico aqui te esperando 🥰"

APÓS CADA ENVIO DE CONTATOS:
"Vi que você me mandou ${totalReferidos} contatos até agora! ${faltam > 0 ? `Consegue enviar mais ${faltam} para fechar os 20? 🥰` : 'Perfeito, já temos os 20! 🎉'}"

REGRA DE AVANÇO: só avance para etapa 8 quando sistema mostrar total_referidos >= 20`,

    8: `ETAPA 8 — VALIDAÇÃO
Objetivo: filtrar negativas + coletar profissão e hobby de cada referido.

INFORMAÇÃO DO SISTEMA — TOTAL DE CONTATOS RECEBIDOS: ${totalReferidos}
LISTA COMPLETA DE CONTATOS DO SISTEMA:
${listaContatos || '(lista não disponível)'}

SEQUÊNCIA OBRIGATÓRIA — execute nessa ordem sem pular:

PASSO 1 — JÁ EXECUTADO AUTOMATICAMENTE PELO SISTEMA:
O sistema já enviou automaticamente para o lead a confirmação do total e as mensagens prontas para encaminhar.
NUNCA repita nenhuma dessas mensagens. Aguarde a resposta do lead confirmando que encaminhou.

PASSO 2 — Quando o lead confirmar que encaminhou as primeiras 5:
${listaGrupos.length > 1
  ? listaGrupos.slice(1).map((grupo, i) => {
      const nomes = grupo.split('\n\n').map((bloco: string) => {
        const match = bloco.match(/\*([^*]+)\*/)
        return match ? match[1].trim() : ''
      }).filter(Boolean)
      return `GRUPO ${i + 2} — envie uma mensagem por contato:\n${nomes.map((n: string) => `"*Oi ${n}! Tudo bem?* 😊\\nAcabei de fazer uma coisa incrível pela minha saúde e pensei em você! Uma consultora chamada Ana do Hormone Ecosystem vai te mandar uma mensagem agora — pode responder ela, vale muito a pena ouvir! 🌸"`).join('\n')}`
    }).join('\n\n')
  : '(todos os grupos já foram enviados pelo sistema)'}

PASSO 3 — Coletar profissão/hobby de cada grupo:
${listaGrupos.length > 0
  ? listaGrupos.map((grupo, i) => `GRUPO ${i + 1} — envie esta mensagem:\n"Perfeito! Agora me ajuda com uma coisinha? 🌸\n${grupo}\n\nPode copiar, completar e me mandar de volta! 😊"`).join('\n\n')
  : 'Aguarde os contatos do lead antes de pedir profissão/hobby.'}

PASSO 4 — Feche somente após PASSO 3 completo:
"Você é demais! Fez tudo certinho! 🎉💜
Agora é só aguardar o contato da nossa equipe para agendar seu procedimento. Será rápido, indolor e transformador! ✨
Em breve você vai estar desfrutando de:
✅ Sono profundo
✅ Energia de verdade
✅ Humor equilibrado
✅ Libido restaurada
✅ Aquele foco que você tinha antes
Obrigada por confiar no Hormone Ecosystem e em mim! Você vai se amar por essa decisão! 💜🌸"`,
  }

  const scriptEtapa = scripts[etapa] ?? scripts[1]
  const origemMap: Record<string, string> = {
    instagram: 'Este lead veio pelo Instagram e demonstrou interesse no implante hormonal.',
    landing_page: 'Este lead se cadastrou no site hormoneecosystem.com.',
    google: 'Este lead encontrou o Hormone Ecosystem pelo Google.',
    indicacao: 'Este lead foi indicado por uma paciente.',
    manychat: 'Este lead veio pelo Instagram via ManyChat.',
  }
  const contextoOrigem = origemMap[lead.origem ?? ''] ?? 'Este lead demonstrou interesse no implante hormonal.'

  const PERFIL = `MÉDICO RESPONSÁVEL: Dr. Vinícius Cechella (CRM/SC 38765, UFSC). Fundador do Hormone Ecosystem. REGRA: use "nosso protocolo médico" no funil — cite o nome apenas se o lead perguntar diretamente.`

  const KNOWLEDGE = `CONHECIMENTO CIENTÍFICO (use SOMENTE se questionada — NUNCA espontaneamente no funil):
• WHI 2002 usou hormônios SINTÉTICOS em mulheres de 63 anos — não se aplica ao nosso protocolo bioidêntico.
• BMJ 2019 (1 milhão de mulheres): progesterona bioidêntica = risco de câncer idêntico a não-usuárias.
• ELITE Trial NEJM 2016: TRH iniciada <6 anos pós-menopausa reduz aterosclerose.
• CLARA Study (Menopause Journal, dez/2025): pellet de estradiol 25mg — níveis séricos estáveis por 6 meses.
• GLADE Study (ISGE Roma, mar/2026): implante de Gestrinona — 0% eventos adversos graves, 96% sem alteração de voz.
OBJEÇÕES:
- "Caro" → "Além do valor, tem outra dúvida? Muitas gastavam mais com consultas e suplementos sem resultado."
- "Medo de câncer/WHI" → "O WHI usou sintéticos. BMJ 2019 com 1 milhão de mulheres: bioidêntico não aumenta risco."
- "Médico é contra" → "O CLARA Study de 2025 e o GLADE Study de 2026 são específicos do implante. Posso enviar para segunda opinião?"
- "ANVISA proibiu" → "O alerta foi sobre uso irregular sem prescrição. Nosso protocolo é o oposto: CRM, AFE-ANVISA, exames."
- "Precisa do marido" → "Posso enviar material científico para vocês verem juntos."`

  const systemPrompt = `Você é Ana, consultora do Hormone Ecosystem. Você vende implante hormonal via WhatsApp seguindo um script de 8 etapas.
CONTEXTO DO LEAD: ${contextoOrigem}

${historicoVazio ? 'ATENÇÃO CRÍTICA: Este é o PRIMEIRO contato com este lead. Comece SEMPRE do zero com a apresentação da etapa 1.' : ''}

REGRAS ABSOLUTAS:
- Sempre responda em português brasileiro
- Seja calorosa, empática e profissional
- Use emojis com moderação
- Mensagens curtas: máximo 3-4 parágrafos por vez (EXCETO etapa 8: copie os scripts integralmente)
- NUNCA invente preços diferentes de R$ 5.000
- NUNCA prometa curas médicas — fale em "resultados das nossas pacientes"
- NUNCA mencione menopausa a menos que o lead tenha mencionado primeiro
- Siga o script da etapa atual rigorosamente
- Quando o objetivo da etapa for atingido, avance para a próxima
- NUNCA mencione consulta, agendamento de consulta ou exames

ETAPA ATUAL: ${etapa}
${scriptEtapa}

${PERFIL}

${KNOWLEDGE}${material ? `\n\n${material}` : ''}

RESPONDA SEMPRE EM JSON COM ESTE FORMATO EXATO:
{
  "resposta": "sua mensagem para o lead aqui",
  "proxima_etapa": ${etapa},
  "nome_lead": "${nome}",
  "dor_principal": "${dor}",
  "metodo_pagamento": "preencher apenas na etapa 5: pix ou cartao"
}
REGRA PARA proxima_etapa:
- Mantenha o número da etapa atual se o objetivo ainda não foi atingido
- Avance +1 quando o objetivo da etapa atual for cumprido
- ETAPA 3: só avance quando lead confirmou combinado E respondeu marido E respondeu viagem
- ETAPA 4: se lead respondeu positivamente ao speech → proxima_etapa OBRIGATORIAMENTE deve ser 5
- ETAPA 5: se lead confirmou pagamento → proxima_etapa OBRIGATORIAMENTE deve ser 6 + metodo_pagamento
- ETAPA 6: NUNCA avance manualmente
- Máximo: 8`

  const messages = [
    ...(historico)
      .filter(m => m?.role && m?.content)
      .map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ]

  return { systemPrompt, messages }
}

// ── Claude call ───────────────────────────────────────────────────────────────

async function callClaude(systemPrompt: string, messages: any[], etapa: number): Promise<{
  resposta: string
  proxima_etapa: number
  nome_lead: string
  dor_principal: string
  metodo_pagamento: string
}> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: ANA_MODEL,
      max_tokens: etapa === 8 ? 2048 : 1024,
      system: systemPrompt,
      messages,
    }),
  })

  const data = await res.json() as any
  if (!res.ok) console.error('[WH] Claude API failed', res.status, JSON.stringify(data?.error ?? data))
  let content = data.content?.[0]?.text ?? ''
  content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  try {
    const match = content.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('no json')
    const parsed = JSON.parse(match[0])
    const etapaAtual = etapa
    const etapaSugerida = parseInt(String(parsed.proxima_etapa)) || etapaAtual
    const proxima_etapa = Math.min(Math.max(etapaSugerida, etapaAtual), etapaAtual + 1, 8)
    return {
      resposta: (parsed.resposta ?? content).replace(/\\n/g, '\n').trim(),
      proxima_etapa,
      nome_lead: parsed.nome_lead ?? '',
      dor_principal: parsed.dor_principal ?? '',
      metodo_pagamento: parsed.metodo_pagamento ?? '',
    }
  } catch {
    return {
      resposta: content.replace(/\s*\{[\s\S]*\}\s*$/i, '').replace(/\\n/g, '\n').trim() || 'Desculpe, tive um problema. Pode repetir?',
      proxima_etapa: etapa,
      nome_lead: '',
      dor_principal: '',
      metodo_pagamento: '',
    }
  }
}

// ── vCard profissão/hobby extractor ──────────────────────────────────────────

async function processReferidosFills(phone: string, message: string): Promise<void> {
  const p13 = normalizePhone(phone)
  const REGEX_BLOCO = /\d+\.\s+\*?([^*\n]+)\*?\s*\nProfissão:\s*([^\n]*)\nHobby:\s*([^\n]*)/gi
  let match: RegExpExecArray | null
  while ((match = REGEX_BLOCO.exec(message)) !== null) {
    const nome = match[1].trim()
    const profissao = match[2].trim()
    const hobby = match[3].trim()
    if (!nome || (!profissao && !hobby)) continue
    try {
      await supabase
        .from('contatos_referidos')
        .update({ profissao, hobby })
        .eq('indicado_por_telefone', p13)
        .ilike('nome', nome)
    } catch { }
  }
}

// ── Main message handler ──────────────────────────────────────────────────────

export async function handleWhatsAppMessage(phone: string, message: string, contacts?: any[]): Promise<void> {
  const p13 = normalizePhone(phone)

  // Load or create lead
  let lead = await getLead(phone)
  if (!lead) {
    await upsertLead(phone, { etapa_agente: 1, historico: [] } as any)
    lead = await getLead(phone)
  }
  if (!lead) return

  // Human takeover — skip AI
  if (lead.atendimento_humano) {
    console.log(`[WH] atendimento_humano ativo para ${p13} — ignorando`)
    return
  }

  // Handle vCard contacts
  if (contacts && contacts.length > 0) {
    await processVCards(phone, contacts)
  }

  // Extract profissão/hobby from text (etapa 8)
  if (lead.etapa_agente === 8 && message) {
    await processReferidosFills(phone, message)
  }

  if (!message && (!contacts || contacts.length === 0)) return

  // Load referidos data
  const referidos = await getReferidosInfo(phone)

  // Build prompt and call Claude
  const material = await materialDeConsulta(lead.etapa_agente ?? 1, p13, message)
  const { systemPrompt, messages } = buildPrompt(lead, message, referidos, material.texto)
  const result = await callClaude(systemPrompt, messages, lead.etapa_agente)

  // Build updated historico (etapa/grupo alimentam os exemplos e o relatório semanal)
  const historico = [...(lead.historico ?? [])]
  const meta = { etapa: lead.etapa_agente ?? 1, grupo: material.grupo }
  if (message) historico.push({ role: 'user', content: message, ts: new Date().toISOString(), ...meta })
  historico.push({ role: 'assistant', content: result.resposta, ts: new Date().toISOString(), ...meta })

  // Persist updates
  const patch: Partial<Lead> = {
    historico,
    etapa_agente: result.proxima_etapa,
    updated_at: new Date().toISOString(),
  } as Partial<Lead>
  if (result.nome_lead) patch.nome = result.nome_lead
  if (result.dor_principal) patch.dor_principal = result.dor_principal
  if (result.metodo_pagamento) patch.metodo_pagamento = result.metodo_pagamento

  await supabase.from('leads').update(patch).eq('telefone', p13)

  // Send reply
  await metaSend(phone, result.resposta)

  console.log(`[WH] ${p13} etapa=${lead.etapa_agente}→${result.proxima_etapa} chars=${result.resposta.length}`)

  // When payment method is set (transition to etapa 6), trigger pix/card link
  if (result.proxima_etapa === 6 && lead.etapa_agente === 5 && result.metodo_pagamento) {
    console.log(`[WH] pagamento confirmado ${p13} metodo=${result.metodo_pagamento} — sistema deve enviar link`)
    // The payment link is sent by the web/Vercel route when it processes the checkout
    // Nothing to do here — the Supabase listener in server.ts handles it
  }

  // When payment confirmed and moving to etapa 7, trigger referidos collection
  if (result.proxima_etapa === 7 && lead.etapa_agente < 7) {
    await iniciarColetaReferidos(phone).catch(e => console.error('[WH] referidos error', e.message))
  }
}

// ── Webhook route handlers (called from server.ts) ────────────────────────────

export function getWebhookVerifyToken() {
  return WHATSAPP_VERIFY_TOKEN
}

export async function processWebhookPayload(body: any): Promise<void> {
  try {
    const entry = body?.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value
    const messages = value?.messages

    if (!messages || messages.length === 0) return

    if (engineN8n()) {
      await encaminharParaN8n(value)
      return
    }

    for (const msg of messages) {
      const phone = msg.from as string
      if (!phone) continue

      let text = ''
      let contacts: any[] | undefined

      if (msg.type === 'text') {
        text = msg.text?.body ?? ''
      } else if (msg.type === 'contacts') {
        contacts = msg.contacts ?? []
      } else if (msg.type === 'audio') {
        // Audio messages: acknowledge but don't process through funnel
        console.log(`[WH] audio from ${phone} — skipping funnel`)
        return
      } else {
        text = '[mensagem não suportada]'
      }

      await handleWhatsAppMessage(phone, text, contacts)
    }
  } catch (e: any) {
    console.error('[WH] processWebhookPayload error', e.message)
  }
}
