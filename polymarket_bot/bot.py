import logging
import time

from .client import PolymarketClient
from .config import Config
from .strategies.base import BaseStrategy

logger = logging.getLogger(__name__)


class TradingBot:
    def __init__(self, config: Config, strategy: BaseStrategy, token_ids: list[str]):
        self.config = config
        self.strategy = strategy
        self.token_ids = token_ids
        self.client = PolymarketClient(config)
        self.running = False

    def _process_token(self, token_id: str):
        try:
            spread_info = self.client.get_spread(token_id)
            market_data = {
                "token_id": token_id,
                "midpoint": spread_info["midpoint"],
                "spread": spread_info,
            }

            signals = self.strategy.evaluate(market_data)

            for signal in signals:
                logger.info(
                    "Signal: %s %s %.2f @ %.4f (%s)",
                    signal["side"],
                    signal["token_id"][:16],
                    signal["size"],
                    signal["price"],
                    signal.get("reason", ""),
                )
                self.client.place_order(
                    token_id=signal["token_id"],
                    side=signal["side"],
                    price=signal["price"],
                    size=signal["size"],
                )

        except Exception:
            logger.exception("Error processing token %s", token_id[:16])

    def run_once(self):
        logger.info("Running trading cycle for %d tokens", len(self.token_ids))
        for token_id in self.token_ids:
            self._process_token(token_id)

    def run(self):
        self.running = True
        logger.info(
            "Bot started | strategy=%s | tokens=%d | interval=%ds | dry_run=%s",
            type(self.strategy).__name__,
            len(self.token_ids),
            self.config.trading_interval,
            self.config.dry_run,
        )

        while self.running:
            self.run_once()
            logger.info(
                "Sleeping %d seconds until next cycle", self.config.trading_interval,
            )
            time.sleep(self.config.trading_interval)

    def stop(self):
        self.running = False
        logger.info("Bot stopped")
