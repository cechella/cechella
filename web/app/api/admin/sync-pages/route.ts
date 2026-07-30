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

// ─── Git: commit + push ───────────────────────────────────────────────────────
async function gitCommitAndPush(pages: string[], repoRoot: string): Promise<{ success: boolean; output: string; branch: string }> {
  const branch = (await execAsync(`git -C "${repoRoot}" rev-parse --abbrev-ref HEAD`)).stdout.trim()
  const filePaths = pages.map(p => `web/app/${PAGE_MAP[p].medicalPath}/page.tsx`).join(' ')
  const msg = `sync: auto-sync medical pages from admin [${pages.map(p => PAGE_MAP[p].label).join(', ')}]`

  await execAsync(`git -C "${repoRoot}" add ${filePaths}`)
  await execAsync(`git -C "${repoRoot}" commit -m "${msg}" || true`)
  const { stdout } = await execAsync(`git -C "${repoRoot}" push origin ${branch}`)
  return { success: true, output: `Pushed to ${branch}\n${stdout}`, branch }
}

// ─── GitHub API: create PR + merge ───────────────────────────────────────────
async function githubMergeToProduction(
  headBranch: string,
  pages: string[],
  token: string
): Promise<{ success: boolean; message: string; prUrl?: string }> {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  }
  const base = PRODUCTION_BRANCH
  const pageLabels = pages.map(p => PAGE_MAP[p].label).join(', ')
  const timestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })

  // 1. Check if PR already exists
  const searchResp = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/pulls?head=${GITHUB_REPO.split('/')[0]}:${headBranch}&base=${encodeURIComponent(base)}&state=open`,
    { headers }
  )
  const existingPRs = await searchResp.json() as Array<{ number: number; html_url: string }>
  let prNumber: number
  let prUrl: string

  if (Array.isArray(existingPRs) && existingPRs.length > 0) {
    prNumber = existingPRs[0].number
    prUrl = existingPRs[0].html_url
  } else {
    // 2. Create PR
    const createResp = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/pulls`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: `sync: auto-sync medical pages [${pageLabels}]`,
        body: `## Sincronização Automática\n\nPáginas sincronizadas em ${timestamp}:\n${pages.map(p => `- ${PAGE_MAP[p].label}`).join('\n')}\n\n> Gerado pelo Admin → Sistema → Sincronizar + Deploy`,
        head: headBranch,
        base,
      }),
    })
    const pr = await createResp.json() as { number?: number; html_url?: string; message?: string }
    if (!pr.number) {
      return { success: false, message: `Erro ao criar PR: ${pr.message ?? JSON.stringify(pr)}` }
    }
    prNumber = pr.number
    prUrl = pr.html_url ?? ''
  }

  // 3. Merge PR
  const mergeResp = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/pulls/${prNumber}/merge`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      merge_method: 'squash',
      commit_title: `sync: auto-sync medical pages [${pageLabels}]`,
      commit_message: `Sincronizado em ${timestamp} via Admin → Sistema`,
    }),
  })
  const mergeData = await mergeResp.json() as { merged?: boolean; message?: string }

  if (!mergeData.merged) {
    return { success: false, message: `Erro no merge: ${mergeData.message ?? JSON.stringify(mergeData)}`, prUrl }
  }

  return { success: true, message: `PR #${prNumber} merged → produção sendo atualizada`, prUrl }
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

    const repoRoot = path.resolve(process.cwd(), '..')
    const webRoot = process.cwd()

    // 1. Transform and write files
    const results: Record<string, { success: boolean; message: string }> = {}
    for (const pageName of pages) {
      const { adminPath, medicalPath, label } = PAGE_MAP[pageName]
      try {
        const adminFile = path.join(webRoot, 'app', adminPath, 'page.tsx')
        const medicalFile = path.join(webRoot, 'app', medicalPath, 'page.tsx')
        await fs.mkdir(path.dirname(medicalFile), { recursive: true })
        const source = await fs.readFile(adminFile, 'utf-8')
        await fs.writeFile(medicalFile, transformAdminToMedical(source, pageName), 'utf-8')
        results[pageName] = { success: true, message: `${label} sincronizado com sucesso` }
      } catch (err: unknown) {
        results[pageName] = { success: false, message: `Erro: ${err instanceof Error ? err.message : String(err)}` }
      }
    }

    const successPages = pages.filter(p => results[p].success)
    if (successPages.length === 0) {
      return NextResponse.json({ results, gitResult: null, deployResult: null })
    }

    // 2. Git commit + push
    let gitResult: { success: boolean; output: string; branch?: string } | null = null
    let deployResult: { triggered: boolean; message: string; prUrl?: string } | null = null

    try {
      const git = await gitCommitAndPush(successPages, repoRoot)
      gitResult = git

      if (deploy) {
        const githubToken = process.env.GITHUB_TOKEN

        if (githubToken) {
          // Use GitHub API to merge → triggers Vercel production deploy
          const merge = await githubMergeToProduction(git.branch, successPages, githubToken)
          deployResult = { triggered: merge.success, message: merge.message, prUrl: merge.prUrl }
        } else {
          // Fallback: trigger Vercel webhook (Preview only)
          const webhookUrl = process.env.VERCEL_DEPLOY_WEBHOOK_URL
          if (webhookUrl) {
            const resp = await fetch(webhookUrl, { method: 'POST' })
            deployResult = {
              triggered: resp.ok,
              message: resp.ok
                ? 'Deploy iniciado via webhook (Preview — adicione GITHUB_TOKEN para produção automática)'
                : `Webhook falhou: ${resp.status}`,
            }
          } else {
            deployResult = { triggered: false, message: 'Configure GITHUB_TOKEN para deploy automático em produção' }
          }
        }
      }
    } catch (err: unknown) {
      gitResult = { success: false, output: err instanceof Error ? err.message : String(err) }
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
