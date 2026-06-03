//+------------------------------------------------------------------+
//|  Bollinger Bands configurado para estratégia RAFI                |
//|  Período: 8 | Desvio: 2.0 — conforme metodologia Raphael        |
//+------------------------------------------------------------------+
#property copyright   "Ecossistema Cechella"
#property version     "1.00"
#property indicator_chart_window
#property indicator_buffers 3
#property indicator_plots   3

#property indicator_label1  "BB Upper"
#property indicator_type1   DRAW_LINE
#property indicator_color1  clrDodgerBlue
#property indicator_style1  STYLE_SOLID
#property indicator_width1  1

#property indicator_label2  "BB Média"
#property indicator_type2   DRAW_LINE
#property indicator_color2  clrWhite
#property indicator_style2  STYLE_DOT
#property indicator_width2  1

#property indicator_label3  "BB Lower"
#property indicator_type3   DRAW_LINE
#property indicator_color3  clrDodgerBlue
#property indicator_style3  STYLE_SOLID
#property indicator_width3  1

//--- Parâmetros — padrão RAFI conforme documentação
input int    InpPeriod   = 8;    // Período (padrão RAFI: 8)
input double InpDeviation= 2.0;  // Desvios padrão (padrão RAFI: 2.0)
input int    InpShift    = 0;    // Deslocamento

//--- Buffers
double Upper[];
double Middle[];
double Lower[];

//--- Handle do indicador nativo
int bb_handle;

//+------------------------------------------------------------------+
int OnInit()
  {
   bb_handle = iBands(_Symbol, _Period, InpPeriod, InpShift, InpDeviation, PRICE_CLOSE);
   if(bb_handle == INVALID_HANDLE)
     {
      Print("Erro ao criar Bollinger Bands: ", GetLastError());
      return(INIT_FAILED);
     }

   SetIndexBuffer(0, Upper,  INDICATOR_DATA);
   SetIndexBuffer(1, Middle, INDICATOR_DATA);
   SetIndexBuffer(2, Lower,  INDICATOR_DATA);

   PlotIndexSetDouble(0, PLOT_EMPTY_VALUE, EMPTY_VALUE);
   PlotIndexSetDouble(1, PLOT_EMPTY_VALUE, EMPTY_VALUE);
   PlotIndexSetDouble(2, PLOT_EMPTY_VALUE, EMPTY_VALUE);

   IndicatorSetString(INDICATOR_SHORTNAME,
      "RAFI BB(" + IntegerToString(InpPeriod) + "," + DoubleToString(InpDeviation,1) + ")");
   return(INIT_SUCCEEDED);
  }

//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   if(bb_handle != INVALID_HANDLE)
      IndicatorRelease(bb_handle);
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
   if(rates_total < InpPeriod) return(0);

   int to_copy = rates_total - prev_calculated + 1;

   if(CopyBuffer(bb_handle, 0, 0, to_copy, Upper)  < 0) return(prev_calculated);
   if(CopyBuffer(bb_handle, 1, 0, to_copy, Lower)  < 0) return(prev_calculated);
   if(CopyBuffer(bb_handle, 2, 0, to_copy, Middle) < 0) return(prev_calculated);

   return(rates_total);
  }
//+------------------------------------------------------------------+
