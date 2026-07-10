import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET() {
  const { data, error } = await supabase
    .from('pagamentos_recorrentes')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ assinaturas: [], erro: error.message })
  }

  const rows = data || []

  // Buscar nomes dos leads
  const telefones = rows.map(r => r.lead_telefone).filter(Boolean)
  const nomesRes = telefones.length > 0
    ? await supabase.from('leads').select('telefone, nome').in('telefone', telefones)
    : { data: [] }

  const nomesMap: Record<string, string> = {}
  ;(nomesRes.data || []).forEach((l: any) => { nomesMap[l.telefone] = l.nome })

  const assinaturas = rows.map(r => ({
    ...r,
    nome: nomesMap[r.lead_telefone] || null,
  }))

  return NextResponse.json({ assinaturas })
}
