//+------------------------------------------------------------------+
//|  RAFI Indicator                                                  |
//|  Baseado na metodologia de Raphael Figueredo                     |
//|  Implementado por Ecossistema Cechella                           |
//+------------------------------------------------------------------+
#property copyright   "Ecossistema Cechella"
#property version     "1.00"
#property indicator_separate_window
#property indicator_buffers 4
#property indicator_plots   3

//--- Plot 0: histograma positivo (compra)
#property indicator_label1  "RAFI+"
#property indicator_type1   DRAW_HISTOGRAM
#property indicator_color1  clrLime
#property indicator_style1  STYLE_SOLID
#property indicator_width1  2

//--- Plot 1: histograma negativo (venda)
#property indicator_label2  "RAFI-"
#property indicator_type2   DRAW_HISTOGRAM
#property indicator_color2  clrRed
#property indicator_style2  STYLE_SOLID
#property indicator_width2  2

//--- Plot 2: histograma neutro
#property indicator_label3  "RAFI Neutro"
#property indicator_type3   DRAW_HISTOGRAM
#property indicator_color3  clrGray
#property indicator_style3  STYLE_SOLID
#property indicator_width3  2

//--- Parâmetros
input int    InpPeriod    = 8;      // Período ATR / Bollinger
input double InpThreshold = 2.5;   // Threshold sinal forte
input double InpMultiply  = 1.8;   // Multiplicador RAFI

//--- Buffers
double BufferPos[];   // histograma positivo
double BufferNeg[];   // histograma negativo
double BufferNeu[];   // histograma neutro
double BufferRaw[];   // valor bruto (para lógica interna)

//--- Linhas de nível
double level_up   =  2.5;
double level_down = -2.5;

//+------------------------------------------------------------------+
int OnInit()
  {
   SetIndexBuffer(0, BufferPos, INDICATOR_DATA);
   SetIndexBuffer(1, BufferNeg, INDICATOR_DATA);
   SetIndexBuffer(2, BufferNeu, INDICATOR_DATA);
   SetIndexBuffer(3, BufferRaw, INDICATOR_CALCULATIONS);

   PlotIndexSetDouble(0, PLOT_EMPTY_VALUE, 0.0);
   PlotIndexSetDouble(1, PLOT_EMPTY_VALUE, 0.0);
   PlotIndexSetDouble(2, PLOT_EMPTY_VALUE, 0.0);

   // Linhas de referência
   IndicatorSetInteger(INDICATOR_LEVELS, 2);
   IndicatorSetDouble(INDICATOR_LEVELVALUE, 0,  InpThreshold);
   IndicatorSetDouble(INDICATOR_LEVELVALUE, 1, -InpThreshold);
   IndicatorSetInteger(INDICATOR_LEVELCOLOR, 0, clrYellow);
   IndicatorSetInteger(INDICATOR_LEVELCOLOR, 1, clrYellow);
   IndicatorSetInteger(INDICATOR_LEVELSTYLE, 0, STYLE_DOT);
   IndicatorSetInteger(INDICATOR_LEVELSTYLE, 1, STYLE_DOT);

   IndicatorSetString(INDICATOR_SHORTNAME, "RAFI(" + IntegerToString(InpPeriod) + ")");
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
   int start = InpPeriod + 1;
   if(rates_total < start) return(0);

   int begin = (prev_calculated == 0) ? start : prev_calculated - 1;

   for(int i = begin; i < rates_total; i++)
     {
      // Calcula ATR médio dos últimos InpPeriod candles
      double sum_range = 0;
      for(int j = i - InpPeriod; j < i; j++)
         sum_range += (high[j] - low[j]);
      double avg_range = sum_range / InpPeriod;

      if(avg_range == 0)
        {
         BufferPos[i] = 0;
         BufferNeg[i] = 0;
         BufferNeu[i] = 0;
         BufferRaw[i] = 0;
         continue;
        }

      // Corpo da vela atual
      double body = close[i] - open[i];

      // Valor RAFI normalizado
      double rafi = (body / avg_range) * InpMultiply;
      BufferRaw[i] = rafi;

      // Distribui nos buffers de cor
      BufferPos[i] = 0;
      BufferNeg[i] = 0;
      BufferNeu[i] = 0;

      if(rafi >= InpThreshold)
         BufferPos[i] = rafi;
      else if(rafi <= -InpThreshold)
         BufferNeg[i] = rafi;
      else
         BufferNeu[i] = rafi;
     }

   return(rates_total);
  }
//+------------------------------------------------------------------+
