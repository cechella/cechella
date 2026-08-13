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
  /** OpenAI Realtime model ID — must be exact snapshot, not an alias */
  model: string
  /** OpenAI TTS voice */
  voice: string
  /** VAD configuration */
  vad: {
    type: 'server_vad'
    silence_duration_ms: number
    threshold: number
    prefix_padding_ms: number
  }
  /** Transcription model for lead audio */
  transcription_model: string
  /** ISO timestamp when this profile was defined */
  defined_at: string
}

export const ANA_PROFILE_V1: AnaRuntimeProfile = {
  version: 'ANA-v1.0.0',
  model: 'gpt-4o-realtime-preview-2025-06-03',
  voice: 'marin',
  vad: {
    type: 'server_vad',
    silence_duration_ms: 600,
    threshold: 0.5,
    prefix_padding_ms: 300,
  },
  transcription_model: 'gpt-4o-transcribe',
  defined_at: '2026-08-13',
}

/** The active profile — import this everywhere instead of hardcoding constants */
export const ACTIVE_PROFILE: AnaRuntimeProfile = ANA_PROFILE_V1

// ── FASE 3 — Voice Behavior Profile per stage ─────────────────────────────────
// Injected as a suffix to STAGE_INSTRUCTIONS at each gate transition.
// Never modify ANA_BASE_PROMPT or gate logic — only add vocal orientation here.
// These are instruction-text profiles, not audio effects or filters.

export const VOICE_BEHAVIOR_PROFILES: Record<string, string> = {
  apresentacao: `PERFIL VOCAL — ABERTURA: Voz calorosa e natural. Cadência levemente pausada. Transmita calor humano genuíno desde a primeira palavra. Tom de alguém que conhece a lead de longa data — sem formalidade excessiva, sem pressa.`,

  conexao: `PERFIL VOCAL — CONEXÃO: Desacelere. Mostre curiosidade genuína em cada resposta da lead. Deixe o silêncio trabalhar após suas perguntas. Tom de parceria real, não de entrevista. Reaja ao conteúdo — não ao roteiro.`,

  combinado: `PERFIL VOCAL — COMBINADO: Tom colaborativo. Você está construindo algo junto com a lead. Energia moderada, pace natural. Leve a sério cada palavra que ela diz — o combinado deve soar como consequência natural da conversa.`,

  speech: `PERFIL VOCAL — SPEECH: Energia crescente P1→P4. P1: introdução firme, clara. P2: aprofunda a dor — tom mais empático, desacelere nas frases-chave. P3: apresenta solução com convicção crescente. P4: pico de energia — dados, ciência, resultado. Conviction building — nunca palestra. Adapte cada parte à dor real que a lead relatou.`,

  fechamento: `PERFIL VOCAL — FECHAMENTO: Autoridade calma. Sem urgência artificial. Tom de quem sabe que a solução é boa e que a lead merece isso. Pausa estratégica após apresentar a oferta — deixe a proposta respirar.`,

  pagamento: `PERFIL VOCAL — PAGAMENTO: Objetivo, direto, confiante. Brevidade é poder aqui. Apresente valor e condições com naturalidade — como se fosse a parte mais normal do mundo. Não explique demais.`,

  referidos: `PERFIL VOCAL — REFERIDOS: Gratidão primeiro. Narrativa antes de ação. Voz mais suave, tom de convite genuíno — não de cobrança. A lead deve sentir que está fazendo um favor a alguém importante, não cumprindo uma etapa comercial.`,

  validacao: `PERFIL VOCAL — VALIDAÇÃO: Encerramento caloroso. Energia que transmite certeza no resultado. A lead deve terminar a ligação com mais confiança do que entrou — e sentir que a ANA foi uma aliada real nessa decisão.`,
}
