import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic'

const execAsync = promisify(exec)

// ─── Page map: which admin pages can be synced to medical ─────────────────────
const PAGE_MAP: Record<string, { adminPath: string; medicalPath: string; label: string }> = {
  dashboard:  { adminPath: 'admin/dashboard',  medicalPath: 'medical/dashboard',  label: 'Dashboard'   },
  crm:        { adminPath: 'admin/crm',        medicalPath: 'medical/crm',        label: 'CRM'         },
  referidos:  { adminPath: 'admin/referidos',  medicalPath: 'medical/referidos',  label: 'Referidos'   },
  financeiro: { adminPath: 'admin/financeiro', medicalPath: 'medical/financeiro', label: 'Financeiro'  },
  agente:     { adminPath: 'admin/agente',     medicalPath: 'medical/agente',     label: 'Agente IA'   },
  analytics:  { adminPath: 'admin/analytics',  medicalPath: 'medical/analytics',  label: 'Analytics'   },
  rede:       { adminPath: 'admin/rede',       medicalPath: 'medical/rede',       label: 'Rede'        },
  resultados: { adminPath: 'admin/resultados', medicalPath: 'medical/resultados', label: 'Resultados'  },
}

// ─── Transformation: admin → medical ─────────────────────────────────────────
function transformAdminToMedical(source: string, pageName: string): string {
  let out = source

  // 1. Sidebar role
  out = out.replace(/role="admin"/g, 'role="medical"')

  // 2. TopBar user — replace any existing admin user object
  out = out.replace(
    /user=\{\{[^}]*role:\s*['"]admin['"][^}]*\}\}/g,
    `user={{ name: 'Dr. Ricardo Lima', role: 'doctor' }}`
  )
  // Fallback: plain name/role patterns
  out = out.replace(
    /<TopBar([^>]*)user=\{\{[^}]+\}\}/g,
    (match, before) => `<TopBar${before}user={{ name: 'Dr. Ricardo Lima', role: 'doctor' }}`
  )

  // 3. Internal admin links → medical
  out = out.replace(/(['"`])\/admin\//g, `$1/medical/`)
  out = out.replace(/href="\/admin\//g, `href="/medical/`)
  out = out.replace(/router\.push\('\/admin\//g, `router.push('/medical/`)
  out = out.replace(/router\.push\("\/admin\//g, `router.push("/medical/`)

  // 4. Supabase realtime channel names — suffix with -medical to avoid conflicts
  out = out.replace(/channel\('([^']+)'\)/g, (match, name) => {
    if (name.endsWith('-medical')) return match
    return `channel('${name}-medical')`
  })
  out = out.replace(/channel\("([^"]+)"\)/g, (match, name) => {
    if (name.endsWith('-medical')) return match
    return `channel("${name}-medical")`
  })

  // 5. Page-specific: add medical comment marker at top
  const marker = `// [SYNC] Gerado automaticamente de admin/${pageName} — NÃO editar manualmente\n// Para atualizar: Admin → Sistema → Sincronizar\n`
  if (!out.startsWith("// [SYNC]")) {
    out = marker + out
  } else {
    // Replace existing marker
    out = out.replace(/^\/\/ \[SYNC\].*\n\/\/ Para atualizar.*\n/, marker)
  }

  return out
}

// ─── Run git commands ─────────────────────────────────────────────────────────
async function gitCommitAndPush(pages: string[], repoRoot: string): Promise<{ success: boolean; output: string }> {
  try {
    const filePaths = pages.map(p => `web/app/${PAGE_MAP[p].medicalPath}/page.tsx`).join(' ')

    await execAsync(`git -C "${repoRoot}" add ${filePaths}`)

    const msg = `sync: auto-sync medical pages from admin [${pages.map(p => PAGE_MAP[p].label).join(', ')}]`
    await execAsync(`git -C "${repoRoot}" commit -m "${msg}" || true`)

    const branch = (await execAsync(`git -C "${repoRoot}" rev-parse --abbrev-ref HEAD`)).stdout.trim()
    const { stdout } = await execAsync(`git -C "${repoRoot}" push origin ${branch}`)
    return { success: true, output: `Pushed to ${branch}\n${stdout}` }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, output: msg }
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

    // Repo root = 2 levels up from web/app/api/...
    const repoRoot = path.resolve(process.cwd(), '..')
    const webRoot = process.cwd() // = /path/to/web

    const results: Record<string, { success: boolean; message: string }> = {}

    for (const pageName of pages) {
      const { adminPath, medicalPath, label } = PAGE_MAP[pageName]
      try {
        const adminFile = path.join(webRoot, 'app', adminPath, 'page.tsx')
        const medicalFile = path.join(webRoot, 'app', medicalPath, 'page.tsx')
        const medicalDir = path.dirname(medicalFile)

        // Read admin source
        const source = await fs.readFile(adminFile, 'utf-8')

        // Transform
        const transformed = transformAdminToMedical(source, pageName)

        // Ensure medical dir exists
        await fs.mkdir(medicalDir, { recursive: true })

        // Write medical page
        await fs.writeFile(medicalFile, transformed, 'utf-8')

        results[pageName] = { success: true, message: `${label} sincronizado com sucesso` }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        results[pageName] = { success: false, message: `Erro ao sincronizar ${label}: ${msg}` }
      }
    }

    // Git commit + push
    const successPages = pages.filter(p => results[p].success)
    let gitResult: { success: boolean; output: string } | null = null

    if (successPages.length > 0 && deploy) {
      gitResult = await gitCommitAndPush(successPages, repoRoot)
    } else if (successPages.length > 0) {
      // Commit only, no push
      try {
        const filePaths = successPages.map(p => `web/app/${PAGE_MAP[p].medicalPath}/page.tsx`).join(' ')
        await execAsync(`git -C "${repoRoot}" add ${filePaths}`)
        const msg = `sync: auto-sync medical pages from admin [${successPages.map(p => PAGE_MAP[p].label).join(', ')}]`
        await execAsync(`git -C "${repoRoot}" commit -m "${msg}" || true`)
        gitResult = { success: true, output: 'Commitado localmente (sem push automático)' }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        gitResult = { success: false, output: msg }
      }
    }

    // Optional: trigger Vercel deploy webhook
    let deployResult: { triggered: boolean; message: string } | null = null
    if (deploy) {
      const webhookUrl = process.env.VERCEL_DEPLOY_WEBHOOK_URL
      if (webhookUrl) {
        try {
          const resp = await fetch(webhookUrl, { method: 'POST' })
          deployResult = { triggered: resp.ok, message: resp.ok ? 'Deploy para produção iniciado' : `Webhook falhou: ${resp.status}` }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err)
          deployResult = { triggered: false, message: `Erro no webhook: ${msg}` }
        }
      } else {
        deployResult = { triggered: false, message: 'VERCEL_DEPLOY_WEBHOOK_URL não configurado' }
      }
    }

    return NextResponse.json({ results, gitResult, deployResult })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ─── GET /api/admin/sync-pages — list available pages ─────────────────────────
export async function GET() {
  return NextResponse.json({
    pages: Object.entries(PAGE_MAP).map(([key, val]) => ({
      key,
      label: val.label,
      adminPath: val.adminPath,
      medicalPath: val.medicalPath,
    }))
  })
}
