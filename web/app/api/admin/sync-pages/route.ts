import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic'

const execAsync = promisify(exec)

const GITHUB_REPO = 'cechella/cechella'
const PRODUCTION_BRANCH = 'claude/festive-brahmagupta-ph81za'

// ─── Page map ────────────────────────────────────────────────────────────────
const PAGE_MAP: Record<string, { adminPath: string; medicalPath: string; label: string }> = {
  dashboard:  { adminPath: 'admin/dashboard',  medicalPath: 'medical/dashboard',  label: 'Dashboard'  },
  crm:        { adminPath: 'admin/crm',        medicalPath: 'medical/crm',        label: 'CRM'        },
  referidos:  { adminPath: 'admin/referidos',  medicalPath: 'medical/referidos',  label: 'Referidos'  },
  financeiro: { adminPath: 'admin/financeiro', medicalPath: 'medical/financeiro', label: 'Financeiro' },
  agente:     { adminPath: 'admin/agente',     medicalPath: 'medical/agente',     label: 'Agente IA'  },
  analytics:  { adminPath: 'admin/analytics',  medicalPath: 'medical/analytics',  label: 'Analytics'  },
  rede:       { adminPath: 'admin/rede',       medicalPath: 'medical/rede',       label: 'Rede'       },
  resultados: { adminPath: 'admin/resultados', medicalPath: 'medical/resultados', label: 'Resultados' },
}

// ─── GitHub API: fetch file contents ─────────────────────────────────────────
async function fetchFileFromGitHub(filePath: string, token: string): Promise<string> {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}?ref=${PRODUCTION_BRANCH}`
  const resp = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3.raw',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  if (!resp.ok) {
    throw new Error(`GitHub API error ${resp.status} for ${filePath}: ${await resp.text()}`)
  }
  return resp.text()
}

// ─── GitHub API: write file (create or update) ────────────────────────────────
async function writeFileToGitHub(
  filePath: string,
  content: string,
  token: string,
  commitMessage: string
): Promise<void> {
  // Get current SHA if file exists
  const getUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}?ref=${PRODUCTION_BRANCH}`
  const getResp = await fetch(getUrl, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })

  let sha: string | undefined
  if (getResp.ok) {
    const data = await getResp.json() as { sha?: string }
    sha = data.sha
  }

  const body: Record<string, unknown> = {
    message: commitMessage,
    content: Buffer.from(content).toString('base64'),
    branch: PRODUCTION_BRANCH,
  }
  if (sha) body.sha = sha

  const putResp = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!putResp.ok) {
    const err = await putResp.json() as { message?: string }
    throw new Error(`GitHub write error ${putResp.status}: ${err.message ?? JSON.stringify(err)}`)
  }
}

// ─── Transformation: admin → medical ─────────────────────────────────────────
function transformAdminToMedical(source: string, pageName: string): string {
  let out = source
  out = out.replace(/role="admin"/g, 'role="medical"')
  out = out.replace(
    /user=\{\{[^}]*role:\s*['"]admin['"][^}]*\}\}/g,
    `user={{ name: 'Dr. Ricardo Lima', role: 'doctor' }}`
  )
  out = out.replace(
    /<TopBar([^>]*)user=\{\{[^}]+\}\}/g,
    (match, before) => `<TopBar${before}user={{ name: 'Dr. Ricardo Lima', role: 'doctor' }}`
  )
  out = out.replace(/(['"`])\/admin\//g, `$1/medical/`)
  out = out.replace(/href="\/admin\//g, `href="/medical/`)
  out = out.replace(/router\.push\('\/admin\//g, `router.push('/medical/`)
  out = out.replace(/router\.push\("\/admin\//g, `router.push("/medical/`)
  out = out.replace(/channel\('([^']+)'\)/g, (match, name) => {
    if (name.endsWith('-medical')) return match
    return `channel('${name}-medical')`
  })
  out = out.replace(/channel\("([^"]+)"\)/g, (match, name) => {
    if (name.endsWith('-medical')) return match
    return `channel("${name}-medical")`
  })
  const marker = `// [SYNC] Gerado automaticamente de admin/${pageName} — NÃO editar manualmente\n// Para atualizar: Admin → Sistema → Sincronizar\n`
  if (!out.startsWith('// [SYNC]')) {
    out = marker + out
  } else {
    out = out.replace(/^\/\/ \[SYNC\].*\n\/\/ Para atualizar.*\n/, marker)
  }
  return out
}

// ─── Vercel API: trigger webhook + wait + alias to production ────────────────
async function vercelDeployAndPromote(
  webhookUrl: string,
  vercelToken: string
): Promise<{ triggered: boolean; message: string }> {
  const hookResp = await fetch(webhookUrl, { method: 'POST' })
  if (!hookResp.ok) {
    return { triggered: false, message: `Webhook falhou: ${hookResp.status}` }
  }

  const match = webhookUrl.match(/\/deploy\/(prj_[^/]+)/)
  const projectId = match?.[1]
  if (!projectId) {
    return { triggered: true, message: 'Deploy iniciado via webhook (sem project ID para promover)' }
  }

  const headers = {
    'Authorization': `Bearer ${vercelToken}`,
    'Content-Type': 'application/json',
  }

  // 1. Get production aliases from project
  const projResp = await fetch(`https://api.vercel.com/v9/projects/${projectId}`, { headers })
  const projData = await projResp.json() as { alias?: Array<{ domain: string; target?: string }> }
  const productionDomain = projData.alias?.find(a => a.target === 'PRODUCTION')?.domain
    ?? projData.alias?.[0]?.domain

  // 2. Poll for new READY deployment (up to 3 min)
  let deploymentId: string | null = null
  let deploymentUrl: string | null = null
  for (let i = 0; i < 18; i++) {
    await new Promise(r => setTimeout(r, 10000))
    const listResp = await fetch(
      `https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=5`,
      { headers }
    )
    const listData = await listResp.json() as { deployments?: Array<{ uid: string; url: string; state: string; createdAt: number }> }
    const recent = listData.deployments?.find(d =>
      d.state === 'READY' && Date.now() - d.createdAt < 300000
    )
    if (recent) {
      deploymentId = recent.uid
      deploymentUrl = recent.url
      break
    }
  }

  if (!deploymentId || !deploymentUrl) {
    return { triggered: true, message: 'Deploy iniciado — aguardando conclusão. Verifique o Vercel.' }
  }

  // 3. Try promote first
  const promoteResp = await fetch(
    `https://api.vercel.com/v10/projects/${projectId}/promote/${deploymentId}`,
    { method: 'POST', headers }
  )

  if (promoteResp.ok) {
    return { triggered: true, message: `Deploy promovido para produção! ID: ${deploymentId}` }
  }

  // 4. Fallback: assign production domain alias
  if (productionDomain) {
    const aliasResp = await fetch(
      `https://api.vercel.com/v2/deployments/${deploymentId}/aliases`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ alias: productionDomain }),
      }
    )
    const aliasData = await aliasResp.json() as { uid?: string; alias?: string; error?: { message: string } }
    if (aliasResp.ok) {
      return { triggered: true, message: `Produção atualizada via alias → ${productionDomain}` }
    }
    return {
      triggered: true,
      message: `Deploy criado (${deploymentId}) mas alias falhou: ${aliasData.error?.message ?? aliasResp.status}. Promova manualmente.`,
    }
  }

  return { triggered: true, message: `Deploy criado (${deploymentId}). Promova manualmente no Vercel.` }
}

// ─── POST /api/admin/sync-pages ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { pages, deploy = false }: { pages: string[]; deploy: boolean } = body

    if (!pages || !Array.isArray(pages) || pages.length === 0) {
      return NextResponse.json({ error: 'Nenhuma página selecionada' }, { status: 400 })
    }

    const invalid = pages.filter(p => !PAGE_MAP[p])
    if (invalid.length > 0) {
      return NextResponse.json({ error: `Páginas inválidas: ${invalid.join(', ')}` }, { status: 400 })
    }

    const githubToken = process.env.GITHUB_TOKEN
    if (!githubToken) {
      return NextResponse.json({ error: 'GITHUB_TOKEN não configurado' }, { status: 500 })
    }

    // 1. Fetch, transform and write files via GitHub API
    const results: Record<string, { success: boolean; message: string }> = {}
    const timestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })

    for (const pageName of pages) {
      const { adminPath, medicalPath, label } = PAGE_MAP[pageName]
      try {
        const adminGitPath = `web/app/${adminPath}/page.tsx`
        const medicalGitPath = `web/app/${medicalPath}/page.tsx`

        const source = await fetchFileFromGitHub(adminGitPath, githubToken)
        const transformed = transformAdminToMedical(source, pageName)
        const commitMsg = `sync: auto-sync ${label} medical page from admin [${timestamp}]`

        await writeFileToGitHub(medicalGitPath, transformed, githubToken, commitMsg)
        results[pageName] = { success: true, message: `${label} sincronizado com sucesso` }
      } catch (err: unknown) {
        results[pageName] = { success: false, message: `Erro: ${err instanceof Error ? err.message : String(err)}` }
      }
    }

    const successPages = pages.filter(p => results[p].success)
    if (successPages.length === 0) {
      return NextResponse.json({ results, gitResult: null, deployResult: null })
    }

    const gitResult = {
      success: true,
      output: `${successPages.length} página(s) commitadas via GitHub API → branch ${PRODUCTION_BRANCH}`,
      branch: PRODUCTION_BRANCH,
    }

    // 2. Trigger deploy if requested
    let deployResult: { triggered: boolean; message: string } | null = null

    if (deploy) {
      const vercelToken = process.env.VERCEL_TOKEN
      const webhookUrl = process.env.VERCEL_DEPLOY_WEBHOOK_URL

      if (vercelToken && webhookUrl) {
        deployResult = await vercelDeployAndPromote(webhookUrl, vercelToken)
      } else if (webhookUrl) {
        const resp = await fetch(webhookUrl, { method: 'POST' })
        deployResult = {
          triggered: resp.ok,
          message: resp.ok
            ? 'Deploy Preview iniciado (adicione VERCEL_TOKEN para produção automática)'
            : `Webhook falhou: ${resp.status}`,
        }
      } else {
        deployResult = { triggered: false, message: 'Configure VERCEL_DEPLOY_WEBHOOK_URL' }
      }
    }

    return NextResponse.json({ results, gitResult, deployResult })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

// ─── GET — list available pages ───────────────────────────────────────────────
export async function GET() {
  return NextResponse.json({
    pages: Object.entries(PAGE_MAP).map(([key, val]) => ({
      key, label: val.label, adminPath: val.adminPath, medicalPath: val.medicalPath,
    }))
  })
}
