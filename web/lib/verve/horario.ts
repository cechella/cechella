// O banco devolve o horário em UTC ("2026-10-26T18:00:00+00:00"); o CEO pensa em horário de Brasília. Convertemos só na exibição.
// (A publicação compara instantes, então o horário real do post nunca muda; só o que aparece na tela.)
export function emBrasilia(iso: string | undefined | null): { data: string; hora: string } {
  const t = iso ? Date.parse(iso) : NaN
  if (Number.isNaN(t)) return { data: '', hora: '' }
  const s = new Date(t).toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo', hour12: false })   // "2026-10-26 15:00:00"
  return { data: s.slice(0, 10), hora: s.slice(11, 16) }
}
