import { GOLDEN_PROMPT, ANA_BASE_PROMPT } from './constants'
import { ANA_PROFILE_GOLD, ACTIVE_PROFILE } from './runtime-profile'

export const GOLD_DEFAULTS = {
  profile: 'gold',
  model: ANA_PROFILE_GOLD.model,
  voice: ANA_PROFILE_GOLD.voice,
  vad_type: 'server_vad',
  vad_threshold: 0.5,
  vad_prefix_padding_ms: 300,
  vad_silence_duration_ms: 500,
  vad_eagerness: 'low',
  transcription_model: ANA_PROFILE_GOLD.transcription_model,
  noise_reduction: ANA_PROFILE_GOLD.noise_reduction ?? 'far_field',
  max_output_tokens: 'inf',
  reasoning_effort: 'low',
  instructions: GOLDEN_PROMPT,
}

export const CONTROLLER_DEFAULTS = {
  profile: 'controller',
  model: ACTIVE_PROFILE.model,
  voice: ACTIVE_PROFILE.voice,
  vad_type: ACTIVE_PROFILE.vad.type,
  vad_threshold: (ACTIVE_PROFILE.vad as any).threshold ?? 0.5,
  vad_prefix_padding_ms: (ACTIVE_PROFILE.vad as any).prefix_padding_ms ?? 300,
  vad_silence_duration_ms: (ACTIVE_PROFILE.vad as any).silence_duration_ms ?? 500,
  vad_eagerness: (ACTIVE_PROFILE.vad as any).eagerness ?? 'low',
  transcription_model: ACTIVE_PROFILE.transcription_model,
  noise_reduction: ACTIVE_PROFILE.noise_reduction ?? 'far_field',
  max_output_tokens: 'inf',
  reasoning_effort: 'low',
  instructions: ANA_BASE_PROMPT,
}
