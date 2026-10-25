import test from 'node:test'
import assert from 'node:assert/strict'
import { avaliar, correcaoPara, fotoConferida, resumoQa, validarLaudo, diagnosticarLaudo, leitorClaude, MAX_TENTATIVAS, LIMIAR_ATRATIVO, type Laudo, type QaEntrada, type ClienteMensagens } from './foto-qa.ts'

const FAIXA = { min: 40, max: 60 }
const laudo = (o: Partial<Laudo> = {}): Laudo => ({ idade_aparente_min: 45, idade_aparente_max: 55, genero_apresentado: 'feminino', pessoas: 1, texto_ou_marca_dagua: false, deformidade_visivel: false, conteudo_improprio: false, enquadramento_ok: true, atrativo: 5, mesma_pessoa: null, observacao: '', ...o })

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

test('o laudo aceita variações de FORMA do modelo (texto numérico, "true", gênero em outras palavras) e diz QUAL campo falhou', () => {
  const ok = validarLaudo({ idade_aparente_min: '45', idade_aparente_max: '55', genero_apresentado: 'Mulher', pessoas: '1', texto_ou_marca_dagua: 'false', deformidade_visivel: false, conteudo_improprio: 'false', enquadramento_ok: 'true', atrativo: '4' })
  assert.deepEqual(ok && [ok.idade_aparente_min, ok.genero_apresentado, ok.pessoas, ok.texto_ou_marca_dagua], [45, 'feminino', 1, false])
  assert.equal(diagnosticarLaudo({ ...laudo(), idade_aparente_min: null }).campo, 'idade_aparente_min')
  assert.equal(diagnosticarLaudo({ ...laudo(), genero_apresentado: 'banana' }).campo, 'genero_apresentado')
  assert.equal(diagnosticarLaudo({ ...laudo(), deformidade_visivel: 'talvez' }).campo, 'deformidade_visivel')
  assert.equal(diagnosticarLaudo({ ...laudo(), idade_aparente_min: 60, idade_aparente_max: 40 }).campo, 'faixa_de_idade')
  assert.equal(diagnosticarLaudo(null).campo, 'objeto')
})

const cliente = (content: Array<{ type: string; input?: unknown; text?: string }>, vistos: unknown[] = []): ClienteMensagens => ({ messages: { create: async (a: unknown) => { vistos.push(a); return { content } } } })

test('o leitor obriga a resposta pela ferramenta (estrutura garantida) e devolve o laudo', async () => {
  const vistos: any[] = []
  const l = await leitorClaude(cliente([{ type: 'tool_use', input: laudo({ idade_aparente_min: 50, idade_aparente_max: 58 }) }], vistos))('https://img/x')
  assert.equal(l.idade_aparente_min, 50)
  assert.deepEqual(vistos[0].tool_choice, { type: 'tool', name: 'registrar_laudo' })
  assert.equal(vistos[0].tools[0].name, 'registrar_laudo')
  assert.equal(vistos[0].messages[0].content[0].source.url, 'https://img/x')
})

test('o leitor nunca aprova sem laudo: recusa em prosa e laudo inválido viram erro com o motivo', async () => {
  await assert.rejects(leitorClaude(cliente([{ type: 'text', text: 'Não posso estimar a idade de pessoas.' }]))('https://img/x'), /qa_sem_laudo:Não posso estimar/)
  await assert.rejects(leitorClaude(cliente([{ type: 'tool_use', input: { ...laudo(), pessoas: undefined } }]))('https://img/x'), /qa_laudo_invalido:pessoas/)
})

test('foto pouco atraente reprova mesmo estando na idade certa (sensibilidade crítica do VERVE)', () => {
  const r = avaliar(laudo({ atrativo: 2, observacao: 'rosto duro e abatido' }), 'mulher_35_50', FAIXA)
  assert.equal(r.ok, false); assert.equal(r.falhas[0].codigo, 'pouco_atrativa')
  assert.match(r.falhas[0].motivo, /nota 2 de 5, mínimo 4\): rosto duro e abatido/)
  assert.equal(avaliar(laudo({ atrativo: LIMIAR_ATRATIVO }), 'mulher_35_50', FAIXA).ok, true)
  assert.match(correcaoPara(r.falhas, 'mulher_35_50', FAIXA), /more beautiful, flattering and warm/)
})

test('com referência, outra pessoa reprova (uma personagem só); sem referência o campo é ignorado', () => {
  const l = laudo({ mesma_pessoa: false })
  const com = avaliar(l, 'mulher_35_50', FAIXA, true)
  assert.equal(com.ok, false); assert.equal(com.falhas[0].codigo, 'outra_pessoa')
  assert.match(correcaoPara(com.falhas, 'mulher_35_50', FAIXA), /exactly the same woman as in the reference/)
  assert.equal(avaliar(l, 'mulher_35_50', FAIXA, false).ok, true)
  assert.equal(avaliar(laudo({ mesma_pessoa: true }), 'mulher_35_50', FAIXA, true).ok, true)
  assert.equal(diagnosticarLaudo({ ...laudo(), atrativo: 9 }).campo, 'atrativo')
  assert.equal(diagnosticarLaudo({ ...laudo(), mesma_pessoa: 'talvez' }).campo, 'mesma_pessoa')
})

test('o leitor manda a referência junto quando há uma e o laudo traz a comparação', async () => {
  const vistos: any[] = []
  const l = await leitorClaude(cliente([{ type: 'tool_use', input: laudo({ mesma_pessoa: true }) }], vistos))('https://img/novo', 'https://img/abertura')
  assert.equal(l.mesma_pessoa, true)
  const imagens = vistos[0].messages[0].content.filter((b: any) => b.type === 'image').map((b: any) => b.source.url)
  assert.deepEqual(imagens, ['https://img/abertura', 'https://img/novo'])
})

test('o prazo da rota: esgotado o limite, não começa nova tentativa e a foto falha fechada', async () => {
  const log: QaEntrada[] = []
  let geradas = 0
  const url = await fotoConferida({
    slide: 2, persona: 'mulher_35_50', faixa: FAIXA, log, limite: Date.now() - 1,
    gerar: async () => { geradas++; return 'https://img/z' },
    ler: async () => laudo({ atrativo: 1 }),
  })
  assert.equal(url, ''); assert.equal(geradas, 1)
  assert.equal(log[log.length - 1].acao, 'prazo_esgotado')
})

test('com referência, o fotoConferida repassa a abertura ao leitor', async () => {
  const log: QaEntrada[] = []; const refs: Array<string | undefined> = []
  const url = await fotoConferida({
    slide: 3, persona: 'mulher_35_50', faixa: FAIXA, log, referencia: 'https://img/abertura',
    gerar: async () => 'https://img/n', ler: async (_u, r) => { refs.push(r); return laudo({ mesma_pessoa: true }) },
  })
  assert.equal(url, 'https://img/n'); assert.deepEqual(refs, ['https://img/abertura'])
})

test('enquadramento ruim (cabeça cortada ou rosto baixo) reprova e a correção manda subir o enquadramento', () => {
  const r = avaliar(laudo({ enquadramento_ok: false }), 'mulher_35_50', FAIXA)
  assert.equal(r.ok, false); assert.equal(r.falhas[0].codigo, 'enquadramento'); assert.match(r.falhas[0].motivo, /cobriria o rosto/)
  assert.match(correcaoPara(r.falhas, 'mulher_35_50', FAIXA), /frame the person higher/)
  assert.equal(avaliar(laudo({ pessoas: 0, enquadramento_ok: false }), 'mulher_35_50', FAIXA).falhas[0].codigo, 'sem_pessoa')   // sem pessoa o problema é outro
  assert.equal(diagnosticarLaudo({ ...laudo(), enquadramento_ok: 'talvez' }).campo, 'enquadramento_ok')
})
