//+------------------------------------------------------------------+
//|  RAFI Multi-Timeframe Dashboard                                  |
//|  Mostra sinais RAFI em 5min + 15min + 60min simultaneamente      |
//|  Alinhamento = sinal válido para entrada                         |
//+------------------------------------------------------------------+
#property copyright   "Ecossistema Cechella"
#property version     "1.00"
#property indicator_chart_window
#property indicator_buffers 0
#property indicator_plots   0

input int    InpPeriod    = 8;
input double InpThreshold = 2.5;
input double InpMultiply  = 1.8;
input int    InpX         = 20;   // Posição X do painel
input int    InpY         = 50;   // Posição Y do painel

//--- IDs dos objetos visuais
string PREFIX = "RAFI_MTF_";

struct TFSignal
  {
   ENUM_TIMEFRAMES tf;
   string          name;
   double          rafi;
   string          cor;
  };

TFSignal signals[3];

//+------------------------------------------------------------------+
int OnInit()
  {
   signals[0].tf   = PERIOD_M5;
   signals[0].name = "M5 ";
   signals[1].tf   = PERIOD_M15;
   signals[1].name = "M15";
   signals[2].tf   = PERIOD_H1;
   signals[2].name = "H1 ";

   CreatePanel();
   EventSetTimer(5);
   return(INIT_SUCCEEDED);
  }

//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   EventKillTimer();
   ObjectsDeleteAll(0, PREFIX);
  }

//+------------------------------------------------------------------+
void OnTimer()
  {
   UpdateSignals();
   UpdatePanel();
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
   UpdateSignals();
   UpdatePanel();
   return(rates_total);
  }

//+------------------------------------------------------------------+
void UpdateSignals()
  {
   for(int t = 0; t < 3; t++)
     {
      double closes[], opens[], highs[], lows[];
      int n = InpPeriod + 5;

      if(CopyClose(_Symbol, signals[t].tf, 0, n, closes) < n) continue;
      if(CopyOpen (_Symbol, signals[t].tf, 0, n, opens)  < n) continue;
      if(CopyHigh (_Symbol, signals[t].tf, 0, n, highs)  < n) continue;
      if(CopyLow  (_Symbol, signals[t].tf, 0, n, lows)   < n) continue;

      // Inverte (CopyBuffer retorna do mais recente para o mais antigo)
      ArrayReverse(closes); ArrayReverse(opens);
      ArrayReverse(highs);  ArrayReverse(lows);

      int last = n - 1;

      // ATR médio
      double sum_range = 0;
      for(int j = last - InpPeriod; j < last; j++)
         sum_range += (highs[j] - lows[j]);
      double avg_range = sum_range / InpPeriod;
      if(avg_range == 0) { signals[t].rafi = 0; signals[t].cor = "neutro"; continue; }

      double body = closes[last] - opens[last];
      double rafi = (body / avg_range) * InpMultiply;
      signals[t].rafi = rafi;

      // Cor
      double prev_body = closes[last-1] - opens[last-1];
      double prev_rafi = (prev_body / avg_range) * InpMultiply;

      if(MathAbs(prev_rafi) > InpThreshold && MathAbs(rafi) < 1.0)
         signals[t].cor = "amarelo";
      else if(rafi >= InpThreshold)
         signals[t].cor = "verde";
      else if(rafi <= -InpThreshold)
         signals[t].cor = "vermelho";
      else
         signals[t].cor = "neutro";
     }
  }

//+------------------------------------------------------------------+
void CreatePanel()
  {
   // Fundo do painel
   string bg = PREFIX + "bg";
   ObjectCreate(0, bg, OBJ_RECTANGLE_LABEL, 0, 0, 0);
   ObjectSetInteger(0, bg, OBJPROP_XDISTANCE,  InpX);
   ObjectSetInteger(0, bg, OBJPROP_YDISTANCE,  InpY);
   ObjectSetInteger(0, bg, OBJPROP_XSIZE,      170);
   ObjectSetInteger(0, bg, OBJPROP_YSIZE,      110);
   ObjectSetInteger(0, bg, OBJPROP_BGCOLOR,    clrBlack);
   ObjectSetInteger(0, bg, OBJPROP_BORDER_TYPE,BORDER_FLAT);
   ObjectSetInteger(0, bg, OBJPROP_COLOR,      clrDimGray);
   ObjectSetInteger(0, bg, OBJPROP_CORNER,     CORNER_LEFT_UPPER);
   ObjectSetInteger(0, bg, OBJPROP_BACK,       false);

   // Título
   string title = PREFIX + "title";
   ObjectCreate(0, title, OBJ_LABEL, 0, 0, 0);
   ObjectSetString(0,  title, OBJPROP_TEXT,    "RAFI Multi-Timeframe");
   ObjectSetInteger(0, title, OBJPROP_XDISTANCE, InpX + 8);
   ObjectSetInteger(0, title, OBJPROP_YDISTANCE, InpY + 8);
   ObjectSetInteger(0, title, OBJPROP_COLOR,   clrWhite);
   ObjectSetInteger(0, title, OBJPROP_FONTSIZE, 8);
   ObjectSetInteger(0, title, OBJPROP_CORNER,  CORNER_LEFT_UPPER);
  }

//+------------------------------------------------------------------+
void UpdatePanel()
  {
   // Verifica alinhamento (todos apontando mesma direção)
   bool all_buy  = (signals[0].cor=="verde"   && signals[1].cor=="verde"   && signals[2].cor=="verde");
   bool all_sell = (signals[0].cor=="vermelho" && signals[1].cor=="vermelho" && signals[2].cor=="vermelho");

   string align_text  = "Aguardar";
   color  align_color = clrGray;
   if(all_buy)  { align_text = "COMPRAR  >>>"; align_color = clrLime; }
   if(all_sell) { align_text = "VENDER   <<<"; align_color = clrRed;  }

   for(int t = 0; t < 3; t++)
     {
      string id = PREFIX + "tf" + IntegerToString(t);
      if(ObjectFind(0, id) < 0)
        {
         ObjectCreate(0, id, OBJ_LABEL, 0, 0, 0);
         ObjectSetInteger(0, id, OBJPROP_CORNER, CORNER_LEFT_UPPER);
        }

      color c = clrGray;
      if(signals[t].cor == "verde")    c = clrLime;
      if(signals[t].cor == "vermelho") c = clrRed;
      if(signals[t].cor == "amarelo")  c = clrYellow;

      string txt = signals[t].name + ": " + signals[t].cor +
                   "  (" + DoubleToString(signals[t].rafi, 2) + ")";

      ObjectSetString(0,  id, OBJPROP_TEXT,     txt);
      ObjectSetInteger(0, id, OBJPROP_XDISTANCE, InpX + 8);
      ObjectSetInteger(0, id, OBJPROP_YDISTANCE, InpY + 28 + t * 20);
      ObjectSetInteger(0, id, OBJPROP_COLOR,     c);
      ObjectSetInteger(0, id, OBJPROP_FONTSIZE,  9);
     }

   // Linha de alinhamento
   string al = PREFIX + "align";
   if(ObjectFind(0, al) < 0)
     {
      ObjectCreate(0, al, OBJ_LABEL, 0, 0, 0);
      ObjectSetInteger(0, al, OBJPROP_CORNER, CORNER_LEFT_UPPER);
     }
   ObjectSetString(0,  al, OBJPROP_TEXT,     align_text);
   ObjectSetInteger(0, al, OBJPROP_XDISTANCE, InpX + 8);
   ObjectSetInteger(0, al, OBJPROP_YDISTANCE, InpY + 85);
   ObjectSetInteger(0, al, OBJPROP_COLOR,     align_color);
   ObjectSetInteger(0, al, OBJPROP_FONTSIZE,  10);
  }
//+------------------------------------------------------------------+
