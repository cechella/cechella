'use client'

import { useEffect, useState, useCallback } from 'react'

interface RealtimeConfig {
  profile: string
  model: string
  voice: string
  vad_type: string
  vad_threshold: number
  vad_prefix_padding_ms: number
  vad_silence_duration_ms: number
  vad_eagerness: string
  transcription_model: string
  noise_reduction: string
  max_output_tokens: string
  reasoning_effort: string
  instructions: string
  _source?: string
}

const VOICES = ['marin', 'coral', 'ash', 'ballad', 'sage', 'verse', 'alloy', 'echo', 'shimmer']
const MODELS = ['gpt-realtime-2.1', 'gpt-realtime-2', 'gpt-realtime']
const TRANSCRIPT_MODELS = ['gpt-realtime-whisper', 'gpt-4o-mini-transcribe', 'whisper-1']
const NOISE_OPTIONS = ['far_field', 'near_field', 'none']
const REASONING_OPTIONS = ['low', 'medium', 'high']

function Slider({ label, value, min, max, step = 1, unit = '', onChange }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string
  onChange: (v: number) => void
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: '#A1A1AA' }}>{label}</span>
        <span style={{ fontSize: 12, color: '#F4F4F5', fontVariantNumeric: 'tabular-nums' }}>{unit === 'ms' ? `${value} ms` : value}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: '#8B5CF6', cursor: 'pointer' }}
      />
    </div>
  )
}

function Select({ label, value, options, onChange }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, color: '#A1A1AA', marginBottom: 6 }}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width: '100%', background: '#18181B', border: '1px solid #27272A', borderRadius: 8, padding: '7px 10px', fontSize: 13, color: '#F4F4F5', outline: 'none', cursor: 'pointer' }}
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function SegmentedControl({ label, value, options, onChange }: {
  label: string; value: string; options: { id: string; label: string }[]; onChange: (v: string) => void
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, color: '#A1A1AA', marginBottom: 8 }}>{label}</label>
      <div style={{ display: 'flex', gap: 0, background: '#18181B', border: '1px solid #27272A', borderRadius: 8, overflow: 'hidden' }}>
        {options.map(opt => (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            style={{
              flex: 1, padding: '6px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
              background: value === opt.id ? '#27272A' : 'transparent',
              color: value === opt.id ? '#F4F4F5' : '#71717A',
              transition: 'all 0.15s',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function RealtimeConfigPanel({ profile, isGold }: { profile: 'gold' | 'controller'; isGold: boolean }) {
  const [cfg, setCfg] = useState<RealtimeConfig | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [promptModalOpen, setPromptModalOpen] = useState(false)

  const accent = isGold ? '#F59E0B' : '#3B82F6'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/admin/ana-master/realtime-config?profile=${profile}`)
      const data = await r.json()
      setCfg(data)
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!cfg) return
    setSaving(true)
    setSaveError(false)
    try {
      const r = await fetch('/api/admin/ana-master/realtime-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      })
      if (!r.ok) throw new Error('erro')
      setCfg(prev => prev ? { ...prev, _source: 'db' } : prev)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setSaveError(true)
      setTimeout(() => setSaveError(false), 4000)
    } finally {
      setSaving(false)
    }
  }

  const set = (key: keyof RealtimeConfig, value: any) =>
    setCfg(prev => prev ? { ...prev, [key]: value } : prev)

  if (loading || !cfg) {
    return (
      <div style={{ padding: 20, color: '#71717A', fontSize: 13 }}>
        Carregando configuração...
      </div>
    )
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '16px 14px' }}>

      {/* Save toast */}
      {(saved || saveError) && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, padding: '12px 24px', borderRadius: 10,
          background: saved ? '#16A34A' : '#DC2626',
          color: '#fff', fontSize: 14, fontWeight: 700,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          pointerEvents: 'none',
        }}>
          {saved ? '✓ Prompt salvo com sucesso!' : '✕ Erro ao salvar — tente novamente'}
        </div>
      )}

      {/* Source indicator */}
      <div style={{ marginBottom: 16, fontSize: 10, color: '#52525B', textAlign: 'right' }}>
        {cfg._source === 'db' ? '✓ salvo no banco' : '⚙ padrão do código'}
      </div>

      {/* Prompt modal */}
      {promptModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 32px' }}
          onClick={e => { if (e.target === e.currentTarget) setPromptModalOpen(false) }}
        >
          <div style={{ background: '#111113', border: '1px solid #303033', borderRadius: 12, width: '100%', maxWidth: 900, height: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 40px 120px rgba(0,0,0,0.95)' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #27272A', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#F4F4F5' }}>System Instructions</span>
                <span style={{ marginLeft: 12, fontSize: 12, color: '#52525B' }}>{cfg.profile} · {cfg.instructions.length} chars</span>
              </div>
              <button onClick={() => setPromptModalOpen(false)} style={{ background: '#27272A', border: 'none', cursor: 'pointer', color: '#A1A1AA', fontSize: 18, lineHeight: 1, width: 32, height: 32, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <textarea
              value={cfg.instructions}
              onChange={e => set('instructions', e.target.value)}
              placeholder="Enter system instructions…"
              style={{ flex: 1, background: 'transparent', border: 'none', padding: '20px 24px', fontSize: 14, color: '#E4E4E7', outline: 'none', resize: 'none', fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace', lineHeight: 1.75, overflowY: 'auto', letterSpacing: '0.01em' }}
            />
            <div style={{ padding: '14px 24px', borderTop: '1px solid #27272A', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <span style={{ fontSize: 11, color: '#3F3F46' }}>{cfg.instructions.split('\n').length} lines</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setPromptModalOpen(false)} style={{ padding: '8px 18px', background: 'transparent', border: '1px solid #3F3F46', borderRadius: 7, color: '#71717A', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={async () => { await save(); setPromptModalOpen(false) }} style={{ padding: '8px 20px', background: accent, border: 'none', borderRadius: 7, color: isGold ? '#000' : '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.02em' }}>{saving ? 'Salvando…' : 'Salvar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Instructions */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <label style={{ fontSize: 12, color: '#A1A1AA' }}>System Instructions</label>
          <button onClick={() => setPromptModalOpen(true)} title="Editar em tela cheia" style={{ background: 'transparent', border: '1px solid #27272A', borderRadius: 5, cursor: 'pointer', color: '#71717A', fontSize: 11, padding: '2px 7px' }}>⤢ Expandir</button>
        </div>
        <textarea
          value={cfg.instructions}
          onChange={e => set('instructions', e.target.value)}
          rows={6}
          style={{ width: '100%', background: '#18181B', border: '1px solid #27272A', borderRadius: 8, padding: '8px 10px', fontSize: 11, color: '#F4F4F5', outline: 'none', resize: 'vertical', fontFamily: 'monospace', lineHeight: 1.5, boxSizing: 'border-box' }}
        />
      </div>

      {/* Voice */}
      <Select label="Voice" value={cfg.voice} options={VOICES} onChange={v => set('voice', v)} />

      {/* VAD */}
      <SegmentedControl
        label="Automatic turn detection"
        value={cfg.vad_type === 'server_vad' ? 'normal' : cfg.vad_type === 'semantic_vad' ? 'semantic' : 'disabled'}
        options={[{ id: 'normal', label: 'Normal' }, { id: 'semantic', label: 'Semantic' }, { id: 'disabled', label: 'Disabled' }]}
        onChange={v => set('vad_type', v === 'normal' ? 'server_vad' : v === 'semantic' ? 'semantic_vad' : 'disabled')}
      />

      {cfg.vad_type === 'server_vad' && (
        <>
          <Slider label="Threshold" value={cfg.vad_threshold} min={0} max={1} step={0.01} onChange={v => set('vad_threshold', v)} />
          <Slider label="Prefix padding" value={cfg.vad_prefix_padding_ms} min={0} max={2000} step={10} unit="ms" onChange={v => set('vad_prefix_padding_ms', v)} />
          <Slider label="Silence duration" value={cfg.vad_silence_duration_ms} min={100} max={3000} step={10} unit="ms" onChange={v => set('vad_silence_duration_ms', v)} />
        </>
      )}

      {cfg.vad_type === 'semantic_vad' && (
        <SegmentedControl
          label="Eagerness"
          value={cfg.vad_eagerness}
          options={[{ id: 'low', label: 'Low' }, { id: 'medium', label: 'Medium' }, { id: 'high', label: 'High' }, { id: 'auto', label: 'Auto' }]}
          onChange={v => set('vad_eagerness', v)}
        />
      )}

      {/* Model */}
      <Select label="Model" value={cfg.model} options={MODELS} onChange={v => set('model', v)} />

      {/* Transcript model */}
      <Select label="User transcript model" value={cfg.transcription_model} options={TRANSCRIPT_MODELS} onChange={v => set('transcription_model', v)} />

      {/* Noise reduction */}
      <Select label="Noise reduction" value={cfg.noise_reduction} options={NOISE_OPTIONS} onChange={v => set('noise_reduction', v)} />

      {/* Max tokens */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 12, color: '#A1A1AA', marginBottom: 8 }}>Max tokens</label>
        <div style={{ display: 'flex', gap: 0, background: '#18181B', border: '1px solid #27272A', borderRadius: 8, overflow: 'hidden' }}>
          {['inf', 'custom'].map(opt => (
            <button
              key={opt}
              onClick={() => set('max_output_tokens', opt === 'inf' ? 'inf' : '4096')}
              style={{
                flex: 1, padding: '6px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                background: (opt === 'inf' ? cfg.max_output_tokens === 'inf' : cfg.max_output_tokens !== 'inf') ? '#27272A' : 'transparent',
                color: (opt === 'inf' ? cfg.max_output_tokens === 'inf' : cfg.max_output_tokens !== 'inf') ? '#F4F4F5' : '#71717A',
                transition: 'all 0.15s',
              }}
            >
              {opt === 'inf' ? 'Unlimited' : 'Custom'}
            </button>
          ))}
        </div>
        {cfg.max_output_tokens !== 'inf' && (
          <input
            type="number"
            value={cfg.max_output_tokens}
            onChange={e => set('max_output_tokens', e.target.value)}
            style={{ marginTop: 8, width: '100%', background: '#18181B', border: '1px solid #27272A', borderRadius: 8, padding: '7px 10px', fontSize: 13, color: '#F4F4F5', outline: 'none', boxSizing: 'border-box' }}
          />
        )}
      </div>

      {/* Reasoning effort */}
      <SegmentedControl
        label="Reasoning effort"
        value={cfg.reasoning_effort}
        options={REASONING_OPTIONS.map(o => ({ id: o, label: o.charAt(0).toUpperCase() + o.slice(1) }))}
        onChange={v => set('reasoning_effort', v)}
      />

      {/* Save button */}
      <button
        onClick={save}
        disabled={saving}
        style={{
          width: '100%', padding: '10px 0', marginTop: 8, borderRadius: 9, border: 'none',
          background: saved ? '#22C55E' : accent,
          color: isGold ? '#000' : '#fff',
          fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.7 : 1, transition: 'all 0.2s',
        }}
      >
        {saved ? '✓ Salvo!' : saving ? 'Salvando...' : 'Salvar configuração'}
      </button>
      <p style={{ margin: '8px 0 0', fontSize: 10, color: '#52525B', textAlign: 'center' }}>
        A próxima sessão já usa esta configuração
      </p>
    </div>
  )
}
