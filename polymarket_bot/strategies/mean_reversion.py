import logging
from collections import deque

from .base import BaseStrategy

logger = logging.getLogger(__name__)


class MeanReversionStrategy(BaseStrategy):
    """Mean reversion strategy: buy when price drops below the moving average
    by a threshold, sell when it rises above."""

    def __init__(
        self,
        window_size: int = 20,
        threshold: float = 0.05,
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

        history = self._get_history(token_id)
        history.append(midpoint)

        if len(history) < self.window_size:
            logger.debug(
                "Token %s: collecting data (%d/%d)",
                token_id[:16], len(history), self.window_size,
            )
            return signals

        mean = sum(history) / len(history)
        if mean == 0:
            return signals

        deviation = (midpoint - mean) / mean

        if deviation < -self.threshold:
            signals.append({
                "token_id": token_id,
                "side": "BUY",
                "price": round(midpoint, 4),
                "size": self.order_size,
                "reason": f"below mean by {abs(deviation):.2%}",
            })
            logger.info(
                "BUY signal: %s deviation=%.2f%%", token_id[:16], deviation * 100,
            )

        elif deviation > self.threshold:
            signals.append({
                "token_id": token_id,
                "side": "SELL",
                "price": round(midpoint, 4),
                "size": self.order_size,
                "reason": f"above mean by {deviation:.2%}",
            })
            logger.info(
                "SELL signal: %s deviation=%.2f%%", token_id[:16], deviation * 100,
            )

        return signals
