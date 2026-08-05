import { NextResponse } from 'next/server'
import { VAPI_CONFIG } from '@/lib/vapi-config'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    apiKey: VAPI_CONFIG.apiKey,
    assistantId: VAPI_CONFIG.assistantId,
    phoneNumberId: VAPI_CONFIG.phoneNumberId,
    serverUrl: VAPI_CONFIG.serverUrl,
  })
}
