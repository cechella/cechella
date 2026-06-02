class OpportunityDetector:
    FEE_PER_ORDER = 0.00075  # 0.075% pagando taxa com BNB

    def check(self, tickers: dict, triangle: tuple) -> dict | None:
        """
        Retorna oportunidade lucrativa ou None.
        Simula: USDT -> A -> B -> USDT e verifica lucro liquido.
        """
        pair1, pair2, pair3 = triangle

        try:
            price1 = tickers[pair1]['ask']  # compra A com USDT
            price2 = tickers[pair2]['ask']  # compra B com A
            price3 = tickers[pair3]['bid']  # vende B por USDT
        except (KeyError, TypeError):
            return None

        if not all([price1, price2, price3]):
            return None

        # Simula $1 percorrendo o triangulo com taxas incluidas
        step1 = (1 / price1) * (1 - self.FEE_PER_ORDER)
        step2 = (step1 / price2) * (1 - self.FEE_PER_ORDER)
        step3 = (step2 * price3) * (1 - self.FEE_PER_ORDER)

        net_profit_pct = (step3 - 1) * 100

        if net_profit_pct <= 0:
            return None

        return {
            'triangle': triangle,
            'prices': (price1, price2, price3),
            'net_profit_pct': net_profit_pct,
        }
