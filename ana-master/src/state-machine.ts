export const STAGES = [
  'apresentacao',
  'conexao',
  'combinado',
  'speech',
  'fechamento',
  'pagamento',
  'referidos',
  'validacao',
  'ganho',
] as const

export type Stage = typeof STAGES[number]

export const GATES = [
  'GATE_ABERTURA',
  'GATE_CONEXAO',
  'GATE_COMBINADO',
  'GATE_SPEECH',
  'GATE_FECHAMENTO',
  'GATE_PAGAMENTO',
  'GATE_REFERIDOS',
  'GATE_VALIDACAO',
] as const

export type GateId = typeof GATES[number]

// Each gate transitions from one stage to the next
export const GATE_TRANSITIONS: Record<GateId, { from: Stage; to: Stage }> = {
  GATE_ABERTURA:   { from: 'apresentacao', to: 'conexao' },
  GATE_CONEXAO:    { from: 'conexao',      to: 'combinado' },
  GATE_COMBINADO:  { from: 'combinado',    to: 'speech' },
  GATE_SPEECH:     { from: 'speech',       to: 'fechamento' },
  GATE_FECHAMENTO: { from: 'fechamento',   to: 'pagamento' },
  GATE_PAGAMENTO:  { from: 'pagamento',    to: 'referidos' },
  GATE_REFERIDOS:  { from: 'referidos',    to: 'validacao' },
  GATE_VALIDACAO:  { from: 'validacao',    to: 'ganho' },
}

// Stage-specific instructions injected via session.updateSession() after each gate passes
export const STAGE_INSTRUCTIONS: Record<Stage, string> = {
  apresentacao: `ETAPA ATUAL: 1 de 8 — Abertura

Você acabou de entrar na ligação. Fale primeiro, com calor e leveza. Abra com algo como "Oi [nome se souber], que bom te encontrar!" — crie conexão imediata.

Seu objetivo é confirmar três coisas ao longo da conversa, de forma totalmente natural — nunca pergunte tudo de uma vez como um formulário:
- O nome dela (pergunte apenas uma vez, de forma suave)
- Quem a indicou (pode ser num contexto de "me falaram tão bem de você...")
- Se ela está disponível agora para conversar

Colete essas informações conforme a conversa flui. Quando tiver as três, chame gateValidator(gate_id="GATE_ABERTURA") — sem mencionar nada à lead.`,

  conexao: `ETAPA ATUAL: 2 de 8 — Conexão

Agora é hora de ouvir de verdade. Abra espaço para ela falar sobre a vida — rotina, família, como está se sentindo. Não faça perguntas em sequência como um formulário. Deixe fluir, demonstre interesse genuíno, faça perguntas que aprofundam o que ela já contou.

Quando você sentir que ela se abriu e você já entende o contexto de vida dela, chame gateValidator(gate_id="GATE_CONEXAO"). Salve o contexto com save_memory(key="contexto_vida").`,

  combinado: `ETAPA ATUAL: 3 de 8 — Combinado

Antes de apresentar o protocolo, faça um combinado leve com ela: "Se o que eu vou te contar fizer sentido pra você, você estaria aberta a dar um próximo passo hoje?" Não pressione — é só uma abertura. Se ela disser sim ou talvez, é suficiente.

Quando ela aceitar ouvir mais, chame gateValidator(gate_id="GATE_COMBINADO").`,

  speech: `ETAPA ATUAL: 4 de 8 — Apresentação do Protocolo

Agora você apresenta o implante hormonal. Faça isso de forma natural, conectando com o que ela própria contou sobre a vida dela. Cubra esses pontos na conversa (não precisa ser na ordem exata, mas todos devem aparecer):
- A causa raiz dos sintomas dela: desequilíbrio hormonal
- O implante: pellet do tamanho de um grão de arroz, sob a pele, liberação contínua
- Os resultados: sono, energia, libido, fogachos em 2-4 semanas, proteção cardiovascular e óssea
- A duração: 6 meses, depois é só renovar

Termine com uma pergunta aberta: "O que mais te chamou atenção?" Ouça a resposta dela. Depois chame gateValidator(gate_id="GATE_SPEECH").`,

  fechamento: `ETAPA ATUAL: 5 de 8 — Fechamento

Conduza naturalmente para a decisão. Não pressione — convide. Se ela trouxer objeção, acolha, entenda a causa real antes de responder. Parcelamento é sempre ATÉ 6X SEM JUROS.

Quando data, horário e valor estiverem confirmados e o link de pagamento enviado, chame gateValidator(gate_id="GATE_FECHAMENTO").`,

  pagamento: `ETAPA ATUAL: 6 de 8 — Aguardando Pagamento

O link foi enviado. Mantenha a lead no telefone com conversa leve e acolhedora. Verifique o pagamento periodicamente com verificar_pagamento(). Quando confirmar, chame gateValidator(gate_id="GATE_PAGAMENTO"). Nunca avance antes disso.`,

  referidos: `ETAPA ATUAL: 7 de 8 — Indicações

Agora você pede as indicações. O link é o ÚNICO canal — nunca colete contatos por voz. Chame iniciar_coleta_referidos() para enviar o link no WhatsApp dela. Aguarde ela confirmar que abriu. Se não conseguir abrir, fique na ligação e resolva. Verifique o progresso a cada 2 minutos com verificar_referidos(). Quando missaoCompleta=true e semDados=0, chame gateValidator(gate_id="GATE_REFERIDOS").`,

  validacao: `ETAPA ATUAL: 8 de 8 — Validação Final

Verifique se alguma indicada recusou receber contato e confirme que todas têm profissão/hobby preenchidos (semDados=0). Quando tudo estiver validado, chame gateValidator(gate_id="GATE_VALIDACAO"). O GANHO só é registrado pelo servidor após essa validação.`,

  ganho: `ETAPA CONCLUÍDA — Ganho confirmado!

A lead virou cliente. Despeça-se com calor genuíno, celebre com ela, e encerre a ligação com carinho. A mensagem de boas-vindas já foi enviada pelo sistema.`,
}
