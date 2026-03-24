import logging
from collections import deque

from .base import BaseStrategy

logger = logging.getLogger(__name__)


class MomentumStrategy(BaseStrategy):
    """Simple momentum strategy that tracks price changes over a window
    and buys when price is trending up, sells when trending down."""

    def __init__(
        self,
        window_size: int = 10,
        threshold: float = 0.03,
        order_size: float = 10.0,
    ):
        self.window_size = window_size
        self.threshold = threshold
        self.order_size = order_size
        self.price_history: dict[str, deque] = {}

    def _get_history(self, token_id: str) -> deque:
        if token_id not in self.price_history:
            self.price_history[token_id] = deque(maxlen=self.window_size)
        return self.price_history[token_id]

    def evaluate(self, market_data: dict) -> list[dict]:
        signals = []
        token_id = market_data["token_id"]
        midpoint = market_data["midpoint"]
        spread_info = market_data["spread"]

        history = self._get_history(token_id)
        history.append(midpoint)

        if len(history) < self.window_size:
            logger.debug(
                "Token %s: collecting data (%d/%d)",
                token_id[:16], len(history), self.window_size,
            )
            return signals

        oldest = history[0]
        if oldest == 0:
            return signals

        pct_change = (midpoint - oldest) / oldest

        if pct_change > self.threshold:
            price = min(midpoint + spread_info["spread"] * 0.5, 0.99)
            signals.append({
                "token_id": token_id,
                "side": "BUY",
                "price": round(price, 4),
                "size": self.order_size,
                "reason": f"momentum up {pct_change:.2%}",
            })
            logger.info(
                "BUY signal: %s momentum=%.2%%", token_id[:16], pct_change * 100,
            )

        elif pct_change < -self.threshold:
            price = max(midpoint - spread_info["spread"] * 0.5, 0.01)
            signals.append({
                "token_id": token_id,
                "side": "SELL",
                "price": round(price, 4),
                "size": self.order_size,
                "reason": f"momentum down {pct_change:.2%}",
            })
            logger.info(
                "SELL signal: %s momentum=%.2%%", token_id[:16], pct_change * 100,
            )

        return signals
