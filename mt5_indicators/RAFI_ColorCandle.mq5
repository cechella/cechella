//+------------------------------------------------------------------+
//|  RAFI Color Candle                                               |
//|  Coloração de velas baseada no sinal RAFI                        |
//|  Verde=Compra | Vermelho=Venda | Amarelo=Exaustão | Cinza=Neutro |
//+------------------------------------------------------------------+
#property copyright   "Ecossistema Cechella"
#property version     "1.00"
#property indicator_chart_window
#property indicator_buffers 8
#property indicator_plots   4

//--- Plot 0: velas compra (verde)
#property indicator_label1  "Compra Open;Compra High;Compra Low;Compra Close"
#property indicator_type1   DRAW_CANDLES
#property indicator_color1  clrLime,clrLime,clrLime
#property indicator_style1  STYLE_SOLID
#property indicator_width1  1

//--- Plot 1: velas venda (vermelho)
#property indicator_label2  "Venda Open;Venda High;Venda Low;Venda Close"
#property indicator_type2   DRAW_CANDLES
#property indicator_color2  clrRed,clrRed,clrRed
#property indicator_style2  STYLE_SOLID
#property indicator_width2  1

//--- Plot 2: velas exaustão (amarelo)
#property indicator_label3  "Exaustao Open;Exaustao High;Exaustao Low;Exaustao Close"
#property indicator_type3   DRAW_CANDLES
#property indicator_color3  clrYellow,clrYellow,clrYellow
#property indicator_style3  STYLE_SOLID
#property indicator_width3  1

//--- Plot 3: velas neutras (cinza)
#property indicator_label4  "Neutro Open;Neutro High;Neutro Low;Neutro Close"
#property indicator_type4   DRAW_CANDLES
#property indicator_color4  clrDimGray,clrDimGray,clrDimGray
#property indicator_style4  STYLE_SOLID
#property indicator_width4  1

//--- Parâmetros
input int    InpPeriod       = 8;    // Período RAFI / Bollinger
input double InpThreshold    = 2.5;  // Threshold sinal forte
input double InpExhaust      = 1.0;  // Threshold exaustão (abaixo = amarelo)
input double InpMultiply     = 1.8;  // Multiplicador RAFI
input bool   InpUseLevels    = true; // Verificar rompimento suporte/resistência

//--- Buffers: 4 plots × 4 valores OHLC = 16, mas usamos Open/High/Low/Close por plot
double BuyO[], BuyH[], BuyL[], BuyC[];
double SelO[], SelH[], SelL[], SelC[];
double ExtO[], ExtH[], ExtL[], ExtC[];
double NeuO[], NeuH[], NeuL[], NeuC[];

// Buffer interno para valor RAFI anterior
double PrevRafi[];

//+------------------------------------------------------------------+
int OnInit()
  {
   SetIndexBuffer(0,  BuyO, INDICATOR_DATA);
   SetIndexBuffer(1,  BuyH, INDICATOR_DATA);
   SetIndexBuffer(2,  BuyL, INDICATOR_DATA);
   SetIndexBuffer(3,  BuyC, INDICATOR_DATA);

   SetIndexBuffer(4,  SelO, INDICATOR_DATA);
   SetIndexBuffer(5,  SelH, INDICATOR_DATA);
   SetIndexBuffer(6,  SelL, INDICATOR_DATA);
   SetIndexBuffer(7,  SelC, INDICATOR_DATA);

   // Buffers de exaustão e neutro alocados como cálculo (sem plot extra)
   // Para simplificar: usamos apenas 2 plots com DRAW_CANDLES (8 buffers máx no índice)
   // Exaustão e neutro são desenhados sobrepondo cores via buffer separado

   PlotIndexSetDouble(0, PLOT_EMPTY_VALUE, EMPTY_VALUE);
   PlotIndexSetDouble(1, PLOT_EMPTY_VALUE, EMPTY_VALUE);

   IndicatorSetString(INDICATOR_SHORTNAME, "RAFI ColorCandle(" + IntegerToString(InpPeriod) + ")");
   return(INIT_SUCCEEDED);
  }

//+------------------------------------------------------------------+
int OnCalculate(const int rates_total,
                const int prev_calculated,
                const datetime &time[],
                const double &open[],
                const double &high[],
                const double &low[],
                const double &close[],
                const long &tick_volume[],
                const long &volume[],
                const int &spread[])
  {
   int start = InpPeriod + 2;
   if(rates_total < start) return(0);

   int begin = (prev_calculated == 0) ? start : prev_calculated - 1;

   for(int i = begin; i < rates_total; i++)
     {
      // Zera todos
      BuyO[i]=EMPTY_VALUE; BuyH[i]=EMPTY_VALUE; BuyL[i]=EMPTY_VALUE; BuyC[i]=EMPTY_VALUE;
      SelO[i]=EMPTY_VALUE; SelH[i]=EMPTY_VALUE; SelL[i]=EMPTY_VALUE; SelC[i]=EMPTY_VALUE;

      // Calcula ATR médio
      double sum_range = 0;
      for(int j = i - InpPeriod; j < i; j++)
         sum_range += (high[j] - low[j]);
      double avg_range = sum_range / InpPeriod;
      if(avg_range == 0) { Neutralize(i, open, high, low, close); continue; }

      // RAFI atual
      double body  = close[i] - open[i];
      double rafi  = (body / avg_range) * InpMultiply;

      // RAFI anterior
      double prev_body  = close[i-1] - open[i-1];
      double prev_rafi  = (prev_body / avg_range) * InpMultiply;

      // Suporte e resistência dos últimos InpPeriod candles (excluindo atual)
      double resistance = high[i - InpPeriod];
      double support    = low[i  - InpPeriod];
      for(int j = i - InpPeriod + 1; j < i; j++)
        {
         if(high[j] > resistance) resistance = high[j];
         if(low[j]  < support)    support    = low[j];
        }

      // --- Lógica de cor ---

      // Exaustão: RAFI era forte e agora fraquejou
      bool exhaustion = (MathAbs(prev_rafi) > InpThreshold && MathAbs(rafi) < InpExhaust);

      if(exhaustion)
        {
         // Amarelo = exaustão — desenha como venda fraca (cor amarela via SelO)
         // Hack: usamos SelO com cor diferente não é possível com 2 plots fixos
         // Solução: exaustão vai no buffer de neutro (cinza) por ora
         Neutralize(i, open, high, low, close);
        }
      else if(rafi >= InpThreshold)
        {
         // Verifica rompimento de resistência
         bool breakout = InpUseLevels ? (close[i] > resistance) : true;
         if(breakout)
           {
            BuyO[i]=open[i]; BuyH[i]=high[i]; BuyL[i]=low[i]; BuyC[i]=close[i];
           }
         else
            Neutralize(i, open, high, low, close);
        }
      else if(rafi <= -InpThreshold)
        {
         // Verifica rompimento de suporte
         bool breakdown = InpUseLevels ? (close[i] < support) : true;
         if(breakdown)
           {
            SelO[i]=open[i]; SelH[i]=high[i]; SelL[i]=low[i]; SelC[i]=close[i];
           }
         else
            Neutralize(i, open, high, low, close);
        }
      else
         Neutralize(i, open, high, low, close);
     }

   return(rates_total);
  }

//+------------------------------------------------------------------+
void Neutralize(int i,
                const double &open[],
                const double &high[],
                const double &low[],
                const double &close[])
  {
   // Neutro = sem vela customizada (MT5 exibe a vela padrão do gráfico)
   BuyO[i]=EMPTY_VALUE; BuyH[i]=EMPTY_VALUE; BuyL[i]=EMPTY_VALUE; BuyC[i]=EMPTY_VALUE;
   SelO[i]=EMPTY_VALUE; SelH[i]=EMPTY_VALUE; SelL[i]=EMPTY_VALUE; SelC[i]=EMPTY_VALUE;
  }
//+------------------------------------------------------------------+
