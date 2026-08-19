/**
 * AnaRuntimeProfile — versioned, immutable profile shared between simulator and Twilio.
 * Pin the exact model ID here. Changing this file = new profile version.
 * Record profile_version in every session so sessions can be replayed with the same config.
 *
 * Model identity:
 *   gpt-4o-realtime-preview       — alias (always resolves to latest snapshot)
 *   gpt-4o-realtime-preview-2025-06-03 — pinned snapshot from PDF spec
 * We pin the snapshot so a session recorded today can be reproduced identically later.
 */

export interface AnaRuntimeProfile {
  /** Semantic version — bump on any change that affects ANA behavior */
  version: string
  /** OpenAI Realtime model ID — GA family: gpt-realtime, gpt-realtime-2, gpt-realtime-2.1 */
  model: string
  /** OpenAI Realtime voice — goes under audio.output.voice in GA protocol */
  voice: string
  /** Transport layer — webrtc uses /v1/realtime/client_secrets + /v1/realtime/calls */
  transport: 'webrtc'
  /** VAD configuration — goes under audio.input.turn_detection in GA protocol */
  vad:
    | { type: 'server_vad'; silence_duration_ms: number; threshold: number; prefix_padding_ms: number }
    | { type: 'semantic_vad'; eagerness: 'low' | 'medium' | 'high' | 'auto'; create_response?: false }
  /** Transcription model for lead audio — goes under audio.input.transcription in GA protocol */
  transcription_model: string
  /** Noise reduction mode — goes under audio.input.noise_reduction in GA protocol */
  noise_reduction?: 'near_field' | 'far_field'
  /** Max tokens for model response — 'inf' = unlimited */
  max_response_output_tokens?: number | 'inf'
  /** Reasoning effort for the model */
  reasoning_effort?: 'low' | 'medium' | 'high'
  /** ISO timestamp when this profile was defined */
  defined_at: string
  /** If true, simulator sends session.update with create_response:false after session.created,
   *  then fires response.create explicitly per turn (HV-v4 controller gate). */
  controller_response_gate?: true
}

export const ANA_PROFILE_V2: AnaRuntimeProfile = {
  version: 'ANA-v2.0.0',
  model: 'gpt-realtime',
  voice: 'marin',
  transport: 'webrtc',
  vad: {
    type: 'server_vad',
    silence_duration_ms: 600,
    threshold: 0.5,
    prefix_padding_ms: 300,
  },
  transcription_model: 'gpt-4o-mini-transcribe',
  defined_at: '2026-08-13',
}

// HV-v3 — semantic_vad: detecta completude semântica do pensamento, não silêncio acústico.
// eagerness: 'low' = espera mais em áudio trailing-off ("hm...", "então...") antes de encerrar o turno.
// silence_duration_ms, threshold e prefix_padding_ms são server_vad-only — omitidos aqui.
export const ANA_PROFILE_V3: AnaRuntimeProfile = {
  version: 'ANA-v3.0.0',
  model: 'gpt-realtime',
  voice: 'marin',
  transport: 'webrtc',
  vad: {
    type: 'semantic_vad',
    eagerness: 'low',
  },
  transcription_model: 'gpt-4o-mini-transcribe',
  defined_at: '2026-08-16',
}

// HV-v4 — controller_response_gate: true
// create_response:false NÃO vai no payload inicial (/v1/realtime/client_secrets).
// É aplicado via session.update após session.created (protocolo correto conforme OpenAI Case #13293156).
// response.create é disparado explicitamente pelo controller com output_modalities:["audio"].
// Elimina a race condition onde semantic_vad disparava antes da classificação do controller.
//
// v4.3.0 — audio format baseline confirmado via OpenAI Case #13293156:
//   audio.input.format: { type: 'audio/pcm', rate: 24000 }
//   audio.output.format: { type: 'audio/pcm' }
//   output_modalities: ['audio'] no nível de sessão
//   getUserMedia: echoCancellation:true, noiseSuppression:false, autoGainControl:false
export const ANA_PROFILE_V4: AnaRuntimeProfile = {
  version: 'ANA-v4.3.0',
  model: 'gpt-realtime-2.1',
  voice: 'marin',
  transport: 'webrtc',
  vad: {
    type: 'semantic_vad',
    eagerness: 'low',
  },
  transcription_model: 'gpt-realtime-whisper',
  noise_reduction: 'far_field',
  max_response_output_tokens: 'inf',
  reasoning_effort: 'low',
  controller_response_gate: true,
  defined_at: '2026-08-18',  // v4.3.0 audio format baseline
}

// Gold — exato espelho do OpenAI Playground (server_vad Normal, sem controller)
// Testado em platform.openai.com/audio/realtime com gpt-realtime-2.1 + marin.
// ANA responde automaticamente via server_vad — sem create_response:false.
export const ANA_PROFILE_GOLD: AnaRuntimeProfile = {
  version: 'ANA-gold-v1.0',
  model: 'gpt-realtime-2.1',
  voice: 'marin',
  transport: 'webrtc',
  vad: {
    type: 'server_vad',
    threshold: 0.5,
    prefix_padding_ms: 300,
    silence_duration_ms: 500,
  },
  transcription_model: 'gpt-realtime-whisper',
  noise_reduction: 'far_field',
  max_response_output_tokens: 'inf',
  reasoning_effort: 'low',
  defined_at: '2026-08-19',
}

/** The active profile — import this everywhere instead of hardcoding constants */
export const ACTIVE_PROFILE: AnaRuntimeProfile = ANA_PROFILE_V4

// ── FASE 3 — Voice Behavior Profile per stage ─────────────────────────────────
// Injected as a suffix to STAGE_INSTRUCTIONS at each gate transition.
// Never modify ANA_BASE_PROMPT or gate logic — only add vocal orientation here.
// These are instruction-text profiles, not audio effects or filters.

export const VOICE_BEHAVIOR_PROFILES: Record<string, string> = {
  apresentacao: `INTENÇÃO VOCAL — ABERTURA:
Energia: moderada, presença firme desde a primeira palavra — não ansiosa, não fria.
Velocidade: natural, levemente pausada. Não apressada.
Autoridade: suficiente para transmitir competência, sem intimidar.
Calor: genuíno — como quem conhece a lead de longa data.
Curiosidade: latente — você está interessada nessa pessoa, não cumprindo protocolo.
Convicção: silenciosa — você sabe o que está fazendo.`,

  conexao: `INTENÇÃO VOCAL — CONEXÃO:
Energia: baixa-média. Você está presente, não animada.
Velocidade: desacelere deliberadamente. O silêncio após perguntas é ativo.
Pausas: longas e intencionais após a lead falar — ela precisa sentir que você processou.
Autoridade: quase ausente nessa etapa. Você é uma investigadora curiosa.
Calor: máximo. Cada resposta da lead merece reação genuína, não transição automática.
Curiosidade: sua emoção dominante nessa etapa.
Convicção: reservada — você ainda está aprendendo sobre essa pessoa.`,

  combinado: `INTENÇÃO VOCAL — COMBINADO:
Energia: média. Tom adulto e colaborativo.
Velocidade: natural. Nenhuma pressa — cada pausa entre falas é intencional.
Pausas: respeitadas integralmente após cada pergunta. Não antecipe.
Autoridade: presente, mas não dominante. Você está construindo acordo, não impondo.
Calor: constante. O combinado é um contrato entre iguais.
Firmeza: sua emoção dominante nessa etapa — você sabe exatamente onde está indo.
Convicção: crescendo. Cada confirmação da lead aumenta sua segurança.`,

  speech: `INTENÇÃO VOCAL — SPEECH (arco emocional P1→P4):
P1 — RECONHECIMENTO: voz firme e empática. Você viu a lead. Ela precisa sentir isso.
P2 — CLAREZA: desacelere nas frases-chave. O pellet precisa ser visual, não técnico.
P3 — DESEJO/PICO: energia crescente, convicção máxima. Conecte cada benefício à dor real dela. Paixão genuína — não performática.
P4 — SEGURANÇA: desacelere levemente. Tom de certeza tranquila.
Pergunta final: retorne à ESCUTA. Energia baixa. Você quer ouvir, não conduzir.`,

  fechamento: `INTENÇÃO VOCAL — FECHAMENTO:
Energia: média-alta no início, decrescendo para calma após apresentar a oferta.
Velocidade: normal na invocação do combinado, pausada na apresentação do valor.
Pausas: estratégicas após "R$ 5.000" e após a pergunta de escolha. Deixe a proposta respirar.
Autoridade: presente e serena. Você sabe que a solução é boa.
Calor: constante. Sem frieza comercial, sem urgência artificial.
Convicção: sua emoção dominante. Você acredita genuinamente no que está oferecendo.`,

  pagamento: `INTENÇÃO VOCAL — PAGAMENTO:
Energia: calma e objetiva.
Velocidade: normal. Sem pressa excessiva, sem protocolo visivelmente sendo seguido.
Autoridade: máxima, silenciosa. Você espera que a lead pague — não torce.
Calor: acolhedor. A lead pode estar nervosa — transmita que tudo está bem.
Convicção: total. Esse é o momento mais natural do processo.`,

  referidos: `INTENÇÃO VOCAL — REFERIDOS:
Energia: entusiasmada e leve.
Velocidade: normal-rápida para celebração, desacelera para instruções do link.
Autoridade: quase ausente. Você está em modo parceira, não vendedora.
Calor: máximo. Gratidão genuína antes de qualquer pedido.
Curiosidade: presente — você quer saber de quem ela vai lembrar.
Convicção: de que ela vai adorar ajudar alguém que ama.`,

  validacao: `INTENÇÃO VOCAL — VALIDAÇÃO:
Energia: calorosa, encerrando com a mesma presença que abriu.
Velocidade: tranquila. Você não está com pressa de encerrar.
Calor: máximo. A lead deve terminar a ligação sentindo que fez a coisa certa.
Convicção: silenciosa e completa. Você não está validando a decisão dela — ela já decidiu bem.`,
}
