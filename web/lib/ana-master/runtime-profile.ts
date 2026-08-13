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
