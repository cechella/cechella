'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

let sb: ReturnType<typeof createBrowserClient> | null = null
function getSupabase() {
  if (!sb) sb = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  return sb
}

export default function SalesLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = getSupabase()
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password })
    if (authErr) {
      setError('Email ou senha incorretos.')
      setLoading(false)
      return
    }
    router.replace('/sales/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-2xl font-bold bg-gradient-to-r from-[#8B5CF6] to-[#C084FC] bg-clip-text text-transparent mb-1">
            Cechella
          </div>
          <div className="text-sm text-[#71717A]">Área do Consultor</div>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#111113] border border-[#27272A] rounded-2xl p-6 space-y-4">
          <h2 className="text-white font-semibold text-base">Entrar</h2>

          <div className="space-y-1">
            <label className="text-xs font-medium text-[#A1A1AA]">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#52525B] focus:outline-none focus:border-[#7C3AED] transition-colors"
              placeholder="seu@email.com"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-[#A1A1AA]">Senha</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#52525B] focus:outline-none focus:border-[#7C3AED] transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 text-white font-medium py-2.5 rounded-xl text-sm transition-colors"
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-xs text-[#52525B] mt-6">
          Acesso restrito a consultores cadastrados.
        </p>
      </div>
    </div>
  )
}
