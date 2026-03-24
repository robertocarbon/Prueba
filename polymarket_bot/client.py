import logging

from py_clob_client.client import ClobClient
from py_clob_client.clob_types import OrderArgs, OrderType
from py_clob_client.order_builder.constants import BUY, SELL

from .config import Config

logger = logging.getLogger(__name__)

HOST = "https://clob.polymarket.com"


class PolymarketClient:
    def __init__(self, config: Config):
        self.config = config
        self.client = ClobClient(
            HOST,
            key=config.api_key,
            chain_id=config.chain_id,
            signature_type=2,
            funder=config.private_key,
        )
        self.client.set_api_creds(
            self.client.create_or_derive_api_creds()
        )
        logger.info("Polymarket client initialized")

    def get_markets(self, next_cursor: str = "") -> dict:
        return self.client.get_markets(next_cursor=next_cursor)

    def get_market(self, condition_id: str) -> dict:
        return self.client.get_market(condition_id)

    def get_orderbook(self, token_id: str) -> dict:
        return self.client.get_order_book(token_id)

    def get_midpoint(self, token_id: str) -> float:
        book = self.get_orderbook(token_id)
        best_bid = float(book.bids[0].price) if book.bids else 0
        best_ask = float(book.asks[0].price) if book.asks else 1
        return (best_bid + best_ask) / 2

    def get_spread(self, token_id: str) -> dict:
        book = self.get_orderbook(token_id)
        best_bid = float(book.bids[0].price) if book.bids else 0
        best_ask = float(book.asks[0].price) if book.asks else 1
        return {
            "bid": best_bid,
            "ask": best_ask,
            "spread": best_ask - best_bid,
            "midpoint": (best_bid + best_ask) / 2,
        }

    def place_order(
        self,
        token_id: str,
        side: str,
        price: float,
        size: float,
    ) -> dict | None:
        if size > self.config.max_order_size:
            logger.warning(
                "Order size %.2f exceeds max %.2f, capping",
                size,
                self.config.max_order_size,
            )
            size = self.config.max_order_size

        side_val = BUY if side.upper() == "BUY" else SELL

        if self.config.dry_run:
            logger.info(
                "[DRY RUN] %s %.2f @ %.4f on %s",
                side, size, price, token_id[:16],
            )
            return {"dry_run": True, "side": side, "size": size, "price": price}

        order_args = OrderArgs(
            price=price,
            size=size,
            side=side_val,
            token_id=token_id,
        )
        signed_order = self.client.create_order(order_args)
        result = self.client.post_order(signed_order, OrderType.GTC)
        logger.info(
            "Order placed: %s %.2f @ %.4f -> %s",
            side, size, price, result,
        )
        return result

    def cancel_order(self, order_id: str) -> dict:
        result = self.client.cancel(order_id)
        logger.info("Order cancelled: %s", order_id)
        return result

    def get_open_orders(self) -> list:
        return self.client.get_orders()

    def cancel_all_orders(self) -> list:
        results = self.client.cancel_all()
        logger.info("All orders cancelled")
        return results
