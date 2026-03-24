from abc import ABC, abstractmethod


class BaseStrategy(ABC):
    @abstractmethod
    def evaluate(self, market_data: dict) -> list[dict]:
        """Evaluate market data and return a list of signals.

        Each signal is a dict with keys:
            - token_id: str
            - side: "BUY" or "SELL"
            - price: float
            - size: float
        """
        pass
