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

// ─── GitHub API: write file (create or update), returns commit SHA ────────────
async function writeFileToGitHub(
  filePath: string,
  content: string,
  token: string,
  commitMessage: string
): Promise<string> {
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

  const result = await putResp.json() as { commit?: { sha?: string } }
  return result.commit?.sha ?? ''
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

// ─── Vercel API: create production deployment directly (works on Hobby) ───────
async function vercelCreateProductionDeployment(
  commitSha: string,
  vercelToken: string,
  webhookUrl: string,
): Promise<{ triggered: boolean; message: string }> {
  const headers = {
    'Authorization': `Bearer ${vercelToken}`,
    'Content-Type': 'application/json',
  }

  // Extract project ID from webhook URL
  const match = webhookUrl.match(/\/deploy\/(prj_[^/]+)/)
  const projectId = match?.[1]
  if (!projectId) {
    return { triggered: false, message: 'Não foi possível extrair project ID do webhook URL' }
  }

  // Get project details (name + git repo ID)
  const projResp = await fetch(`https://api.vercel.com/v9/projects/${projectId}`, { headers })
  if (!projResp.ok) {
    return { triggered: false, message: `Erro ao buscar projeto: ${projResp.status}` }
  }
  const projData = await projResp.json() as {
    name?: string
    link?: { repoId?: number; type?: string }
  }

  const projectName = projData.name
  const repoId = projData.link?.repoId

  if (!projectName || !repoId) {
    return { triggered: false, message: 'Não foi possível obter nome/repoId do projeto Vercel' }
  }

  // Create deployment directly targeting production with the commit SHA
  const deployResp = await fetch('https://api.vercel.com/v13/deployments', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: projectName,
      target: 'production',
      gitSource: {
        type: 'github',
        repoId: String(repoId),
        ref: PRODUCTION_BRANCH,
        sha: commitSha,
      },
    }),
  })

  const deployData = await deployResp.json() as { id?: string; url?: string; error?: { message: string }; message?: string }

  if (deployResp.ok && deployData.id) {
    return { triggered: true, message: `🚀 Deploy de produção iniciado! ID: ${deployData.id} — hormoneecosystem.com será atualizado em ~1 min` }
  }

  return {
    triggered: false,
    message: `Erro ao criar deploy: ${deployData.error?.message ?? deployData.message ?? deployResp.status}`,
  }
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
    let lastCommitSha = ''

    for (const pageName of pages) {
      const { adminPath, medicalPath, label } = PAGE_MAP[pageName]
      try {
        const adminGitPath = `web/app/${adminPath}/page.tsx`
        const medicalGitPath = `web/app/${medicalPath}/page.tsx`

        const source = await fetchFileFromGitHub(adminGitPath, githubToken)
        const transformed = transformAdminToMedical(source, pageName)
        const commitMsg = `sync: auto-sync ${label} medical page from admin [${timestamp}]`

        const sha = await writeFileToGitHub(medicalGitPath, transformed, githubToken, commitMsg)
        if (sha) lastCommitSha = sha
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

    // 2. Trigger production deploy if requested
    let deployResult: { triggered: boolean; message: string } | null = null

    if (deploy) {
      const vercelToken = process.env.VERCEL_TOKEN
      const webhookUrl = process.env.VERCEL_DEPLOY_WEBHOOK_URL

      if (vercelToken && webhookUrl && lastCommitSha) {
        deployResult = await vercelCreateProductionDeployment(lastCommitSha, vercelToken, webhookUrl)
      } else if (!vercelToken) {
        deployResult = { triggered: false, message: 'Configure VERCEL_TOKEN nas variáveis de ambiente' }
      } else if (!webhookUrl) {
        deployResult = { triggered: false, message: 'Configure VERCEL_DEPLOY_WEBHOOK_URL nas variáveis de ambiente' }
      } else {
        deployResult = { triggered: false, message: 'Commit SHA não disponível para deploy' }
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
