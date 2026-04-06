import logging

from binance.client import Client

logger = logging.getLogger("grid_bot")


class MarketAnalyzer:
    def __init__(self, client: Client, symbol: str):
        self.client = client
        self.symbol = symbol

    def get_klines(self, interval: str = Client.KLINE_INTERVAL_1HOUR, limit: int = 168):
        """Obtiene velas históricas (por defecto 7 días de velas 1h)."""
        klines = self.client.get_klines(
            symbol=self.symbol, interval=interval, limit=limit
        )
        parsed = []
        for k in klines:
            parsed.append({
                "open": float(k[1]),
                "high": float(k[2]),
                "low": float(k[3]),
                "close": float(k[4]),
                "volume": float(k[5]),
            })
        return parsed

    def calculate_atr(self, klines: list[dict], period: int = 14) -> float:
        """Calcula el Average True Range (ATR) para medir volatilidad."""
        if len(klines) < period + 1:
            raise ValueError(f"Se necesitan al menos {period + 1} velas para calcular ATR")

        true_ranges = []
        for i in range(1, len(klines)):
            high = klines[i]["high"]
            low = klines[i]["low"]
            prev_close = klines[i - 1]["close"]
            tr = max(high - low, abs(high - prev_close), abs(low - prev_close))
            true_ranges.append(tr)

        # ATR con media móvil exponencial
        atr = sum(true_ranges[:period]) / period
        for tr in true_ranges[period:]:
            atr = (atr * (period - 1) + tr) / period

        return atr

    def find_support_resistance(self, klines: list[dict], num_levels: int = 3) -> tuple[list[float], list[float]]:
        """Encuentra niveles de soporte y resistencia usando pivotes locales."""
        highs = [k["high"] for k in klines]
        lows = [k["low"] for k in klines]

        # Encontrar pivotes (máximos y mínimos locales)
        resistance_levels = []
        support_levels = []
        window = 5

        for i in range(window, len(klines) - window):
            # Pivote alto (resistencia)
            if highs[i] == max(highs[i - window:i + window + 1]):
                resistance_levels.append(highs[i])
            # Pivote bajo (soporte)
            if lows[i] == min(lows[i - window:i + window + 1]):
                support_levels.append(lows[i])

        # Agrupar niveles cercanos y quedarse con los más relevantes
        support_levels = self._cluster_levels(sorted(support_levels), num_levels)
        resistance_levels = self._cluster_levels(sorted(resistance_levels, reverse=True), num_levels)

        return support_levels, resistance_levels

    def _cluster_levels(self, levels: list[float], num_clusters: int) -> list[float]:
        """Agrupa niveles de precio cercanos (dentro del 0.5%) y retorna los más frecuentes."""
        if not levels:
            return []

        clusters: list[list[float]] = [[levels[0]]]
        threshold = levels[0] * 0.005  # 0.5%

        for price in levels[1:]:
            avg = sum(clusters[-1]) / len(clusters[-1])
            if abs(price - avg) <= threshold:
                clusters[-1].append(price)
            else:
                clusters.append([price])
                threshold = price * 0.005

        # Ordenar por frecuencia y retornar promedios
        clusters.sort(key=len, reverse=True)
        return [round(sum(c) / len(c), 2) for c in clusters[:num_clusters]]

    def analyze(self) -> dict:
        """Analiza el mercado y retorna parámetros óptimos para el grid."""
        logger.info(f"Analizando mercado para {self.symbol}...")

        klines = self.get_klines()
        current_price = float(
            self.client.get_symbol_ticker(symbol=self.symbol)["price"]
        )

        # Calcular ATR
        atr = self.calculate_atr(klines)
        logger.info(f"ATR (14 periodos, 1h): {atr:.2f}")

        # Encontrar soporte/resistencia
        supports, resistances = self.find_support_resistance(klines)
        logger.info(f"Soportes encontrados: {supports}")
        logger.info(f"Resistencias encontradas: {resistances}")

        # Determinar rango del grid
        # Usar ATR * multiplicador como rango base
        atr_range = atr * 3

        # Ajustar con soporte/resistencia si están disponibles
        if supports:
            nearest_support = min(supports, key=lambda s: abs(s - current_price))
            lower = min(nearest_support, current_price - atr_range)
        else:
            lower = current_price - atr_range

        if resistances:
            nearest_resistance = min(resistances, key=lambda r: abs(r - current_price))
            upper = max(nearest_resistance, current_price + atr_range)
        else:
            upper = current_price + atr_range

        # Asegurar que el precio actual está dentro del rango
        if lower >= current_price:
            lower = current_price - atr_range
        if upper <= current_price:
            upper = current_price + atr_range

        # Calcular número óptimo de niveles basado en el rango y ATR
        range_size = upper - lower
        optimal_levels = max(5, min(20, round(range_size / (atr * 0.5))))

        lower = round(lower, 2)
        upper = round(upper, 2)

        logger.info(f"=== Resultado del análisis ===")
        logger.info(f"Precio actual: {current_price:.2f}")
        logger.info(f"Rango sugerido: {lower:.2f} - {upper:.2f}")
        logger.info(f"Niveles óptimos: {optimal_levels}")
        logger.info(f"Tamaño del grid: {range_size:.2f} ({range_size / current_price * 100:.1f}%)")

        return {
            "current_price": current_price,
            "lower_price": lower,
            "upper_price": upper,
            "grid_levels": optimal_levels,
            "atr": round(atr, 2),
            "supports": supports,
            "resistances": resistances,
        }
