export const OPENAI_API_KEY = process.env.OPENAI_API_KEY!

// Legacy Realtime stack (gpt-realtime-2.1 + marin) — kept as rollback
export const REALTIME_DEFAULTS = {
  voice: (process.env.REALTIME_VOICE ?? 'marin') as string,
  model: (process.env.REALTIME_MODEL ?? 'gpt-realtime-2.1') as string,
}

// New Live stack (gpt-live-1 + bossa) — experimental
export const LIVE_DEFAULTS = {
  voice: (process.env.LIVE_VOICE ?? 'bossa') as string,
  model: (process.env.LIVE_MODEL ?? 'gpt-live-1') as string,
}

// Feature flag: 'realtime' (default/stable) | 'live' (experimental)
export const ANA_VOICE_STACK = (process.env.ANA_VOICE_STACK ?? 'realtime') as 'realtime' | 'live'

export const SUPABASE_URL = process.env.SUPABASE_URL!
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const ZAPI_BASE = `https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE}/token/${process.env.ZAPI_TOKEN}`
export const ZAPI_CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN!

export const APP_URL = process.env.APP_URL ?? 'https://www.hormoneecosystem.com'
export const PUBLIC_HOST = process.env.PUBLIC_HOST ?? 'https://ana-master.hormoneecosystem.com'
export const PORT = parseInt(process.env.PORT ?? '3001')
