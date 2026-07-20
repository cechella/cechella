# Configuração do Nó "Enviar WhatsApp" (Z-API) — n8n

## Nó: HTTP Request — Enviar WhatsApp

### URL
```
https://api.z-api.io/instances/3F4D4A5044DBE1E458808A5553EDB71F/token/039297EE5982433C7EFA38C5/send-text
```

### Method
```
POST
```

### Headers
| Name | Value |
|------|-------|
| Content-Type | application/json |
| Client-Token | F16a4d3e95c034a14b42b138d8165a90cS |

### Body (JSON)
```json
{
  "phone": "{{ $('Extrair Mensagem').item.json.telefone }}",
  "message": "{{ $json.resposta }}"
}
```

---

## ⚠️ ATENÇÃO — Erro comum

**ERRADO:**
```json
{
  "phone": "{{ $('Extrair Mensagem').item.json.telefone }}",
  "message": {{ JSON.stringify($json.resposta) }}
}
```

**Por que está errado:**
- `$json.resposta` já é uma string pronta
- `JSON.stringify()` converte objetos em string JSON — usado numa string já pronta, gera double encoding
- Resultado: quebras de linha viram `\\n` literais e o JSON bruto é enviado no WhatsApp

**CORRETO:**
```json
{
  "phone": "{{ $('Extrair Mensagem').item.json.telefone }}",
  "message": "{{ $json.resposta }}"
}
```

O campo `resposta` vem do nó **Processar Resposta** já parseado e pronto para envio.
