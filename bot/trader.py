import logging
import time
from datetime import datetime

from binance.client import Client
from binance.exceptions import BinanceAPIException, BinanceOrderException

from bot.analyzer import MarketAnalyzer
from bot.config import Config
from bot.dashboard import Dashboard
from bot.grid import compute_grid_levels, quantity_per_grid

logger = logging.getLogger("grid_bot")


class GridTrader:
    def __init__(self, config: Config):
        self.config = config
        self.client = Client(
            config.api_key, config.api_secret, testnet=config.testnet
        )
        self.dashboard = Dashboard(config.symbol, config.testnet)
        self._analysis_result: dict | None = None

        if config.auto_analyze:
            self._apply_market_analysis()

        self.grid_prices = compute_grid_levels(
            config.lower_price, config.upper_price, config.grid_levels
        )
        self.active_orders: dict[str, dict] = {}

        # Configurar dashboard con datos del grid
        self.dashboard.grid_prices = self.grid_prices
        self.dashboard.lower_price = config.lower_price
        self.dashboard.upper_price = config.upper_price
        self.dashboard.investment = config.investment_amount
        if self._analysis_result:
            self.dashboard.atr = self._analysis_result.get("atr", 0.0)
            self.dashboard.supports = self._analysis_result.get("supports", [])
            self.dashboard.resistances = self._analysis_result.get("resistances", [])

    def _apply_market_analysis(self) -> None:
        """Analiza el mercado y ajusta los parámetros del grid automáticamente."""
        analyzer = MarketAnalyzer(self.client, self.config.symbol)
        self._analysis_result = analyzer.analyze()

        self.config.lower_price = self._analysis_result["lower_price"]
        self.config.upper_price = self._analysis_result["upper_price"]
        self.config.grid_levels = self._analysis_result["grid_levels"]

        logger.info(
            f"Grid ajustado por análisis: "
            f"{self._analysis_result['lower_price']:.2f} - {self._analysis_result['upper_price']:.2f}, "
            f"{self._analysis_result['grid_levels']} niveles"
        )

    def get_current_price(self) -> float:
        ticker = self.client.get_symbol_ticker(symbol=self.config.symbol)
        return float(ticker["price"])

    def place_buy_order(self, price: float, quantity: float, grid_index: int) -> None:
        try:
            order = self.client.order_limit_buy(
                symbol=self.config.symbol,
                quantity=f"{quantity:.5f}",
                price=f"{price:.2f}",
            )
            order_id = str(order["orderId"])
            self.active_orders[order_id] = {
                "side": "BUY",
                "price": price,
                "grid_index": grid_index,
            }
            logger.info(f"BUY order colocada: precio={price:.2f}, cantidad={quantity:.5f}, id={order_id}")
        except (BinanceAPIException, BinanceOrderException) as e:
            logger.error(f"Error colocando BUY en {price:.2f}: {e}")

    def place_sell_order(self, price: float, quantity: float, grid_index: int) -> None:
        try:
            order = self.client.order_limit_sell(
                symbol=self.config.symbol,
                quantity=f"{quantity:.5f}",
                price=f"{price:.2f}",
            )
            order_id = str(order["orderId"])
            self.active_orders[order_id] = {
                "side": "SELL",
                "price": price,
                "grid_index": grid_index,
            }
            logger.info(f"SELL order colocada: precio={price:.2f}, cantidad={quantity:.5f}, id={order_id}")
        except (BinanceAPIException, BinanceOrderException) as e:
            logger.error(f"Error colocando SELL en {price:.2f}: {e}")

    def setup_initial_grid(self) -> None:
        current_price = self.get_current_price()
        logger.info(f"Precio actual de {self.config.symbol}: {current_price:.2f}")

        avg_price = (self.config.upper_price + self.config.lower_price) / 2
        qty = quantity_per_grid(
            self.config.investment_amount, self.config.grid_levels, avg_price
        )
        logger.info(f"Cantidad por nivel: {qty:.5f} BTC")
        logger.info(f"Niveles del grid: {self.grid_prices}")

        for i, price in enumerate(self.grid_prices):
            if price < current_price:
                self.place_buy_order(price, qty, i)
            elif price > current_price:
                self.place_sell_order(price, qty, i)

    def check_and_replace_orders(self) -> None:
        open_orders = self.client.get_open_orders(symbol=self.config.symbol)
        open_order_ids = {str(o["orderId"]) for o in open_orders}

        filled_orders = {
            oid: info
            for oid, info in self.active_orders.items()
            if oid not in open_order_ids
        }

        if not filled_orders:
            return

        avg_price = (self.config.upper_price + self.config.lower_price) / 2
        qty = quantity_per_grid(
            self.config.investment_amount, self.config.grid_levels, avg_price
        )

        grid_step = self.grid_prices[1] - self.grid_prices[0] if len(self.grid_prices) > 1 else 0

        for order_id, info in filled_orders.items():
            del self.active_orders[order_id]
            side = info["side"]
            idx = info["grid_index"]
            price = info["price"]

            logger.info(f"Orden {side} ejecutada en {price:.2f} (grid index {idx})")

            # Calcular ganancia estimada por ciclo grid
            profit = grid_step * qty if side == "SELL" else 0.0

            self.dashboard.update(
                self.current_price,
                self.active_orders,
                filled_trade={
                    "side": side,
                    "price": price,
                    "time": datetime.now().strftime("%H:%M:%S"),
                    "profit": profit,
                },
            )

            if side == "BUY" and idx + 1 < len(self.grid_prices):
                sell_price = self.grid_prices[idx + 1]
                self.place_sell_order(sell_price, qty, idx + 1)
            elif side == "SELL" and idx - 1 >= 0:
                buy_price = self.grid_prices[idx - 1]
                self.place_buy_order(buy_price, qty, idx - 1)

    def cancel_all_orders(self) -> None:
        logger.info("Cancelando todas las órdenes abiertas...")
        for order_id in list(self.active_orders.keys()):
            try:
                self.client.cancel_order(
                    symbol=self.config.symbol, orderId=int(order_id)
                )
                logger.info(f"Orden {order_id} cancelada")
            except BinanceAPIException as e:
                logger.warning(f"No se pudo cancelar orden {order_id}: {e}")
        self.active_orders.clear()

    def run(self, poll_interval: int = 30) -> None:
        logger.info("Iniciando Grid Trading Bot...")
        logger.info(
            f"Config: {self.config.symbol} | "
            f"Rango: {self.config.lower_price}-{self.config.upper_price} | "
            f"Niveles: {self.config.grid_levels} | "
            f"Inversión: {self.config.investment_amount} USDT | "
            f"Testnet: {self.config.testnet}"
        )

        self.setup_initial_grid()
        self.current_price = self.get_current_price()

        # Iniciar dashboard
        self.dashboard.update(self.current_price, self.active_orders)
        self.dashboard.start()

        consecutive_errors = 0

        try:
            while True:
                time.sleep(poll_interval)
                try:
                    self.current_price = self.get_current_price()
                    self.check_and_replace_orders()
                    self.dashboard.update(self.current_price, self.active_orders)
                    consecutive_errors = 0
                except (BinanceAPIException, ConnectionError, TimeoutError) as e:
                    consecutive_errors += 1
                    logger.warning(
                        f"Error en poll ({consecutive_errors}/5): {e}"
                    )
                    if consecutive_errors >= 5:
                        logger.error(
                            "Demasiados errores consecutivos, deteniendo bot"
                        )
                        break
        except KeyboardInterrupt:
            logger.info("Bot detenido por el usuario (Ctrl+C)")
        finally:
            self.dashboard.stop()
            self.cancel_all_orders()
            logger.info("Bot finalizado")
