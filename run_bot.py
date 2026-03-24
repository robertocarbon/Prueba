#!/usr/bin/env python3
"""Polymarket Trading Bot - Entry Point

Usage:
    python run_bot.py --tokens TOKEN_ID1,TOKEN_ID2 [--strategy momentum|mean_reversion]

Before running:
    1. Copy .env.example to .env and fill in your credentials
    2. pip install -r requirements.txt
"""

import argparse
import logging
import signal
import sys

from polymarket_bot.bot import TradingBot
from polymarket_bot.config import Config
from polymarket_bot.strategies.mean_reversion import MeanReversionStrategy
from polymarket_bot.strategies.momentum import MomentumStrategy

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("polymarket_bot.log"),
    ],
)
logger = logging.getLogger(__name__)

STRATEGIES = {
    "momentum": lambda: MomentumStrategy(window_size=10, threshold=0.03, order_size=10),
    "mean_reversion": lambda: MeanReversionStrategy(window_size=20, threshold=0.05, order_size=10),
}


def main():
    parser = argparse.ArgumentParser(description="Polymarket Trading Bot")
    parser.add_argument(
        "--tokens",
        required=True,
        help="Comma-separated list of token IDs to trade",
    )
    parser.add_argument(
        "--strategy",
        choices=list(STRATEGIES.keys()),
        default="momentum",
        help="Trading strategy to use (default: momentum)",
    )
    args = parser.parse_args()

    token_ids = [t.strip() for t in args.tokens.split(",") if t.strip()]
    if not token_ids:
        logger.error("No token IDs provided")
        sys.exit(1)

    config = Config()
    config.validate()

    strategy = STRATEGIES[args.strategy]()
    bot = TradingBot(config, strategy, token_ids)

    def shutdown(signum, frame):
        logger.info("Shutdown signal received")
        bot.stop()

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    logger.info("Starting bot with strategy: %s", args.strategy)
    logger.info("Trading tokens: %s", token_ids)
    logger.info("Dry run: %s", config.dry_run)

    bot.run()


if __name__ == "__main__":
    main()
