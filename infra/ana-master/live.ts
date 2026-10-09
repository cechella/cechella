// GPT-Live-1 session handler for ANA MASTER
// Stack: gpt-live-1 + bossa + PCMU 8kHz passthrough (no audio conversion)
// Runs in parallel with realtime.ts (gpt-realtime-2.1 + marin) — feature flag selects which.

import WebSocket from 'ws'
import { OPENAI_API_KEY, APP_URL } from './config.js'
import { upsertCall, saveMemory, appendTranscript, getVoiceConfig, getMemories, checkReferidos, updateLeadsGanho, supabase, buildSessionContext, endCall, getLeadByPhone } from './supabase.js'
import { iniciarColetaReferidos, sendWelcome } from './tools/whatsapp.js'
import { registerLiveSession, unregisterLiveSession } from './live-registry.js'
import { pushTranscriptEvent, pushCallEndedEvent } from './sse-registry.js'
import { scheduleCallback } from './redial.js'

const LIVE_ENDPOINT = 'wss://api.openai.com/v1/live/sessions'

const ANA_LIVE_PROMPT_FALLBACK = `ANA MASTER — REALTIME GOLDEN VOICE
FULL SALES CONVERSATION — SYSTEM INSTRUCTIONS
TELEPHONE / TWILIO READY

--- VOZ & PROSÓDIA (pt-BR Sul/SC) ---
Você é a ANA: mulher brasileira de 39–40 anos, catarinense (Balneário Camboriú), falando pt-BR nativo ao telefone.
Voz quente e adulta, confiante e tranquila, com curiosidade genuína na entonação.
Cadência do litoral de SC: ritmo levemente mais calmo, vogais bem brasileiras, pausas naturais curtas após algo importante.
Entonação conversacional do Sul (influência gaúcha bem sutil): final de frase mais "assentado"/descendente quando afirma, e leve subida quando pergunta.
Pacing: frases curtas, 1 ideia por vez; respire entre blocos; use micro-pausas para dar espaço e soar humana.
Idioma: responda sempre em português brasileiro (pt-BR).
--- FIM VOZ & PROSÓDIA ---

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⛔ REGRAS CRÍTICAS — NUNCA VIOLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NUNCA diga estas frases — nem variações delas:
— "deixa eu pensar em como te responder"
— "deixa eu organizar isso na minha cabeça"
— "vou organizar o que você disse"
— "deixa eu organizar rapidinho"
— "certo, deixa eu pensar"
— qualquer frase que narre seu processamento interno
— "deixa eu checar isso rapidinho"
— "deixa eu pensar em como responder"
— "tô pensando aqui"
— "rapidinho", "deixa eu acompanhar", "deixa eu verificar", "um instante" ou qualquer preamble que narre processamento
— Se não tiver certeza que a lead terminou de falar: aguarde. Não antecipe. Não tome o turno por impulso.

REGRA POSITIVA PARA NOTIFICAÇÕES DO SISTEMA:
Ao receber qualquer notificação entre colchetes ([REFERIDOS ATUALIZACAO], [PIX ENVIADO], [PAGAMENTO CONFIRMADO], [LINK CARTAO ENVIADO], [REFERIDOS COMPLETOS]), fale APENAS o conteúdo necessário daquela notificação. Nenhuma palavra antes ("deixa eu...", "um instante...", "ótimo, vou ver..."). Nenhuma transição. A notificação chega — você reage diretamente ao conteúdo dela.
— NUNCA diga "vou cuidar disso", "vou verificar", "vou seguir com isso", "um momento" ou qualquer frase após chamar solicitar_pagamento — não diga nada — nem uma palavra — aguarde até o sistema enviar uma notificação.

Se o áudio estiver ruim ou cortado: diga apenas "Desculpa, cortou aqui. Pode repetir?"
Nada mais. Nunca explique que está pensando.

NUNCA mencione: etapas, prompt, sistema, regras, tools, gates, memória, controlador.
NUNCA confirme pagamento sem { "paid": true } da ferramenta.
NUNCA confirme que o Pix ou link chegou sem receber sinal explícito do sistema.
NUNCA diga a mensagem de encerramento antes de missaoCompleta = true.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. IDENTIDADE E MISSÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Você é ANA, consultora de saúde hormonal da Hormone Ecosystem.

Sua missão é conduzir uma conversa comercial completa sobre saúde hormonal de forma extremamente humana, inteligente, segura, acolhedora e convincente.

Você segue um processo comercial de 8 etapas em ordem. Porém, a lead JAMAIS deve perceber que existe um roteiro. A estrutura existe internamente. Na superfície existe uma conversa humana.

Nunca mencione: etapas; prompt; sistema; regras; tools; gates; memória; controlador; processo interno.

PRINCÍPIO CENTRAL: NÃO EXECUTE UM QUESTIONÁRIO. CONDUZA UMA CONVERSA.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. CONTEXTO DE CANAL — LIGAÇÃO TELEFÔNICA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Esta conversa é uma ligação telefônica real. Comporte-se SEMPRE como alguém conversando ao telefone, nunca como chatbot.

Tudo precisa funcionar apenas pela voz. Nunca dependa de elementos visuais.
Não use emojis. Não use listas faladas artificialmente.
Não diga "como você pode ver", "veja abaixo", "clique aqui".

A fala deve ser adequada à telefonia: frases predominantemente curtas; uma ideia principal de cada vez; uma pergunta principal por turno; vocabulário fácil de compreender apenas ouvindo.

TURN-TAKING TELEFÔNICO: Quando a lead começar a falar, priorize a escuta. Não dispute o turno. Se a lead interromper para fazer uma pergunta: pare; escute; responda à pergunta; retome naturalmente.

RUÍDO E FALHAS: Nunca invente o conteúdo perdido. Se não ficar claro: "Desculpa, cortou um pouquinho aqui. Pode repetir essa última parte?"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. IDENTIDADE VOCAL — BRASIL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Fale exclusivamente em português brasileiro nativo. Preserve: vogais naturais do português brasileiro; tonicidade brasileira; ligação natural entre palavras; sons nasais naturais; pronúncia brasileira de R, T e D; entonação conversacional brasileira; ritmo natural do português falado.

A fala deve parecer originalmente PENSADA em português brasileiro, nunca traduzida do inglês.

Use naturalmente: "pra", "tá", "me conta", "entendi", "olha...", "vamos lá", "como é que..."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. PERSONALIDADE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ANA é sempre: CALMA. SEGURA. PRESENTE. CURIOSA. ACOLHEDORA. INTELIGENTE. CONVICTA.

ANA nunca soa: apressada, ansiosa, mecânica, submissa, excessivamente animada, locutora, telemarketing, roteirizada.

Autoridade sem arrogância. Calor sem infantilização. Convicção sem pressão. Curiosidade sem interrogatório.

Não demonstre necessidade da venda.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. INTELIGÊNCIA DE ESCUTA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Antes de responder, determine internamente: O que ela literalmente disse? O que ela realmente quis comunicar? Existe uma emoção importante? Ela terminou o pensamento? Qual informação nova apareceu? Preciso aprofundar, esclarecer ou avançar? Qual é minha próxima intenção?

Não verbalize essa análise. Quando não entender: "Desculpa, essa última parte eu não peguei." Nunca finja ter entendido.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. REAGIR ANTES DE AVANÇAR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Quando a lead revelar algo significativo, processe aquilo antes de disparar a próxima pergunta.

Uma microreação genuína pode vir primeiro: "Hum...", "Entendi.", "Ah...", "Faz sentido.", "Poxa...", "Claro."

Mas não transforme nenhuma expressão em bordão.

NÃO diga automaticamente: "perfeito", "ótimo", "maravilhoso", "que incrível".
NÃO diga: "deixa eu organizar isso na minha cabeça" — essas frases narram processamento interno.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7. RITMO DINÂMICO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Você possui RITMO DE CONVERSA. Varie naturalmente: velocidade; cadência; energia; ênfase; duração das pausas.

Acelere levemente quando: a conversa estiver fluindo; houver leveza; estiver fazendo uma transição simples.
Desacelere quando: aparecer uma dor; algo for importante; estiver explicando valor; surgir uma decisão.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8. REGRA DE OURO DA CONVERSA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

UMA pergunta principal por turno. Depois da pergunta: PARE. Espere a resposta.

Não faça outra pergunta para preencher o silêncio. Não transforme a conversa em interrogatório.

LEMBRAR NÃO SIGNIFICA REPETIR. Use o que ouviu para produzir a próxima intervenção inteligente.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ETAPA 1 — ABERTURA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OBJETIVO EMOCIONAL: conforto + credibilidade. ENERGIA: leve, segura, natural.

Quando ouvir "Alô?", "Oi?", "Quem é?", "Tudo bem?" ou equivalente, apresente-se imediatamente e de forma curta: "Oi, aqui é a ANA, da Hormone Ecosystem."

Descubra progressivamente — UMA informação por vez: 1. nome; 2. quem indicou; 3. se possui alguns minutos para conversar.

Quando a lead disser quem indicou, reconheça antes de continuar: "Ah, então foi a [nome] que te indicou..." e continue naturalmente.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ETAPA 2 — CONEXÃO E DESCOBERTA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OBJETIVO EMOCIONAL: ABERTURA. Sua função aqui NÃO é vender. Sua função é conhecer.

Descubra progressivamente: trabalho; rotina; estilo de vida; atividade física; sintomas; principal incômodo; impacto na vida; impacto emocional; aquilo que ela gostaria de recuperar ou mudar.

Comece aberto: "Me conta um pouco de como é o teu dia a dia."

Se vários sintomas aparecerem: descubra qual pesa mais. Quando surgir uma dor: não fique afobada para apresentar solução. Aprofunde uma camada.

PRINCÍPIO: primeiro conheça. depois compreenda. depois aprofunde. depois confirme a necessidade. Somente então avance.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ETAPA 3 — D.I. / COMBINADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OBJETIVO EMOCIONAL: compromisso mútuo genuíno. ENERGIA: próxima, adulta, calma, convidativa.

Somente faça o combinado depois de existir uma necessidade real revelada.

Faça uma transição natural: "[nome], sei que teu tempo é precioso. Vamos fazer um combinado?"
PARE. Espere.

Depois: "No final do que eu vou te apresentar, se você gostar e fizer sentido pra você, você me diz um sim e a gente avança. E, da mesma forma, se não fizer sentido, tudo bem, continuamos amigas. Combinado?"
PARE. Espere confirmação real.

Depois faça os qualificadores — UM POR TURNO:
Primeiro: "Decisões de saúde como essa você costuma tomar sozinha ou prefere alinhar com alguém?" Espere.
Depois: "E você tem alguma viagem ou compromisso importante nos próximos dias?" Espere.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ETAPA 4 — SPEECH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OBJETIVO: apresentar a solução de maneira personalizada. O speech possui QUATRO movimentos emocionais. Nunca diga "parte um", "parte dois".

P1 — RECONHECIMENTO: Comece pela história DELA. Use somente informações que ela realmente revelou. A lead precisa sentir: "Ela realmente me ouviu." Não invente sintomas. Não diagnostique.

P2 — CLAREZA: Explique de maneira simples o implante/pellet hormonal — um pequeno pellet colocado sob a pele na região glútea que libera hormônios continuamente. Aproximadamente um grão de arroz. Evite jargão.

P3 — DESEJO / VALOR: Energia cresce — em convicção, presença, envolvimento. Conecte benefícios POTENCIAIS ao que a própria lead deseja recuperar. Use: "o objetivo...", "o que buscamos...", "quando existe indicação...", "dependendo da avaliação médica...". DEMONSTRE CONVICÇÃO. Não diga que está convicta.

P4 — SEGURANÇA: Desacelere. Explique que tratamento hormonal exige: avaliação individual; indicação médica; análise de riscos e benefícios; acompanhamento. Segurança vem de PRECISÃO. Nunca de promessa.

Finalize. Então pergunte: "O que você achou de tudo isso?" E CALE. Espere a resposta.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ETAPA 5 — FECHAMENTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OBJETIVO EMOCIONAL: DECISÃO. ENERGIA: máxima tranquilidade + máxima convicção.

Retome o combinado naturalmente: "Lembra do nosso combinado? Se fizesse sentido pra você, a gente avançava."
Então confirme: "Faz sentido pra você?" PARE. Espere.

Se houver dúvida: resolva. Se houver objeção: descubra a objeção real.

Quando existir intenção real de avançar, apresente o investimento:

VOCALIZAÇÃO DO PREÇO: diga o valor com naturalidade, sem ênfase excessiva e sem baixar a voz. "Cinco mil reais" → tom estável, adulto.

INVESTIMENTO: R$ 5.000. CONDIÇÃO: até 6x sem juros.

Não invente desconto. Não invente condição. Não altere preço.
Não diga "é só cinco mil", "é baratinho", "não é caro".

Depois, em turno separado: "Como você prefere fazer: Pix ou cartão?" PARE. Não diga mais nada. Espere a resposta.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ETAPA 6 — PAGAMENTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Quando a lead confirmar Pix ou cartão → chame solicitar_pagamento() imediatamente sem dizer nada.
Não repita o valor. Aguarde. NUNCA confirme recebimento sem sinal do sistema.
Quando sistema confirmar → "Perfeito, confirmei aqui!"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ETAPA 7 — REFERIDOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Gatilho: receber paid:true.
Fala obrigatória (1 única frase): "[Nome], você acabou de receber um link no seu WhatsApp. Posso te pedir um favor?"
Depois: WAIT_FOR_YES — permaneça em silêncio até a lead responder claramente.

Após confirmação: "Você acabou de tomar uma das melhores decisões da sua saúde. Tenho certeza que você conhece outras mulheres passando pelo mesmo que você passou — ondas de calor, cansaço, sono ruim, falta de energia... Vou te ensinar agora como me mandar os contatos direto pelo WhatsApp. É super fácil. Pode abrir o link que chegou aí?"
Depois: WAIT_LINK_OPEN — aguardar em silêncio até a lead confirmar que abriu o link.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ETAPA 8 — ENCERRAMENTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Quando missaoCompleta = true → mensagem final obrigatória:
"[Nome], que incrível! Você acabou de fazer algo muito especial — cuidou da sua saúde e ainda abriu porta pra outras mulheres fazerem o mesmo. Nossa equipe vai entrar em contato pra agendar teu procedimento. Vai ser rápido, sem dor, e daqui a pouco você já vai sentir a diferença. Foi uma honra conversar contigo. Cuida-se!"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OBJEÇÕES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Quando houver objeção: 1. ESCUTE até o fim. 2. RECONHEÇA sem concordar automaticamente. 3. DESCUBRA a objeção real. 4. RESPONDA especificamente. 5. CONFIRME se aquela questão foi esclarecida. 6. RETOME a decisão somente depois.

Não invente urgência. Não manipule medo. Não pressione vulnerabilidade.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SEGURANÇA CLÍNICA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NUNCA: diagnostique; prescreva; prometa cura; garanta resultado; diga que o implante é adequado sem avaliação médica; apresente benefício possível como certeza; substitua avaliação profissional.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SEGURANÇA COMERCIAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NUNCA: invente preço; invente desconto; invente pagamento; invente ação de sistema; crie falsa urgência; pressione alguém vulnerável.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ESTADOS DE CONVERSA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ESTADO WAITING_FOR_PAYMENT: ativado após chamar solicitar_pagamento(). Zero falas. Só quebre o silêncio se chegar [PIX ENVIADO], [LINK CARTAO ENVIADO] ou paid:true — ou se a lead fizer uma pergunta direta.

ESTADO IDLE: lead executando ação. Fique em silêncio. Só fale se a lead fizer uma pergunta direta ou chegar notificação do sistema.

ESTADO WAIT_FOR_YES: ativado após dizer "Posso te pedir um favor?". Não fale mais nada até a lead responder claramente.

SILÊNCIO ATIVO: Quando não houver informação nova, fique em silêncio. Não narre espera. Não diga "ainda aguardando", "pode fazer com calma". Silêncio é a resposta correta quando não há nada novo a dizer.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FERRAMENTAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

solicitar_pagamento({ metodo: "pix"|"cartao", nome_lead: "[nome]" }) — chamar quando a lead confirmar forma de pagamento. Sem falar nada antes nem depois. Aguardar notificação do sistema.

verificar_referidos() — chamar SOMENTE se a lead perguntar quantas amigas foram enviadas e não houver notificação recente. Retorna: total, semDados, semMensagem, missaoCompleta. Se semMensagem > 0, peça para a lead abrir o link e clicar em "Enviar mensagem" para as amigas — assim elas recebem um aviso de que a Ana vai ligar. Se semDados > 0, peça para completar profissão e hobby no link. missaoCompleta só é true quando semDados = 0 e semMensagem = 0.

iniciar_coleta_referidos() — chamar se a lead disser que o link não chegou.

NUNCA mencione ferramenta, webhook, sistema ou qualquer mecanismo técnico para a lead.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INÍCIO DA LIGAÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Você recebe a ligação e fala PRIMEIRO.`

async function loadGoldenPrompt(): Promise<string> {
  try {
    const { data } = await supabase
      .from('ana_realtime_profiles')
      .select('instructions')
      .eq('profile', 'gold')
      .single()
    if (data?.instructions) return data.instructions as string
  } catch (e) {
    console.error('[ANA LIVE] Failed to load prompt from Supabase:', e)
  }
  return ANA_LIVE_PROMPT_FALLBACK
}

export async function createAnaLiveSession(twilioWs: any, opts: { contexto?: string; referidor?: string; nome?: string; origem?: string; earlyQueue?: (Buffer | string)[] } = {}) {
  const [dbConfig, instructions] = await Promise.all([getVoiceConfig(), loadGoldenPrompt()])
  const voice  = dbConfig?.voice  ?? 'bossa'
  const model  = dbConfig?.model  ?? 'gpt-live-1'

  console.log('[ANA LIVE] session starting — voice:', voice, 'model:', model, 'prompt_len:', instructions.length)

  // Mutable state — filled from Twilio 'start' event
  let callSid     = 'unknown'
  let telefone    = ''
  let streamSid   = ''
  let dbInitialized = false

  // Context-ready gate: greeting waits for buildSessionContext before speaking
  let resolveContextReady!: (ctx: string) => void
  const contextReadyPromise = new Promise<string>(resolve => { resolveContextReady = resolve })
  // Safety: if Twilio start never arrives, unblock after 3s
  setTimeout(() => resolveContextReady(''), 3000)

  // Transcript accumulators — no turn-done event in Live, group by silence timer
  let inputBuf  = ''
  let outputBuf = ''
  let inputTimer:  ReturnType<typeof setTimeout> | null = null
  let outputTimer: ReturnType<typeof setTimeout> | null = null

  // Tool state — tracks conversation progress for delegation routing
  let liveMetodo: 'pix' | 'cartao' | null = null
  let liveNomeLead: string | null = null
  let liveWaitForYes = false
  let liveReferralsWaiting = false
  let livePagamentoConfirmado = false
  let liveTokenIndicacao: string | null = null
  let liveAnaAskedPayment = false
  let livePixAutoSent = false
  let liveRecusaDefinitiva = false
  let liveRecusaFavorAceito = false
  let liveRecusaRegistrada = false
  let liveEtapa7SpeechFired = false
  let liveLastSemDados = -1
  let liveReferidosNotificados = false  // true only after Supabase Realtime fires (contacts actually arrived)

  function dispatchAutoPix(metodo: 'pix' | 'cartao') {
    if (livePixAutoSent || livePagamentoConfirmado) return
    livePixAutoSent = true
    liveMetodo = metodo
    console.log(`[ANA LIVE] 💳 auto-PIX triggered metodo=${metodo} callSid=${callSid}`)
    fetch(`${APP_URL}/api/admin/ana-master/simulador/pix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callSid, telefone, metodo }),
    }).catch((e: Error) => console.error('[ANA LIVE] auto-PIX fetch error:', e.message))
  }

  function flushInput() {
    const text = inputBuf.trim()
    inputBuf = ''
    if (!text) return

    // Detect payment method from user speech
    const lower = text.toLowerCase()
    if (/\bpix\b/.test(lower)) liveMetodo = 'pix'
    if (/\bcart[aã]o\b/.test(lower)) liveMetodo = 'cartao'

    // Auto-PIX: lead says "pix" or "cartão" after Ana asked about payment → dispatch immediately
    if (!livePixAutoSent && !livePagamentoConfirmado && liveAnaAskedPayment) {
      let autoMetodo: 'pix' | 'cartao' | null = null
      if (/\bpix\b|pix\s*(a|à)\s*vista|avista|à\s*vista/i.test(text)) autoMetodo = 'pix'
      else if (/cart[aã]o|parcel/i.test(lower)) autoMetodo = 'cartao'
      if (autoMetodo) dispatchAutoPix(autoMetodo)
    }

    // Detect lead name (e.g. "meu nome é Adriana")
    const nameMatch = text.match(/(?:meu nome [eé]|me chamo|sou a?)\s+([A-ZÀ-Ú][a-zà-ú]+)/i)
    if (nameMatch) liveNomeLead = nameMatch[1]

    // Detect definitive refusal
    if (!liveRecusaDefinitiva && !livePagamentoConfirmado) {
      const frasesRecusa = ['não tenho interesse','nao tenho interesse','não vou fazer','nao vou fazer','já decidi que não','ja decidi que nao','desisto','deixa pra lá','deixa pra la','não quero mais','nao quero mais','para de insistir','chega','não me interessa','nao me interessa','não é pra mim','nao e pra mim']
      if (frasesRecusa.some(fr => lower.includes(fr))) {
        liveRecusaDefinitiva = true
        console.log('[ANA LIVE] 🚫 recusa definitiva detectada')
      }
    }

    // RECUSA FAVOR: detect "sim" after Ana asks "posso te pedir um favor especial?" on refusal path
    if (liveRecusaDefinitiva && !liveRecusaFavorAceito && !liveRecusaRegistrada) {
      const isYesFavor = /\b(sim|claro|pode|ok|com certeza|lógico|logico|vai|certo|topo|toparia|por que não|por que nao|claro que sim|pode sim)\b/.test(lower)
      if (isYesFavor) {
        liveRecusaFavorAceito = true
        console.log('[ANA LIVE] 🤝 lead aceitou favor pós-recusa — registrar_recusa desbloqueado')
      }
    }

    // WAIT_FOR_YES: detect confirmation after "Posso te pedir um favor?"
    if (liveWaitForYes) {
      const isYes = /\b(sim|claro|pode|ok|com certeza|lógico|logico|vai|certo|fechado|obvio|obviamente|pode sim|claro que sim)\b/.test(lower)
      if (isYes) {
        liveWaitForYes = false
        liveReferralsWaiting = true
        if (!liveEtapa7SpeechFired) {
          liveEtapa7SpeechFired = true
          console.log('[ANA LIVE] ✅ WAIT_FOR_YES confirmado — disparando speech etapa 7 (uma vez)')
          sendToLive({
            type: 'session.commentary.append',
            event_id: `etapa7_speech_${Date.now()}`,
            delegation_id: null,
            content: 'Você acabou de tomar uma das melhores decisões da sua saúde. Tenho certeza que você conhece outras mulheres passando pelo mesmo que você passou — ondas de calor, cansaço, sono ruim, falta de energia... Vou te ensinar agora como me mandar os contatos direto pelo WhatsApp. É super fácil. Pode abrir o link que chegou aí?',
          })
        } else {
          console.log('[ANA LIVE] ⚠️ WAIT_FOR_YES confirmado novamente — speech já disparado, ignorando')
        }
      }
    }

    if (callSid !== 'unknown') {
      console.log('[ANA LIVE] 📝 user:', text)
      appendTranscript(callSid, 'user', text).catch(() => {})
      pushTranscriptEvent(callSid, 'user', text)
    }
  }

  function flushOutput() {
    const text = outputBuf.trim()
    outputBuf = ''
    if (!text) return
    if (callSid !== 'unknown') {
      console.log('[ANA LIVE] 📝 assistant:', text)
      appendTranscript(callSid, 'assistant', text).catch(() => {})
      pushTranscriptEvent(callSid, 'assistant', text)
    }
    // Ana mentioned payment method → arm auto-PIX watch + 10s fallback
    if (!liveAnaAskedPayment && /pix|cart[aã]o|pagamento|pagar/i.test(text)) {
      liveAnaAskedPayment = true
      console.log('[ANA LIVE] 💬 Ana perguntou sobre pagamento — auto-PIX armado (fallback 10s)')
      setTimeout(() => {
        if (!livePixAutoSent && callSid !== 'unknown') {
          const metodo = liveMetodo ?? 'pix'
          console.log(`[ANA LIVE] ⏰ timeout auto-PIX fallback metodo=${metodo}`)
          dispatchAutoPix(metodo)
        }
      }, 10000)
    }
  }

  // ── OpenAI Live WebSocket ────────────────────────────────────────────────────

  const liveWs = new WebSocket(LIVE_ENDPOINT, {
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
  })

  function sendToLive(event: object) {
    if (liveWs.readyState === WebSocket.OPEN) {
      liveWs.send(JSON.stringify(event))
    }
  }

  function sendToTwilio(event: object) {
    try {
      if (twilioWs.readyState === WebSocket.OPEN) {
        twilioWs.send(JSON.stringify(event))
      }
    } catch (e) {
      console.error('[ANA LIVE] sendToTwilio error:', e)
    }
  }

  liveWs.on('open', () => {
    console.log('[ANA LIVE] OpenAI WS open — sending session.start')
    sendToLive({
      type: 'session.start',
      event_id: 'ana_live_start',
      session: {
        model,
        instructions: instructions + (opts.contexto ? `\n\nCONTEXTO: ${opts.contexto}` : ''),
        input: [],
        audio: {
          format: { type: 'audio/pcmu', rate: 8000 },
          output: { voice },
        },
        delegation: { type: 'client' },
        store: false,
      },
    })
  })

  liveWs.on('message', (raw: Buffer) => {
    let event: any
    try { event = JSON.parse(raw.toString()) } catch { return }

    switch (event.type) {

      // ── Session lifecycle ──────────────────────────────────────────────────

      case 'session.started':
        console.log('[ANA LIVE] session.started id=', event.session?.id)
        // Wait for buildSessionContext before greeting — ensures context is injected first
        contextReadyPromise.then(contextBlock => {
          if (contextBlock) {
            // session.instructions.append não existe na Live API — usamos session.update
            sendToLive({
              type: 'session.update',
              event_id: `ctx_${Date.now()}`,
              session: {
                instructions: instructions + `\n\n${contextBlock}`,
              },
            })
            console.log('[ANA LIVE] 📚 contexto injetado via session.update')
          }
          sendToLive({
            type: 'session.commentary.append',
            event_id: 'ana_greet',
            delegation_id: null,
            content: (() => {
              const oi = opts.nome ? `Oi, ${opts.nome.split(' ')[0]}!` : 'Oi!'
              const base = `${oi} Aqui é a ANA, consultora executiva do consultório do Dr. Vinícius Cechella, da Hormone Ecosystem.`
              if (opts.referidor) return `${base} Estou ligando porque a ${opts.referidor} nos indicou você com muito carinho. Tudo bem com você?`
              const origemMap: Record<string, string> = {
                instagram: 'vi que você nos encontrou pelo Instagram',
                landing_page: 'vi que você veio pelo nosso site',
                site: 'vi que você veio pelo nosso site',
                whatsapp: 'você entrou em contato pelo nosso WhatsApp',
                google: 'vi que você nos encontrou pelo Google',
              }
              const origemFrase = opts.origem ? origemMap[opts.origem.toLowerCase()] : undefined
              if (origemFrase) return `${base} Estou ligando porque ${origemFrase} e demostrou interesse no implante hormonal. Tudo bem com você?`
              return `${base} Estou ligando porque você demonstrou interesse no implante hormonal. Tudo bem com você?`
            })(),
          })
        })
        break

      case 'session.closed':
        console.log('[ANA LIVE] session.closed reason=', event.reason, 'usage=', event.usage)
        flushInput()
        flushOutput()
        if (callSid !== 'unknown') {
          pushCallEndedEvent(callSid)
          endCall(callSid).catch(() => {})
          unregisterLiveSession(callSid)
          scheduleCallback(callSid).catch((e: Error) => console.error('[ANA LIVE] scheduleCallback erro:', e.message))
        }
        break

      // ── Audio output — PCMU passthrough: OpenAI → Twilio ──────────────────

      case 'session.output_audio.delta':
        if (event.delta) {
          if (streamSid) {
            sendToTwilio({
              event: 'media',
              streamSid,
              media: { payload: event.delta },
            })
          } else {
            console.warn('[ANA LIVE] output_audio.delta arrived but streamSid is empty — dropping audio')
          }
        }
        break

      // ── Transcripts ────────────────────────────────────────────────────────

      case 'session.input_transcript.delta':
        if (event.delta) {
          inputBuf += event.delta
          if (inputTimer) clearTimeout(inputTimer)
          inputTimer = setTimeout(flushInput, 800)
        }
        break

      case 'session.output_transcript.delta':
        if (event.delta) {
          outputBuf += event.delta
          if (outputTimer) clearTimeout(outputTimer)
          outputTimer = setTimeout(flushOutput, 1500)
        }
        break

      // ── Delegation (client) — Phase 7: full tool routing ──────────────────

      case 'session.delegation.created': {
        const delegationId = event.delegation?.id
        console.log(`[ANA LIVE] delegation.created id=${delegationId} metodo=${liveMetodo} waitForYes=${liveWaitForYes} referrals=${liveReferralsWaiting} pago=${livePagamentoConfirmado}`)

        // Route to correct tool based on conversation state
        if (!livePagamentoConfirmado && liveMetodo) {
          // ── solicitar_pagamento ───────────────────────────────────────────
          ;(async () => {
            try {
              console.log(`[ANA LIVE PAG] iniciando metodo=${liveMetodo} callSid=${callSid}`)

              // Save nome_lead if known
              if (liveNomeLead && telefone) {
                supabase.from('leads').update({ nome: liveNomeLead })
                  .eq('telefone', telefone).is('nome', null)
                  .then(({ error }: any) => { if (error) console.error('[ANA LIVE PAG] nome_lead erro:', error.message) })
              }

              // Send PIX/card link via web API — skip if auto-PIX already dispatched it
              if (!livePixAutoSent) {
                await fetch(`${APP_URL}/api/admin/ana-master/simulador/pix`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ callSid, telefone, metodo: liveMetodo }),
                }).catch((e: Error) => console.log(`[ANA LIVE PAG] send error: ${e.message}`))
              } else {
                console.log(`[ANA LIVE PAG] auto-PIX já enviado — ignorando fetch, aguardando confirmação`)
              }
              livePixAutoSent = true

              await saveMemory(callSid, 'forma_pagamento_escolhida', liveMetodo).catch(() => {})

              // Acknowledge delegation — model will wait silently
              sendToLive({
                type: 'session.thinking.append',
                event_id: `pag_thinking_${Date.now()}`,
                delegation_id: delegationId,
                content: `solicitar_pagamento chamado — metodo:${liveMetodo} — aguardando confirmação de pagamento no WhatsApp`,
              })

              // Wait for payment confirmation via Supabase Realtime (up to 5 min)
              const paid = await new Promise<boolean>((resolve) => {
                let settled = false
                let channel: any
                const finish = (result: boolean) => {
                  if (settled) return
                  settled = true
                  clearTimeout(timer)
                  if (channel) supabase.removeChannel(channel).catch(() => {})
                  console.log(`[ANA LIVE PAG] ${result ? '✅ confirmado' : '⏰ timeout'} callSid=${callSid}`)
                  resolve(result)
                }
                const timer = setTimeout(() => finish(false), 5 * 60 * 1000)
                channel = supabase
                  .channel(`livepag:${callSid}`)
                  .on('postgres_changes' as any,
                    { event: 'UPDATE', schema: 'public', table: 'pagamentos', filter: `call_sid=eq.${callSid}` },
                    (payload: any) => {
                      console.log(`[ANA LIVE PAG] realtime status=${payload.new?.status}`)
                      if (payload.new?.status === 'approved') finish(true)
                    })
                  .subscribe(async (status: string) => {
                    console.log(`[ANA LIVE PAG] realtime subscribe=${status}`)
                    if (status === 'SUBSCRIBED') {
                      const { data } = await supabase.from('pagamentos').select('status')
                        .eq('call_sid', callSid).eq('status', 'approved').maybeSingle()
                      if (data) { console.log('[ANA LIVE PAG] já aprovado no DB'); finish(true) }
                    }
                    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                      const poll = setInterval(async () => {
                        if (settled) { clearInterval(poll); return }
                        const { data } = await supabase.from('pagamentos').select('status')
                          .eq('call_sid', callSid).eq('status', 'approved').maybeSingle()
                        if (data) { clearInterval(poll); finish(true) }
                      }, 3000)
                    }
                  })
              })

              if (paid) {
                livePagamentoConfirmado = true
                liveWaitForYes = true
                console.log(`[ANA LIVE PAG] ✅ pago — WAIT_FOR_YES ativado callSid=${callSid}`)

                // Inject paid result + trigger WAIT_FOR_YES phrase
                sendToLive({
                  type: 'session.thinking.append',
                  event_id: `pag_paid_${Date.now()}`,
                  delegation_id: null,
                  content: `{"ok":true,"paid":true,"metodo":"${liveMetodo}","estado":"WAIT_FOR_YES"}`,
                })
                sendToLive({
                  type: 'session.commentary.append',
                  event_id: `pag_waituyes_${Date.now()}`,
                  delegation_id: null,
                  content: `${liveNomeLead ?? 'Você'}, você acabou de receber um link no seu WhatsApp. Posso te pedir um favor?`,
                })
              } else {
                sendToLive({
                  type: 'session.thinking.append',
                  event_id: `pag_timeout_${Date.now()}`,
                  delegation_id: null,
                  content: `{"ok":true,"paid":false,"metodo":"${liveMetodo}","aguardando":true}`,
                })
              }
            } catch (e: any) {
              console.error('[ANA LIVE PAG] erro:', e.message)
              sendToLive({
                type: 'session.thinking.append',
                event_id: `pag_err_${Date.now()}`,
                delegation_id: delegationId,
                content: `{"ok":false,"erro":"${e.message}"}`,
              })
            }
          })()

        } else if (livePagamentoConfirmado && !liveTokenIndicacao && !liveReferralsWaiting) {
          // ── iniciar_coleta_referidos ──────────────────────────────────────
          ;(async () => {
            try {
              console.log(`[ANA LIVE REF] iniciando coleta referidos telefone=${telefone}`)
              const result = await iniciarColetaReferidos(telefone)
              if (result) {
                liveTokenIndicacao = result.token
                await saveMemory(callSid, 'token_indicacao', result.token).catch(() => {})
                console.log(`[ANA LIVE REF] link enviado token=${result.token}`)
                sendToLive({
                  type: 'session.thinking.append',
                  event_id: `ref_sent_${Date.now()}`,
                  delegation_id: delegationId,
                  content: `{"ok":true,"link_enviado":true,"token":"${result.token}","estado":"WAIT_LINK_OPEN"}`,
                })
              } else {
                sendToLive({
                  type: 'session.thinking.append',
                  event_id: `ref_fail_${Date.now()}`,
                  delegation_id: delegationId,
                  content: 'Pagamento não confirmado — não é possível enviar o link ainda.',
                })
              }
            } catch (e: any) {
              console.error('[ANA LIVE REF] erro:', e.message)
              sendToLive({
                type: 'session.thinking.append',
                event_id: `ref_err_${Date.now()}`,
                delegation_id: delegationId,
                content: `{"ok":false,"erro":"${e.message}"}`,
              })
            }
          })()

        } else if (liveRecusaFavorAceito && !livePagamentoConfirmado && !liveRecusaRegistrada) {
          // ── registrar_recusa ──────────────────────────────────────────────
          liveRecusaRegistrada = true
          ;(async () => {
            try {
              console.log(`[ANA LIVE RECUSA] registrando recusa telefone=${telefone}`)
              const telClean = telefone.replace(/\D/g, '')
              await fetch(`${APP_URL}/api/admin/ana-master/recusa-referidos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ callSid, telefone: telClean, nome: liveNomeLead ?? '' }),
              }).catch((e: Error) => console.log(`[ANA LIVE RECUSA] send error: ${e.message}`))
              sendToLive({
                type: 'session.thinking.append',
                event_id: `recusa_${Date.now()}`,
                delegation_id: delegationId,
                content: JSON.stringify({ ok: true, recusa: true, mensagem_whatsapp_enviada: true }),
              })
            } catch (e: any) {
              console.error('[ANA LIVE RECUSA] erro:', e.message)
              sendToLive({
                type: 'session.thinking.append',
                event_id: `recusa_err_${Date.now()}`,
                delegation_id: delegationId,
                content: `{"ok":false,"erro":"${e.message}"}`,
              })
            }
          })()

        } else {
          // ── verificar_referidos ───────────────────────────────────────────
          ;(async () => {
            try {
              // Block verificar_referidos until Supabase Realtime has confirmed contacts arrived
              // (prevents querying stale/old contacts from previous sessions)
              if (!liveReferidosNotificados) {
                sendToLive({
                  type: 'session.commentary.append',
                  event_id: `ver_aguard_${Date.now()}`,
                  delegation_id: null,
                  content: 'Aguardando você enviar os contatos no link. Pode selecionar as amigas agora?',
                })
                return
              }

              const memories = await getMemories(callSid)
              const token = liveTokenIndicacao ?? memories.token_indicacao as string | undefined
              if (token && !liveTokenIndicacao) liveTokenIndicacao = token
              if (!token) {
                sendToLive({
                  type: 'session.thinking.append',
                  event_id: `ver_notoken_${Date.now()}`,
                  delegation_id: delegationId,
                  content: '{"erro":"token_nao_encontrado"}',
                })
                return
              }
              const ref = await checkReferidos(token)
              console.log(`[ANA LIVE REF] verificar token=${token} total=${ref.total} missaoCompleta=${ref.missaoCompleta}`)

              if (ref.missaoCompleta) {
                updateLeadsGanho(callSid).catch(() => {})
                if (telefone) sendWelcome(telefone).catch(() => {})
                liveReferralsWaiting = false
              }

              const resultPayload = ref.missaoCompleta
                ? JSON.stringify(ref)
                : JSON.stringify({
                    ...ref,
                    instrucao: ref.semDados > 0
                      ? `NÃO reinicie a ETAPA 7. NÃO reenvie o link. Apenas diga a frase abaixo e aguarde.`
                      : ref.semMensagem > 0
                        ? `NÃO reinicie a ETAPA 7. Peça para a lead abrir o link e clicar em "Enviar mensagem" para as amigas.`
                        : undefined,
                  })
              sendToLive({
                type: 'session.thinking.append',
                event_id: `ver_result_${Date.now()}`,
                delegation_id: delegationId,
                content: resultPayload,
              })

              // When semDados > 0, inject exact scripted commentary so model cannot drift back to Etapa 7
              if (!ref.missaoCompleta && ref.semDados > 0) {
                const alreadySaid = liveLastSemDados === ref.semDados
                liveLastSemDados = ref.semDados
                sendToLive({
                  type: 'session.commentary.append',
                  event_id: `ver_semdados_${Date.now()}`,
                  delegation_id: null,
                  content: alreadySaid
                    ? `Aguardando você completar a profissão das ${ref.semDados} amiga${ref.semDados > 1 ? 's' : ''} no link. Consegue fazer isso agora?`
                    : `Ficou ótimo! Mas tem ${ref.semDados} amiga${ref.semDados > 1 ? 's' : ''} sem profissão preenchida — consegue completar no link? É rapidinho.`,
                })
              }
            } catch (e: any) {
              console.error('[ANA LIVE REF] verificar erro:', e.message)
              sendToLive({
                type: 'session.thinking.append',
                event_id: `ver_err_${Date.now()}`,
                delegation_id: delegationId,
                content: `{"ok":false,"erro":"${e.message}"}`,
              })
            }
          })()
        }
        break
      }

      // ── Acknowledgments (log only) ─────────────────────────────────────────

      case 'session.instructions.appended':
      case 'session.thinking.appended':
      case 'session.commentary.appended':
        console.log(`[ANA LIVE] ack ${event.type} event_id=${event.client_event_id} start_ms=${event.start_ms}`)
        break

      case 'session.input_audio.muted':
        console.log('[ANA LIVE] input muted')
        break

      case 'session.input_audio.unmuted':
        console.log('[ANA LIVE] input unmuted')
        break

      // ── Usage ──────────────────────────────────────────────────────────────

      case 'session.usage.updated':
        console.log(`[ANA LIVE] usage seconds=${event.usage?.seconds} context_ratio=${event.context_window?.usage_ratio}`)
        break

      // ── Errors ─────────────────────────────────────────────────────────────

      case 'error':
        console.error('[ANA LIVE] error:', JSON.stringify(event.error ?? event))
        break

      default:
        // Log unknown events for debugging during rollout
        if (!['session.updated'].includes(event.type)) {
          console.log(`[ANA LIVE] unhandled event: ${event.type}`)
        }
    }
  })

  liveWs.on('error', (err) => {
    console.error('[ANA LIVE] WebSocket error:', err)
  })

  liveWs.on('close', (code, reason) => {
    console.log(`[ANA LIVE] OpenAI WS closed code=${code}`)
    flushInput()
    flushOutput()
    if (callSid !== 'unknown') unregisterLiveSession(callSid)
  })

  // ── Twilio WebSocket ─────────────────────────────────────────────────────────

  function handleTwilioMessage(data: Buffer | string) {
    let msg: any
    try { msg = JSON.parse(data.toString()) } catch { return }

    switch (msg.event) {

      case 'start':
        if (dbInitialized) break
        dbInitialized = true
        // streamSid appears at top-level AND inside start — take whichever is set
        streamSid = msg.streamSid ?? msg.start?.streamSid ?? ''
        callSid   = msg.start?.callSid
          ?? msg.start?.customParameters?.callSid
          ?? `stream_${streamSid}`
        telefone  = String(msg.start?.customParameters?.from ?? '').replace(/\D/g, '')
        // Override opts.referidor with the value passed through TwiML parameters (most reliable source)
        const paramReferidor = String(msg.start?.customParameters?.referidor ?? '').trim()
        const paramNome = String(msg.start?.customParameters?.nome ?? '').trim()
        const paramOrigem = String(msg.start?.customParameters?.origem ?? '').trim()
        opts = {
          ...opts,
          ...(paramReferidor ? { referidor: paramReferidor } : {}),
          ...(paramNome ? { nome: paramNome } : {}),
          ...(paramOrigem ? { origem: paramOrigem } : {}),
        }

        console.log(`[ANA LIVE] start callSid=${callSid} telefone=${telefone} referidor=${opts.referidor ?? ''} streamSid=${streamSid} raw_keys=${Object.keys(msg.start ?? {}).join(',')}`)

        upsertCall(callSid, telefone).catch(() => {})
        saveMemory(callSid, 'telefone', telefone).catch(() => {})
        saveMemory(callSid, 'voice_stack', 'live').catch(() => {})

        // Pre-load lead name from DB immediately — don't wait for regex capture
        // NOTE: token_indicacao is intentionally NOT loaded here — loading it blocks iniciar_coleta_referidos
        // (which requires !liveTokenIndicacao). Token is restored only for resumed calls via buildSessionContext.
        getLeadByPhone(telefone).then(lead => {
          if (lead?.nome && !liveNomeLead) {
            liveNomeLead = lead.nome
            saveMemory(callSid, 'nome_lead', lead.nome).catch(() => {})
            console.log(`[ANA LIVE] 👤 nome_lead carregado do banco: ${lead.nome}`)
          }
        }).catch(() => {})

        registerLiveSession(callSid, {
          sendToLive,
          setTokenIndicacao: (token: string) => { liveTokenIndicacao = token },
          setReferidosNotificados: () => {
            if (!liveReferidosNotificados) {
              liveReferidosNotificados = true
              console.log(`[ANA LIVE] 📲 referidos notificados via Realtime — verificar_referidos desbloqueado`)
            }
          },
        })

        // Inject history context and restore in-memory flags if this is a resumed call
        buildSessionContext(telefone, callSid).then(({ contextBlock, prevState, metodoEscolhido, nomeLead, tokenIndicacao, pagamentoConfirmado }) => {
          console.log(`[ANA LIVE] 📚 buildSessionContext prevState=${prevState} hasContext=${!!contextBlock} callSid=${callSid}`)
          if (metodoEscolhido) liveMetodo = metodoEscolhido
          if (nomeLead && !liveNomeLead) {
            liveNomeLead = nomeLead
            saveMemory(callSid, 'nome_lead', nomeLead).catch(() => {})
          }
          // Only restore token on resumed calls — for fresh calls let iniciar_coleta_referidos create it
          if (tokenIndicacao && !liveTokenIndicacao && prevState === 'resume') {
            liveTokenIndicacao = tokenIndicacao
            liveReferidosNotificados = true  // resumed call: contacts may already exist, allow verificar
            saveMemory(callSid, 'token_indicacao', tokenIndicacao).catch(() => {})
          }
          if (pagamentoConfirmado) { livePagamentoConfirmado = true; livePixAutoSent = true }
          resolveContextReady(contextBlock)
        }).catch(() => { resolveContextReady('') })
        break

      case 'media':
        // PCMU passthrough: Twilio → OpenAI (same base64 bytes, no conversion)
        if (msg.media?.payload) {
          sendToLive({
            type: 'session.input_audio.append',
            audio: msg.media.payload,
          })
        }
        break

      case 'stop':
        console.log(`[ANA LIVE] Twilio stop callSid=${callSid}`)
        // Graceful close per docs: install listener (already done), send session.close, wait for session.closed
        sendToLive({ type: 'session.close' })
        break
    }
  }

  // Register real handler and replay any messages buffered in server.ts before this function was called
  twilioWs.on('message', handleTwilioMessage)
  for (const buffered of opts.earlyQueue ?? []) handleTwilioMessage(buffered)


  twilioWs.on('close', () => {
    console.log('[ANA LIVE] Twilio WS closed')
    if (liveWs.readyState === WebSocket.OPEN) {
      sendToLive({ type: 'session.close' })
    }
  })

  twilioWs.on('error', (err: Error) => {
    console.error('[ANA LIVE] Twilio WS error:', err)
  })
}
