// Regras de publicidade médica aplicadas ao texto do VERVE ANTES de qualquer aprovação. Filtro determinístico e conservador:
// ele só barra; quem aprova continua sendo o CEO. Não substitui revisão médica/jurídica.
export const COMPLIANCE_RULES_PT =
  'REGRAS DE PUBLICIDADE MÉDICA (obrigatórias): não prometer resultado nem cura; não usar "garantido", "definitivo", "100%", "milagre"; ' +
  'não usar antes e depois nem depoimento de paciente; não divulgar preço; não diagnosticar nem indicar tratamento para casos individuais; ' +
  'linguagem educativa, baseada em evidência, sem sensacionalismo; terminar convidando a consultar um médico para avaliação individual.'

const BANNED: { re: RegExp; why: string }[] = [
  { re: /\b(cura|curar|curamos|curado|curada)\b/i, why: 'promessa de cura' },
  { re: /\bgarantid[oa]s?\b|\bgarantimos\b|\bgarantia de resultado\b/i, why: 'promessa de resultado' },
  { re: /\bdefinitiv[oa]s?\b/i, why: 'resultado definitivo' },
  { re: /\bmilagr\w+/i, why: 'sensacionalismo' },
  { re: /\b100\s?%/i, why: 'percentual absoluto' },
  { re: /\bantes e depois\b|\bantes\/depois\b/i, why: 'antes e depois' },
  { re: /\bsem (?:nenhum )?(?:efeitos? (?:colaterais?|adversos?)|riscos?)\b/i, why: 'omite riscos' },
  { re: /\bR\$\s?\d|\b\d+\s?reais\b|\bpromo[çc][ãa]o\b|\bdesconto\b/i, why: 'preço ou promoção' },
]

export function complianceViolations(text: string): string[] {
  const found = new Set<string>()
  for (const { re, why } of BANNED) if (re.test(text)) found.add(why)
  return Array.from(found)
}
