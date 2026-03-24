import json
import logging
import threading
from datetime import datetime

from flask import Flask, render_template, jsonify

logger = logging.getLogger("grid_bot")


class WebDashboard:
    def __init__(self, symbol: str, testnet: bool, port: int = 5000):
        self.symbol = symbol
        self.testnet = testnet
        self.port = port

        self.current_price = 0.0
        self.grid_prices: list[float] = []
        self.active_orders: dict[str, dict] = {}
        self.filled_trades: list[dict] = []
        self.total_profit = 0.0
        self.lower_price = 0.0
        self.upper_price = 0.0
        self.investment = 0.0
        self.grid_levels = 0
        self.atr = 0.0
        self.supports: list[float] = []
        self.resistances: list[float] = []
        self.klines: list[dict] = []
        self.price_history: list[dict] = []

        self.app = Flask(
            __name__,
            template_folder=__file__.replace("server.py", "templates"),
        )
        self._setup_routes()

    def _setup_routes(self) -> None:
        @self.app.route("/")
        def index():
            return render_template("dashboard.html")

        @self.app.route("/api/state")
        def state():
            orders_list = []
            for oid, info in self.active_orders.items():
                orders_list.append({
                    "id": oid,
                    "side": info["side"],
                    "price": info["price"],
                    "grid_index": info["grid_index"],
                })

            return jsonify({
                "symbol": self.symbol,
                "testnet": self.testnet,
                "current_price": self.current_price,
                "grid_prices": self.grid_prices,
                "lower_price": self.lower_price,
                "upper_price": self.upper_price,
                "investment": self.investment,
                "grid_levels": self.grid_levels,
                "atr": self.atr,
                "supports": self.supports,
                "resistances": self.resistances,
                "active_orders": orders_list,
                "filled_trades": self.filled_trades[-50:],
                "total_profit": self.total_profit,
                "klines": self.klines[-100:],
                "price_history": self.price_history[-200:],
            })

    def start(self) -> None:
        thread = threading.Thread(
            target=lambda: self.app.run(
                host="0.0.0.0", port=self.port, debug=False, use_reloader=False
            ),
            daemon=True,
        )
        thread.start()
        logger.info(f"Dashboard web iniciado en http://localhost:{self.port}")

    def stop(self) -> None:
        pass  # Flask en daemon thread se detiene con el proceso

    def update(
        self,
        current_price: float,
        active_orders: dict[str, dict],
        filled_trade: dict | None = None,
    ) -> None:
        self.current_price = current_price
        self.active_orders = active_orders

        self.price_history.append({
            "time": datetime.now().strftime("%H:%M:%S"),
            "price": current_price,
        })

        if filled_trade:
            self.filled_trades.append(filled_trade)
            if filled_trade["side"] == "SELL":
                self.total_profit += filled_trade.get("profit", 0.0)
