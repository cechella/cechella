// ── Speech Progress Control ───────────────────────────────────────────────────
// Controla a entrega sequencial das 4 partes do Speech.
// Backend decide qual parte está liberada — ANA nunca vê partes futuras.

export type SpeechPart = 1 | 2 | 3 | 4

export type SpeechState =
  | 'DELIVERING_PART'        // ANA está entregando a parte atual
  | 'WAITING_LEAD'           // parte concluída, aguardando turno real da lead
  | 'WAITING_FINAL_RESPONSE' // pergunta final feita, aguardando resposta da lead
  | 'COMPLETE'               // tudo concluído, GATE_SPEECH liberado

export type LeadTurnDisposition =
  | 'BACKCHANNEL'            // "aham", "entendi", "certo", "pode continuar"
  | 'CONTINUE'               // confirmação explícita de continuidade
  | 'QUESTION'               // pergunta sobre o conteúdo
  | 'CONFUSION'              // "não entendi", "repete"
  | 'INTERRUPTION'           // lead falou enquanto ANA ainda entregava
  | 'OBJECTION'              // resistência com tom negativo
  | 'FINAL_INTEREST_RESPONSE'// resposta à pergunta final do Speech
  | 'UNKNOWN'                // vazio, ruído, baixa qualidade

export interface SpeechProgress {
  parte_atual: SpeechPart | 'final_question' | 'complete'
  partes_entregues: SpeechPart[]
  parte_em_execucao?: SpeechPart
  parte_interrompida: boolean
  state: SpeechState
  waiting_for_lead: boolean
  last_lead_disposition?: LeadTurnDisposition
  pergunta_final_feita: boolean
  resposta_final_recebida: boolean
}

export function initialSpeechProgress(): SpeechProgress {
  return {
    parte_atual: 1,
    partes_entregues: [],
    parte_em_execucao: 1,   // Part 1 is active from the moment speech stage begins
    parte_interrompida: false,
    state: 'DELIVERING_PART',
    waiting_for_lead: false,
    last_lead_disposition: undefined,
    pergunta_final_feita: false,
    resposta_final_recebida: false,
  }
}

export function isComplete(sp: SpeechProgress): boolean {
  return sp.state === 'COMPLETE'
}

// ── Instrução injetada por parte ──────────────────────────────────────────────

const PART_INSTRUCTIONS: Record<string, string> = {
  '1': `SPEECH — PARTE 1: PERSONALIZAÇÃO + PONTE. Só isso.

Objetivo: 1-2 frases que mostram que você lembra da lead e criam a ponte para o que vem a seguir.

Use as memórias: dor_principal / impacto / rotina / sintomas.

Estrutura: "[Nome], você me contou que [sintoma/dor real]. Quando os hormônios estão em desequilíbrio, é comum aparecerem sintomas como os que você descreveu."

FIM. Não explique o implante. Não fale de benefícios. Não diga o que vem a seguir. Não anuncie nada.

Após as 1-2 frases: chame registrar_parte_speech(parte=1) silenciosamente e encerre o turno.
NÃO diga "vou registrar", "já volto", "vou continuar", "agora vou explicar". Simplesmente pare.`,

  '2': `SPEECH — PARTE 2: O QUE É O IMPLANTE. Só isso, 2 frases.

"O implante hormonal é um pequeno pellet, aproximadamente do tamanho de um grão de arroz, que é inserido sob a pele. Ele libera os hormônios de forma contínua, de acordo com um protocolo individual prescrito pelo médico."

FIM. Não acrescente nada. Não diga "garantindo equilíbrio", não faça perguntas.

Após as 2 frases: chame registrar_parte_speech(parte=2) silenciosamente e encerre o turno.
ZERO fala adicional. Não diga "faz sentido?", "entendeu?", "alguma dúvida?", "posso continuar?". A lead fala quando quiser.`,

  '3': `SPEECH — PARTE 3: BENEFÍCIOS CONECTADOS AOS SINTOMAS REAIS. Só isso.

Use SOMENTE os sintomas que estão na memória (sintomas / dor_principal / impacto).
NÃO introduza benefícios que a lead não relatou — se ela não mencionou energia, não fale de energia.

Linguagem responsável:
✓ "o objetivo é ajudar em sintomas como..." / "pode contribuir para..." / "a resposta é individual e acompanhada pelo médico"
✗ "Você terá..." / "vai acontecer..." / "garante..." / "cura..."

FIM após os benefícios conectados. Não diga mais nada.

Após o conteúdo: chame registrar_parte_speech(parte=3) silenciosamente e encerre o turno.
SILÊNCIO ABSOLUTO. PROIBIDO: "Como você se sente?", "faz sentido?", "alguma dúvida?", "o que acha?", "posso continuar?", "está entendendo?". A lead reage quando quiser.`,

  '4': `SPEECH — PARTE 4: DURAÇÃO. Só isso, uma frase.

"Esse protocolo pode ter duração de até 6 meses, conforme a indicação individual feita pelo médico."

Após essa frase: chame registrar_parte_speech(parte=4) silenciosamente.
NÃO faça a pergunta final agora. NÃO diga mais nada. O sistema injeta a instrução seguinte automaticamente.`,

  'final_question': `SPEECH — PERGUNTA FINAL GOLD. Apenas isso.

Faça SOMENTE esta pergunta, exatamente uma vez, adaptando o nome:
"[Nome], o que mais te chamou atenção do que eu acabei de te apresentar?"

Após fazer a pergunta: chame registrar_parte_speech(parte='pergunta_feita') silenciosamente.
SILÊNCIO ABSOLUTO após o registro. Aguarde a resposta real da lead. NÃO fale preço. NÃO antecipe fechamento.`,

  'awaiting_final': `SPEECH — AGUARDANDO RESPOSTA FINAL DA LEAD.

A lead acabou de responder à pergunta final. Processe a resposta:

Se interesse positivo (ficou empolgada, perguntou próximos passos, quer avançar):
→ save_memory(key="interesse_protocolo", value="[resposta real]")
→ chame registrar_parte_speech(parte="resposta_recebida")
→ GATE_SPEECH estará liberado

Se dúvida técnica ou clínica:
→ responda naturalmente dentro do conteúdo aprovado
→ NÃO avance até a lead demonstrar interesse claro

Se objeção:
→ siga o DNA: OUVIR → ISOLAR → CONFIRMAR → OFERECER
→ NÃO passe o gate

Se ambígua:
→ aprofunde naturalmente antes de avançar`,

  'complete': `SPEECH CONCLUÍDO. Pode chamar gateValidator(gate_id="GATE_SPEECH") agora com todas as evidências.`,
}

export function getPartInstruction(parte: string): string {
  return PART_INSTRUCTIONS[parte] ?? ''
}

// ── Classificação semântica da resposta da lead ───────────────────────────────

export function classifyLeadTurn(transcript: string, state: SpeechState): LeadTurnDisposition {
  if (!transcript || transcript.trim().length < 2) return 'UNKNOWN'

  const t = transcript.toLowerCase().trim()

  // Final response context
  if (state === 'WAITING_FINAL_RESPONSE') return 'FINAL_INTEREST_RESPONSE'

  // Interruption markers (very short, mid-sentence indicators)
  if (t.length < 5 && ['hã', 'oi', 'ã', 'ei'].some(w => t.includes(w))) return 'INTERRUPTION'

  // Confusion
  if (['não entendi', 'repete', 'pode repetir', 'o que', 'como assim', 'não compreendi'].some(p => t.includes(p))) return 'CONFUSION'

  // Backchannels / continue
  if (['aham', 'entendi', 'certo', 'sim', 'pode continuar', 'tá', 'ok', 'claro', 'vai', 'uhum', 'hm', 'tô entendendo'].some(p => t.includes(p))) return 'BACKCHANNEL'

  // Questions
  if (t.includes('?') || ['como', 'onde', 'quanto', 'quando', 'é seguro', 'dói', 'qual', 'por que', 'funciona'].some(p => t.startsWith(p) || t.includes(p + ' '))) return 'QUESTION'

  // Objections
  if (['não quero', 'não tenho interesse', 'não posso', 'caro', 'não vou', 'deixa pra depois', 'não agora'].some(p => t.includes(p))) return 'OBJECTION'

  // Default: treat as continue if it's substantive
  if (t.length > 10) return 'CONTINUE'

  return 'UNKNOWN'
}
