# WhatsApp da Ana — Meta Cloud API

Migração da Ana (funil de vendas de 8 etapas) do N8N + Z-API para a Meta Cloud API direta, concluída em 29/10/2026.

> Nenhum segredo neste arquivo. Tokens e chaves ficam apenas em `ana-master/.env` no servidor `hormone-agent`.

## Visão geral

```
Lead (WhatsApp) ──► +55 47 8850-7977
                        │  (Meta Cloud API, WABA do Instituto DV)
                        ▼
              App Meta "Ana Instituto DV"
                        │  webhook POST
                        ▼
  https://ana-master.hormoneecosystem.com/webhook/whatsapp
                        │  nginx → ana-master (PM2, porta 3001, VM hormone-agent)
                        ▼
        src/whatsapp-webhook.ts → Claude Haiku → resposta via Graph API
```

O Gustavo é separado: número +55 47 8473-1049, app ATLAS, webhook `atlas-whatsapp.hormoneecosystem.com`, VM `atlas-core`.

## IDs de referência

| Item | Ana | Gustavo |
|---|---|---|
| Número | +55 47 8850-7977 | +55 47 8473-1049 |
| Phone Number ID | `535564639640424` | `1320620911136699` |
| WABA (conta do WhatsApp) | `518587731333849` | `1106976092281013` |
| Portfólio empresarial | Instituto DV Emagrecimento & Saúde (`571445059379593`) | Hormone Ecosystem (`1093327563871554`) |
| App Meta | Ana Instituto DV (`1628628192093409`) | ATLAS (`1524708076017706`) |
| Webhook | `ana-master.hormoneecosystem.com/webhook/whatsapp` | `atlas-whatsapp.hormoneecosystem.com/` |
| VM | hormone-agent (35.255.229.131) | atlas-core (34.63.56.206) |

Atenção: `571445059379593` é o ID do **portfólio**, não da WABA. Usar o portfólio em chamadas `/subscribed_apps` não funciona.

## Configuração do servidor (`ana-master/.env`)

| Variável | Uso |
|---|---|
| `META_ANDRE_ACCESS_TOKEN` | Token permanente do usuário do sistema **"Ana agente IA"** (Instituto DV), app Ana Instituto DV, permissões `whatsapp_business_management` + `whatsapp_business_messaging`. Nome legado: apesar de "ANDRE", é o número da Ana. |
| `META_ANDRE_PHONE_ID` | Opcional; padrão `535564639640424`. |
| `ANTHROPIC_API_KEY` | Chave do Claude Console. Sem ela o código cai para `OPENAI_API_KEY` e a chamada falha. |
| `WHATSAPP_VERIFY_TOKEN` | Opcional; padrão `hormone-wh-2025`. Deve bater com o "Verificar token" do app na Meta. |

Após alterar o `.env`:

```bash
cd ~/cechella/ana-master
set -a; source .env; set +a
pm2 restart ana-master --update-env
```

## Código

- `ana-master/src/whatsapp-webhook.ts` — porte TypeScript do funil do N8N (`n8n/nodes/montar-prompt.js`, `processar-resposta.js`, `parsear-referidos.js`): monta o prompt por etapa, chama o Claude (`claude-haiku-4-5-20251001`), salva lead/histórico no Supabase, trata vCards de indicação e envia a resposta pela Graph API.
- `ana-master/src/server.ts` — rotas `GET /webhook/whatsapp` (verificação `hub.challenge`) e `POST /webhook/whatsapp` (responde 200 imediatamente e processa em segundo plano).
- Logs: `[WH] <telefone> etapa=X→Y chars=N` a cada mensagem; `[WH] metaSend failed` quando a Meta recusa o envio; `[WH] Claude API failed` quando a API do Claude retorna erro.

## Por que um app separado para a Ana

Tentativas que **não** funcionaram, para não repetir:

1. **App Hormoneecosystem** — webhook verificava, mas não recebia mensagens: app não publicado e permissões do WhatsApp presas em "Análise do app pendente".
2. **Compartilhar a WABA da Ana com a Hormone como parceira** — a Meta recusa compartilhar contas do WhatsApp com empresas que não são Provedor de Tecnologia.
3. **Migrar o 7977 para a WABA da Hormone** — exige código por SMS/ligação, e o número não recebe SMS nem ligação (só existe no WhatsApp Business da clínica). Ficou um registro "Não verificado" do 7977 na WABA da Hormone; pode ser apagado.
4. **Usar o app ATLAS com `override_callback_uri`** — a assinatura e a URL ficaram corretas, e o **envio** funcionou, mas nenhum evento (mensagens nem status) era entregue. Motivo: o ATLAS tem só **Acesso padrão** ("Pronto para teste"); com acesso padrão a Meta só entrega webhooks de WABAs do **mesmo portfólio** dono do app. O Gustavo está no mesmo portfólio do ATLAS; a Ana não.

**Solução:** app próprio ("Ana Instituto DV") criado **dentro do portfólio do Instituto DV**, só com o caso de uso WhatsApp, publicado (sem requisitos de análise), e a WABA `518587731333849` inscrita nele via `POST /518587731333849/subscribed_apps`.

## Particularidades do número

- O 7977 está em **coexistência** (`is_on_biz_app: true`): funciona ao mesmo tempo no app WhatsApp Business do celular da clínica e na Cloud API. Mensagens respondidas manualmente no celular aparecem como `message_echoes` (campo assinado no webhook).
- Envios fora da janela de 24h exigem template aprovado. A conta mostrava aviso de "Nenhuma forma de pagamento válida" — necessário para conversas iniciadas pela empresa.

## Diagnóstico rápido

```bash
# Chegou alguma requisição da Meta? (VM hormone-agent)
sudo grep "webhook/whatsapp" /var/log/nginx/access.log | grep POST | tail -5

# A Ana processou?
pm2 logs ana-master --lines 50 --nostream | grep "\[WH\]"
```

No Explorador da Graph API (app Ana Instituto DV):

- `GET 535564639640424?fields=status,platform_type,is_on_biz_app,webhook_configuration` — estado do número e URL efetiva do webhook.
- `GET 518587731333849/subscribed_apps` — quais apps recebem eventos da WABA.

Note que o user-agent da Meta é `facebookplatform` na verificação (GET) e `facebookexternalua` / `Webhooks/1.0` nos eventos (POST).

## Pendências

- [ ] Adicionar crédito e recarga automática no Claude Console (saldo estava em US$ 0,02).
- [ ] Rotacionar o token da Meta (usuário "Ana agente IA" → Anular tokens → Gerar token) e a `ANTHROPIC_API_KEY` — ambos foram expostos durante a configuração.
- [ ] Corrigir o auto-deploy do ana-master (`[DEPLOY] erro: unable to access '.git/config': Permission denied`) e publicar os commits de log de erro.
- [ ] Apagar o 7977 "Não verificado" da WABA da Hormone.
- [ ] Remover a inscrição do ATLAS na WABA da Ana (`DELETE /518587731333849/subscribed_apps` com token do ATLAS).
- [ ] Renomear `META_ANDRE_*` para `META_ANA_*` quando o André ganhar número próprio.
- [ ] Rota antiga `web/app/api/webhook/meta/route.ts` (repasse ao N8N e ligações do André) não recebe mais eventos do 7977; revisar quando o André for configurado.
- [ ] Meta Calling API: aguardando o caso #29060002787.
