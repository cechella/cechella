// Regras de publicidade médica aplicadas ao texto do VERVE ANTES de qualquer aprovação. Filtro determinístico e conservador:
// ele só barra; quem aprova continua sendo o CEO. Não substitui revisão médica/jurídica.
// ESCOPO (decisão do CEO, 22/10/2026): SOMENTE conteúdo educativo sobre menopausa e saúde da mulher. Fora do escopo, e barrado pelo filtro:
// implantes hormonais, "chip da beleza", esteroides anabolizantes e seus nomes, tratamento específico e linguagem de venda.
export const ESCOPO_PT =
  'ESCOPO (obrigatório): somente conteúdo EDUCATIVO sobre menopausa e saúde da mulher (o que é, o que causa, quando procurar um médico). ' +
  'Terapia/reposição hormonal só pode ser citada de forma educativa (o que é, que existe, que a indicação é individual e médica), sem indicar para o leitor, sem dose, marca, medicamento específico nem promessa. ' +
  'É proibido falar de implante hormonal, "chip da beleza", esteroides ou anabolizantes, indicar tratamento específico, vender consulta ou criar urgência.'

// Assinatura obrigatória em toda legenda (CRM informado pelo CEO em 22/10/2026). Falta o RQE: só entra quando o CEO informar; nunca inventado.
export const ASSINATURA_MEDICO = 'Dr. Vinícius Cechella · CRM 38765/SC'
export function comAssinatura(legenda: string): string {
  const t = legenda.trim()
  return t.includes('CRM 38765') ? t : `${t}\n\n${ASSINATURA_MEDICO}`
}

export const COMPLIANCE_RULES_PT =
  ESCOPO_PT + ' REGRAS DE PUBLICIDADE MÉDICA (obrigatórias): não prometer resultado nem cura; não usar "garantido", "definitivo", "100%", "milagre"; ' +
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
  // Fora do escopo educativo (CEO, 22/10/2026):
  { re: /\bimplantes?\b|\bchips?\s+(?:da\s+beleza|hormonais?)\b/i, why: 'fora do escopo: implante hormonal' },
  { re: /\b(?:esteroides?|anabolizantes?|anab[óo]licos?)\b|\b(?:gestrinona|oxandrolona|trembolona|nandrolona|stanozolol|durateston)\b/i, why: 'fora do escopo: esteroide anabolizante' },
  { re: /\bvagas?\s+(?:limitadas?|restantes?)\b|[uú]ltimas?\s+vagas?\b|\bgaranta\s+(?:j[aá]|sua)|\baproveite\b|\bofertas?\b|\bcorra\b/i, why: 'linguagem de venda' },
]

export function complianceViolations(text: string): string[] {
  const found = new Set<string>()
  for (const { re, why } of BANNED) if (re.test(text)) found.add(why)
  return Array.from(found)
}
