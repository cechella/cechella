import test from 'node:test'
import assert from 'node:assert/strict'
import { avaliar, correcaoPara, fotoConferida, resumoQa, validarLaudo, MAX_TENTATIVAS, type Laudo, type QaEntrada } from './foto-qa.ts'

const FAIXA = { min: 40, max: 60 }
const laudo = (o: Partial<Laudo> = {}): Laudo => ({ idade_aparente_min: 45, idade_aparente_max: 55, genero_apresentado: 'feminino', pessoas: 1, texto_ou_marca_dagua: false, deformidade_visivel: false, conteudo_improprio: false, observacao: '', ...o })

test('mulher de 45 a 55 aparentes passa na faixa 40 a 60', () => {
  assert.deepEqual(avaliar(laudo(), 'mulher_35_50', FAIXA), { ok: true, falhas: [] })
})

test('jovem demais reprova com o motivo e a idade aparente (o caso do carrossel de menopausa)', () => {
  const r = avaliar(laudo({ idade_aparente_min: 25, idade_aparente_max: 33 }), 'mulher_35_50', FAIXA)
  assert.equal(r.ok, false)
  assert.equal(r.falhas[0].codigo, 'idade_menor')
  assert.match(r.falhas[0].motivo, /~29 anos, abaixo da faixa 40 a 60/)
})

test('velha demais, gênero trocado, sem pessoa, texto, deformação e conteúdo impróprio reprovam', () => {
  assert.equal(avaliar(laudo({ idade_aparente_min: 70, idade_aparente_max: 78 }), 'mulher_35_50', FAIXA).falhas[0].codigo, 'idade_maior')
  assert.equal(avaliar(laudo({ genero_apresentado: 'masculino' }), 'mulher_35_50', FAIXA).falhas[0].codigo, 'genero')
  assert.equal(avaliar(laudo({ genero_apresentado: 'feminino' }), 'homem_40_60', FAIXA).falhas[0].codigo, 'genero')
  assert.equal(avaliar(laudo({ pessoas: 0 }), 'mulher_35_50', FAIXA).falhas[0].codigo, 'sem_pessoa')
  assert.equal(avaliar(laudo({ texto_ou_marca_dagua: true }), 'mulher_35_50', FAIXA).falhas[0].codigo, 'texto')
  assert.equal(avaliar(laudo({ deformidade_visivel: true }), 'mulher_35_50', FAIXA).falhas[0].codigo, 'deformidade')
  assert.equal(avaliar(laudo({ conteudo_improprio: true }), 'mulher_35_50', FAIXA).falhas[0].codigo, 'improprio')
})

test('a tolerância de 2 anos nas bordas e "indefinido" no gênero não reprovam sozinhos', () => {
  assert.equal(avaliar(laudo({ idade_aparente_min: 36, idade_aparente_max: 40 }), 'mulher_35_50', FAIXA).ok, true)   // meio 38 = 40 - 2
  assert.equal(avaliar(laudo({ genero_apresentado: 'indefinido' }), 'mulher_35_50', FAIXA).ok, true)
})

test('laudo malformado do modelo é recusado (nunca aprova por omissão)', () => {
  assert.equal(validarLaudo(null), null)
  assert.equal(validarLaudo({ idade_aparente_min: 50 }), null)
  assert.equal(validarLaudo({ ...laudo(), idade_aparente_min: 60, idade_aparente_max: 40 }), null)
  assert.equal(validarLaudo({ ...laudo(), genero_apresentado: 'x' }), null)
  assert.ok(validarLaudo(laudo()))
})

test('a correção diz exatamente o que mudar na próxima foto', () => {
  const c = correcaoPara(avaliar(laudo({ idade_aparente_min: 25, idade_aparente_max: 33, texto_ou_marca_dagua: true }), 'mulher_35_50', FAIXA).falhas, 'mulher_35_50', FAIXA)
  assert.match(c, /woman must clearly look around 53 years old/)
  assert.match(c, /no text, letters, logos or watermarks/)
})

test('reprovou, refez com a correção e passou: registra o motivo e a ação', async () => {
  const log: QaEntrada[] = []
  const instrucoes: Array<string | undefined> = []
  const laudos = [laudo({ idade_aparente_min: 25, idade_aparente_max: 31 }), laudo()]
  const url = await fotoConferida({
    slide: 2, persona: 'mulher_35_50', faixa: FAIXA, instrucao: 'warm light', log,
    gerar: async i => { instrucoes.push(i); return 'https://img/' + instrucoes.length },
    ler: async () => laudos.shift()!,
  })
  assert.equal(url, 'https://img/2')
  assert.equal(instrucoes[0], 'warm light')
  assert.match(instrucoes[1]!, /warm light; the woman must clearly look around/)
  assert.deepEqual(log.map(e => e.ok), [false, true])
  assert.match(log[0].acao!, /^refeita:/)
  const r = resumoQa(log)
  assert.equal(r.refeitas.length, 1); assert.equal(r.reprovadas.length, 0); assert.match(r.refeitas[0].motivo, /abaixo da faixa/)
})

test('esgotou as tentativas: devolve vazio (falha fechada) e conta como reprovada', async () => {
  const log: QaEntrada[] = []
  let geradas = 0
  const url = await fotoConferida({
    slide: 1, persona: 'mulher_35_50', faixa: FAIXA, log,
    gerar: async () => { geradas++; return 'https://img/x' },
    ler: async () => laudo({ idade_aparente_min: 22, idade_aparente_max: 28 }),
  })
  assert.equal(url, ''); assert.equal(geradas, MAX_TENTATIVAS)
  const r = resumoQa(log); assert.equal(r.reprovadas.length, 1); assert.equal(r.reprovadas[0].slide, 1)
})

test('sem laudo (leitura falhou) a foto NUNCA passa sem conferir', async () => {
  const log: QaEntrada[] = []
  const url = await fotoConferida({
    slide: 3, persona: 'mulher_35_50', faixa: FAIXA, log,
    gerar: async () => 'https://img/y',
    ler: async () => { throw new Error('qa_indisponivel_sem_chave') },
  })
  assert.equal(url, ''); assert.ok(log.every(e => !e.ok && /leitura_falhou/.test(e.acao ?? '')))
})
