// VAPI Live Call Control — mute/unmute assistant during tool execution
// Used to suppress filler speech ("Espere um segundo") while tools run.

export interface MuteLog {
  toolName: string
  callId?: string
  controlUrl?: string
  T0_webhook: number       // webhook arrived at our server
  T1_mute_sent?: number    // mute request dispatched
  T1_mute_ok?: boolean     // mute HTTP 2xx received
  T1_mute_ms?: number      // round-trip ms for mute
  T2_tool_done?: number    // tool logic completed
  T3_unmute_sent?: number  // unmute request dispatched
  T3_unmute_ok?: boolean
  T3_unmute_ms?: number
  total_ms?: number
  noControlUrl: boolean
}

function extractControlUrl(body: any): string | undefined {
  return (
    body?.message?.call?.monitor?.controlUrl ||
    body?.message?.call?.controlUrl ||
    body?.call?.monitor?.controlUrl ||
    body?.call?.controlUrl
  )
}

async function sendControl(controlUrl: string, control: 'mute-assistant' | 'unmute-assistant'): Promise<{ ok: boolean; ms: number }> {
  const start = Date.now()
  try {
    const res = await fetch(controlUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'control', control }),
    })
    return { ok: res.ok, ms: Date.now() - start }
  } catch (e) {
    return { ok: false, ms: Date.now() - start }
  }
}

function printLog(log: MuteLog) {
  const tag = `[SILENCE-TEST][${log.toolName}]`
  if (log.noControlUrl) {
    console.log(`${tag} NO_CONTROL_URL callId=${log.callId ?? 'unknown'}`)
    return
  }
  const muteLatency = log.T1_mute_sent != null ? log.T1_mute_sent - log.T0_webhook : '?'
  const toolDuration = (log.T1_mute_sent != null && log.T2_tool_done != null) ? log.T2_tool_done - log.T1_mute_sent : '?'
  const result = log.T1_mute_ok
    ? (log.T3_unmute_ok ? 'E_PERFECT' : 'D_UNMUTE_FAIL')
    : 'C_MUTE_FAIL'

  console.log(
    `${tag} result=${result} ` +
    `webhook→mute=${muteLatency}ms ` +
    `mute_rtt=${log.T1_mute_ms ?? '?'}ms ` +
    `tool_exec=${toolDuration}ms ` +
    `unmute_rtt=${log.T3_unmute_ms ?? '?'}ms ` +
    `total=${log.total_ms ?? '?'}ms ` +
    `controlUrl=${log.controlUrl ? 'YES' : 'NO'}`
  )
}

export function initMuteLog(body: any, toolName: string): MuteLog {
  const controlUrl = extractControlUrl(body)
  const callId = body?.message?.call?.id || body?.call?.id
  return {
    toolName,
    callId,
    controlUrl,
    T0_webhook: Date.now(),
    noControlUrl: !controlUrl,
  }
}

export async function muteBeforeTool(log: MuteLog): Promise<void> {
  if (!log.controlUrl) return
  log.T1_mute_sent = Date.now()
  const r = await sendControl(log.controlUrl, 'mute-assistant')
  log.T1_mute_ok = r.ok
  log.T1_mute_ms = r.ms
}

export function markToolDone(log: MuteLog): void {
  log.T2_tool_done = Date.now()
}

export async function unmuteAfterTool(log: MuteLog): Promise<void> {
  if (!log.controlUrl) return
  log.T3_unmute_sent = Date.now()
  const r = await sendControl(log.controlUrl, 'unmute-assistant')
  log.T3_unmute_ok = r.ok
  log.T3_unmute_ms = r.ms
  log.total_ms = Date.now() - log.T0_webhook
  printLog(log)
}
