export const OPENAI_API_KEY = process.env.OPENAI_API_KEY!

export const REALTIME_DEFAULTS = {
  voice: (process.env.REALTIME_VOICE ?? 'shimmer') as string,
  model: 'gpt-4o-realtime-preview' as const,
}

export const SUPABASE_URL = process.env.SUPABASE_URL!
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const ZAPI_BASE = `https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE}/token/${process.env.ZAPI_TOKEN}`
export const ZAPI_CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN!

export const APP_URL = process.env.APP_URL ?? 'https://www.hormoneecosystem.com'
export const PUBLIC_HOST = process.env.PUBLIC_HOST ?? 'https://ana-master.hormoneecosystem.com'
export const PORT = parseInt(process.env.PORT ?? '3001')
