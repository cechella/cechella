# Instalação dos Indicadores RAFI no MT5 (XM Broker)

## Arquivos

| Arquivo | Função |
|---|---|
| `RAFI_Indicator.mq5` | Histograma de força do rompimento |
| `RAFI_ColorCandle.mq5` | Coloração de velas (verde/vermelho/amarelo) |
| `RAFI_Bollinger.mq5` | Bollinger Bands configurado (8 per, 2 dev) |
| `RAFI_MultiTimeframe.mq5` | Painel M5+M15+H1 com alinhamento |

---

## Passo a Passo

### 1. Abrir pasta de indicadores no MT5
- No MT5: **Arquivo → Abrir pasta de dados**
- Navegar até: `MQL5 / Indicators /`
- Copiar os 4 arquivos `.mq5` para essa pasta

### 2. Compilar
- No MT5: abrir **MetaEditor** (F4)
- Abrir cada arquivo e pressionar **F7** (Compilar)
- Verificar que aparece "0 errors, 0 warnings"

### 3. Aplicar no gráfico
- No MT5: **Inserir → Indicadores → Indicadores Personalizados**
- Selecionar o indicador desejado
- Confirmar parâmetros padrão (já configurados para RAFI)

---

## Configuração Recomendada por Timeframe

### Setup diário (2-3h por dia)
- Abrir EUR/USD, GBP/USD, XAU/USD, USD/JPY
- Timeframe H1 para análise principal
- M15 para timing de entrada
- M5 para ponto exato de entrada

### Parâmetros padrão RAFI
- Período: **8**
- Threshold sinal forte: **2.5**
- Multiplicador: **1.8**
- Bollinger Bands: **8 períodos, 2 desvios**

---

## Lógica dos Sinais

### RAFI Histograma
- **> +2.5** = sinal de compra forte (barra verde)
- **< -2.5** = sinal de venda forte (barra vermelha)
- **entre -2.5 e +2.5** = neutro (barra cinza)

### RAFI Color Candle
- **Verde** = rompimento de resistência com RAFI > 2.5 → COMPRAR
- **Vermelho** = rompimento de suporte com RAFI < -2.5 → VENDER
- **Amarelo** = exaustão (era forte, perdeu força) → AGUARDAR/FECHAR
- **Cinza** = neutro → NÃO OPERAR

### Multi-Timeframe
- Entrada somente quando M5 + M15 + H1 apontam na **mesma direção**
- "COMPRAR >>>" = todos os 3 timeframes verde
- "VENDER <<<" = todos os 3 timeframes vermelho

---

## Gestão de Risco (conta $20 XM)

| Parâmetro | Valor |
|---|---|
| Risco por operação | 1-2% ($0.20-$0.40) |
| Stop Loss | ATR × 1.5 (abaixo do suporte rompido) |
| Take Profit | Risco × 2 (R:R 1:2 mínimo) |
| Máx. operações simultâneas | 2 |
| Pares recomendados | EUR/USD, GBP/USD, XAU/USD |

---

## Atenção

Os indicadores são uma **implementação baseada na metodologia** dos documentos do curso RAFI.
Para resultados exatos do indicador original, adquira o curso completo com Raphael Figueredo.
