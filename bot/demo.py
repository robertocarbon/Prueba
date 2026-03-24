import logging
import math
import random
import time
from datetime import datetime, timedelta

from bot.config import Config
from bot.grid import compute_grid_levels, quantity_per_grid
from bot.web.server import WebDashboard

logger = logging.getLogger("grid_bot")


def generate_fake_klines(base_price: float, hours: int = 168) -> list[dict]:
    """Genera velas simuladas realistas."""
    klines = []
    price = base_price * 0.97
    now = datetime.now()
    start = now - timedelta(hours=hours)

    for i in range(hours):
        t = start + timedelta(hours=i)
        timestamp = int(t.timestamp())

        # Simular movimiento de precio con tendencia + ruido
        trend = math.sin(i / 24 * math.pi) * base_price * 0.02
        noise = random.gauss(0, base_price * 0.003)
        price = price + trend * 0.01 + noise
        price = max(price, base_price * 0.90)

        open_p = price
        close_p = price + random.gauss(0, base_price * 0.002)
        high_p = max(open_p, close_p) + abs(random.gauss(0, base_price * 0.001))
        low_p = min(open_p, close_p) - abs(random.gauss(0, base_price * 0.001))

        klines.append({
            "time": timestamp,
            "open": round(open_p, 2),
            "high": round(high_p, 2),
            "low": round(low_p, 2),
            "close": round(close_p, 2),
        })

        price = close_p

    return klines


def run_demo():
    """Ejecuta el bot en modo demo con datos simulados."""
    base_price = 87500.0
    lower = 86000.0
    upper = 89000.0
    levels = 10
    investment = 1000.0

    logger.info("Iniciando modo DEMO...")

    dashboard = WebDashboard("BTCUSDT", testnet=True, port=5000)

    grid_prices = compute_grid_levels(lower, upper, levels)
    avg_price = (upper + lower) / 2
    qty = quantity_per_grid(investment, levels, avg_price)

    # Configurar dashboard
    dashboard.grid_prices = grid_prices
    dashboard.lower_price = lower
    dashboard.upper_price = upper
    dashboard.investment = investment
    dashboard.grid_levels = levels
    dashboard.atr = 445.20
    dashboard.supports = [86200.0, 85800.0]
    dashboard.resistances = [89100.0, 89500.0]

    # Generar velas simuladas
    dashboard.klines = generate_fake_klines(base_price)

    # Simular órdenes iniciales
    current_price = base_price
    active_orders = {}
    order_counter = 1

    for i, price in enumerate(grid_prices):
        if price < current_price:
            active_orders[str(order_counter)] = {
                "side": "BUY", "price": price, "grid_index": i
            }
        elif price > current_price:
            active_orders[str(order_counter)] = {
                "side": "SELL", "price": price, "grid_index": i
            }
        order_counter += 1

    dashboard.update(current_price, active_orders)
    dashboard.start()

    logger.info("Dashboard DEMO en http://localhost:5000")
    logger.info("Ctrl+C para detener")

    try:
        while True:
            time.sleep(5)

            # Simular movimiento de precio
            current_price += random.gauss(0, 80)
            current_price = max(lower - 500, min(upper + 500, current_price))

            # Simular fill aleatorio
            if random.random() < 0.15:
                fillable = [
                    (oid, info) for oid, info in active_orders.items()
                    if (info["side"] == "BUY" and info["price"] >= current_price - 100)
                    or (info["side"] == "SELL" and info["price"] <= current_price + 100)
                ]
                if fillable:
                    oid, info = random.choice(fillable)
                    del active_orders[oid]

                    grid_step = grid_prices[1] - grid_prices[0]
                    profit = grid_step * qty if info["side"] == "SELL" else 0.0

                    dashboard.update(
                        current_price,
                        active_orders,
                        filled_trade={
                            "side": info["side"],
                            "price": info["price"],
                            "time": datetime.now().strftime("%H:%M:%S"),
                            "profit": profit,
                        },
                    )

                    # Colocar orden opuesta
                    idx = info["grid_index"]
                    order_counter += 1
                    if info["side"] == "BUY" and idx + 1 < len(grid_prices):
                        active_orders[str(order_counter)] = {
                            "side": "SELL",
                            "price": grid_prices[idx + 1],
                            "grid_index": idx + 1,
                        }
                    elif info["side"] == "SELL" and idx - 1 >= 0:
                        active_orders[str(order_counter)] = {
                            "side": "BUY",
                            "price": grid_prices[idx - 1],
                            "grid_index": idx - 1,
                        }

            # Agregar nueva vela simulada periódicamente
            if dashboard.klines:
                last = dashboard.klines[-1]
                new_time = last["time"] + 3600
                dashboard.klines.append({
                    "time": new_time,
                    "open": round(current_price, 2),
                    "high": round(current_price + abs(random.gauss(0, 50)), 2),
                    "low": round(current_price - abs(random.gauss(0, 50)), 2),
                    "close": round(current_price + random.gauss(0, 30), 2),
                })

            dashboard.update(current_price, active_orders)

    except KeyboardInterrupt:
        logger.info("Demo detenida")
    finally:
        dashboard.stop()
