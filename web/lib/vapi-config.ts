// Configuração central do VAPI — altere aqui e reflete em todo o sistema
export const VAPI_CONFIG = {
  apiKey: process.env.VAPI_API_KEY || 'e3bc519a-7466-4450-bcfc-2ae9566d9e2f',
  assistantId: process.env.VAPI_ASSISTANT_ID || 'f2ab9277-dcf3-4fe5-9ac4-5cd0c45229c5',
  phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID || '63fc45bb-23bb-439a-93a4-cf680eeda22e',
  serverUrl: process.env.VAPI_SERVER_URL || 'https://www.hormoneecosystem.com/api/vapi/end-call',
}
