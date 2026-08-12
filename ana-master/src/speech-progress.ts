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
    parte_em_execucao: undefined,
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
  '1': `SPEECH — ENTREGUE APENAS A PARTE 1 AGORA.

Demonstre que lembra da pessoa antes de qualquer explicação.
Conecte: dor_principal → impacto → contexto de vida dela.

Use as memórias: dor_principal / impacto / rotina / atividade_fisica / sintomas.

Exemplo comportamental (NÃO fixo — adapte à lead real):
"[Nome], você me contou que sempre foi muito ativa e que hoje essa falta de energia está até atrapalhando seus treinos. Deixa eu te explicar como o equilíbrio hormonal pode entrar nessa história."

Evite diagnóstico individual categórico:
✗ "A causa raiz dos seus sintomas é..."
✓ "Quando os hormônios estão em desequilíbrio, é comum aparecerem sintomas como..."

Após concluir a Parte 1: chame registrar_parte_speech(parte=1).
NÃO continue para a Parte 2 sem chamar o tool e aguardar novo turno da lead.`,

  '2': `SPEECH — ENTREGUE APENAS A PARTE 2 AGORA.

Explique o implante de forma simples e visual. Máximo 2 frases curtas.
- pequeno pellet, aproximadamente do tamanho de um grão de arroz
- inserido sob a pele
- liberação contínua dos hormônios
- protocolo individual prescrito pelo médico

Após concluir a Parte 2: chame registrar_parte_speech(parte=2).
NÃO continue para a Parte 3 sem chamar o tool e aguardar novo turno da lead.`,

  '3': `SPEECH — ENTREGUE APENAS A PARTE 3 AGORA.

Relacione os benefícios aos sintomas REAIS que a lead relatou.
Use as memórias: sintomas / dor_principal / impacto.

Linguagem clinicamente responsável:
✓ "o objetivo é..." / "pode ajudar..." / "há pacientes que relatam..." / "a resposta individual é avaliada pelo médico"
✗ "Você terá..." / "Vai acontecer..." / "A causa é..."

Após concluir a Parte 3: chame registrar_parte_speech(parte=3).
NÃO continue para a Parte 4 sem chamar o tool e aguardar novo turno da lead.`,

  '4': `SPEECH — ENTREGUE APENAS A PARTE 4 AGORA.

Explique a duração: esse protocolo pode ter duração de até 6 meses, conforme a indicação individual.

Depois faça a pergunta final obrigatória:
"[Nome], o que mais te chamou atenção do que eu acabei de te apresentar?"

Após fazer a pergunta: chame registrar_parte_speech(parte=4).
PARE. Aguarde a resposta real da lead. NÃO fale preço. NÃO antecipe fechamento.`,

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
