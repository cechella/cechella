'use client'

import { useEffect, useState, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'

let sb: ReturnType<typeof createBrowserClient> | null = null
function getSupabase() {
  if (!sb) sb = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  return sb
}

type Perfil = {
  id: string; nome: string; email: string; cargo?: string; telefone?: string
  cpf?: string; cnpj?: string; razao_social?: string; banco_dados?: string
}

function getInitials(nome: string) {
  return nome.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#71717A] uppercase tracking-[.6px] mb-4">
      {icon}{children}
    </div>
  )
}

function Field({
  label, value, onChange, type = 'text', readonly = false, hint,
}: {
  label: string; value: string; onChange?: (v: string) => void
  type?: string; readonly?: boolean; hint?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold text-[#71717A]">{label}</label>
      <input
        type={type}
        value={value}
        readOnly={readonly}
        onChange={e => onChange?.(e.target.value)}
        className={`bg-[#18181B] border rounded-lg px-3 py-2 text-[13px] text-[#FAFAFA] font-inherit outline-none transition-colors ${
          readonly
            ? 'border-[#27272A] text-[#52525B] cursor-not-allowed'
            : 'border-[#27272A] focus:border-[#7C3AED]'
        }`}
      />
      {hint && <span className="text-[10px] text-[#52525B]">{hint}</span>}
    </div>
  )
}

export default function PerfilPage() {
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // form state
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [cpf, setCpf] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [razaoSocial, setRazaoSocial] = useState('')
  const [bancoDados, setBancoDados] = useState('')
  const [pwdAtual, setPwdAtual] = useState('')
  const [pwdNova, setPwdNova] = useState('')
  const [pwdConf, setPwdConf] = useState('')

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    fetch('/api/sales/perfil')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setPerfil(data)
          setNome(data.nome ?? '')
          setTelefone(data.telefone ?? '')
          setCpf(data.cpf ?? '')
          setCnpj(data.cnpj ?? '')
          setRazaoSocial(data.razao_social ?? '')
          setBancoDados(data.banco_dados ?? '')
        }
        setLoading(false)
      })
  }, [])

  async function savePessoal() {
    setSaving('pessoal')
    const res = await fetch('/api/sales/perfil', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, telefone, cpf }),
    })
    setSaving(null)
    if (res.ok) showToast('Dados pessoais salvos ✓')
    else showToast('Erro ao salvar', false)
  }

  async function saveEmpresa() {
    setSaving('empresa')
    const res = await fetch('/api/sales/perfil', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cnpj, razao_social: razaoSocial, banco_dados: bancoDados }),
    })
    setSaving(null)
    if (res.ok) showToast('Dados da empresa salvos ✓')
    else showToast('Erro ao salvar', false)
  }

  async function saveSenha() {
    if (pwdNova !== pwdConf) { showToast('As senhas não coincidem', false); return }
    if (pwdNova.length < 8) { showToast('Senha deve ter mínimo 8 caracteres', false); return }
    setSaving('senha')
    const supabase = getSupabase()
    const { error } = await supabase.auth.updateUser({ password: pwdNova })
    setSaving(null)
    if (error) showToast(error.message, false)
    else {
      showToast('Senha alterada com sucesso ✓')
      setPwdAtual(''); setPwdNova(''); setPwdConf('')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const cpfLocked = !!(perfil?.cpf)

  return (
    <>
      <div className="grid grid-cols-[260px_1fr] gap-4 items-start">
        {/* Card lateral */}
        <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-6 text-center">
          <div className="relative inline-block mb-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#06B6D4] flex items-center justify-center text-[26px] font-black text-white mx-auto">
              {perfil ? getInitials(perfil.nome) : '–'}
            </div>
            <button className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#7C3AED] border-2 border-[#111113] flex items-center justify-center text-[12px] text-white cursor-pointer hover:bg-[#6D28D9] transition-colors"
              title="Alterar foto">✏️</button>
          </div>
          <p className="text-[15px] font-bold text-[#FAFAFA] mb-1">{perfil?.nome}</p>
          <p className="text-[12px] text-[#71717A] mb-3">{perfil?.cargo ?? 'Consultor'} · Nível 2</p>
          <div className="h-1 bg-[#27272A] rounded-full mb-1.5 overflow-hidden">
            <div className="h-full w-[90%] rounded-full bg-gradient-to-r from-[#7C3AED] to-[#06B6D4]" />
          </div>
          <p className="text-[10px] text-[#52525B] mb-4">950 XP · 50 para nível 3</p>
          <div className="flex justify-center gap-2 mb-4">
            {['🎯','💬','🔥'].map(e => (
              <span key={e} className="text-[20px]">{e}</span>
            ))}
          </div>
          <div className="h-px bg-[#27272A] mb-4" />
          <div className="flex justify-around">
            <div><p className="text-[15px] font-bold text-[#FAFAFA]">8</p><p className="text-[10px] text-[#71717A]">Conversões</p></div>
            <div><p className="text-[15px] font-bold text-[#10B981]">R$ 4.800</p><p className="text-[10px] text-[#71717A]">Comissão</p></div>
            <div><p className="text-[15px] font-bold text-[#F59E0B]">🔥 12</p><p className="text-[10px] text-[#71717A]">Streak</p></div>
          </div>
        </div>

        {/* Formulários */}
        <div className="flex flex-col gap-3">
          {/* Dados pessoais */}
          <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-5">
            <SectionTitle icon={
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4">
                <circle cx="6.5" cy="4" r="2.5"/><path d="M1 11.5c0-3.038 2.462-5.5 5.5-5.5S12 8.462 12 11.5" strokeLinecap="round"/>
              </svg>
            }>Dados Pessoais</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nome completo" value={nome} onChange={setNome} />
              <Field label="E-mail" value={perfil?.email ?? ''} readonly hint="Altere pelo admin" />
              <Field label="Telefone / WhatsApp" value={telefone} onChange={setTelefone} />
              <Field label="CPF" value={cpf} onChange={cpfLocked ? undefined : setCpf} readonly={cpfLocked}
                hint={cpfLocked ? 'CPF não pode ser alterado após cadastrado. Contate o admin.' : 'Preencha uma vez — não poderá alterar depois.'} />
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={savePessoal} disabled={saving === 'pessoal'}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white text-[13px] font-semibold disabled:opacity-60 hover:opacity-90 transition-opacity">
                {saving === 'pessoal' ? 'Salvando…' : 'Salvar dados pessoais'}
              </button>
            </div>
          </div>

          {/* Dados da empresa */}
          <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-5">
            <SectionTitle icon={
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4">
                <rect x="1" y="3" width="11" height="9" rx="1.5"/><path d="M4 3V2a2 2 0 0 1 5 0v1" strokeLinecap="round"/>
              </svg>
            }>Dados da Empresa</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Razão social" value={razaoSocial} onChange={setRazaoSocial} />
              <Field label="CNPJ" value={cnpj} onChange={setCnpj} />
              <div className="col-span-2">
                <Field label="Banco para recebimento de comissões" value={bancoDados} onChange={setBancoDados} />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={saveEmpresa} disabled={saving === 'empresa'}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white text-[13px] font-semibold disabled:opacity-60 hover:opacity-90 transition-opacity">
                {saving === 'empresa' ? 'Salvando…' : 'Salvar dados da empresa'}
              </button>
            </div>
          </div>

          {/* Segurança */}
          <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-5">
            <SectionTitle icon={
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4">
                <rect x="3" y="5.5" width="7" height="6" rx="1"/><path d="M4.5 5.5V4a2 2 0 0 1 4 0v1.5" strokeLinecap="round"/>
              </svg>
            }>Segurança</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-[#71717A]">Senha atual</label>
                <input type="password" value={pwdAtual} onChange={e => setPwdAtual(e.target.value)} placeholder="••••••••"
                  className="bg-[#18181B] border border-[#27272A] focus:border-[#7C3AED] rounded-lg px-3 py-2 text-[13px] text-[#FAFAFA] outline-none transition-colors" />
              </div>
              <div />
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-[#71717A]">Nova senha</label>
                <input type="password" value={pwdNova} onChange={e => setPwdNova(e.target.value)} placeholder="Mínimo 8 caracteres"
                  className="bg-[#18181B] border border-[#27272A] focus:border-[#7C3AED] rounded-lg px-3 py-2 text-[13px] text-[#FAFAFA] outline-none transition-colors" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-[#71717A]">Confirmar nova senha</label>
                <input type="password" value={pwdConf} onChange={e => setPwdConf(e.target.value)} placeholder="Repita a nova senha"
                  className="bg-[#18181B] border border-[#27272A] focus:border-[#7C3AED] rounded-lg px-3 py-2 text-[13px] text-[#FAFAFA] outline-none transition-colors" />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={saveSenha} disabled={saving === 'senha'}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white text-[13px] font-semibold disabled:opacity-60 hover:opacity-90 transition-opacity">
                {saving === 'senha' ? 'Alterando…' : 'Alterar senha'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 text-white text-xs font-medium px-4 py-2.5 rounded-xl shadow-2xl border ${
          toast.ok ? 'bg-[#111113] border-[#10B981]/40' : 'bg-[#111113] border-[#EF4444]/40'
        }`}>
          {toast.msg}
        </div>
      )}
    </>
  )
}
