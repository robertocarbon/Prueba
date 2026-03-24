import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass
class Config:
    api_key: str = os.getenv("POLYMARKET_API_KEY", "")
    api_secret: str = os.getenv("POLYMARKET_API_SECRET", "")
    api_passphrase: str = os.getenv("POLYMARKET_API_PASSPHRASE", "")
    private_key: str = os.getenv("POLYMARKET_PRIVATE_KEY", "")
    chain_id: int = int(os.getenv("CHAIN_ID", "137"))
    max_order_size: float = float(os.getenv("MAX_ORDER_SIZE", "50"))
    default_slippage: float = float(os.getenv("DEFAULT_SLIPPAGE", "0.02"))
    trading_interval: int = int(os.getenv("TRADING_INTERVAL_SECONDS", "60"))
    dry_run: bool = os.getenv("DRY_RUN", "true").lower() == "true"

    def validate(self):
        if not self.private_key:
            raise ValueError("POLYMARKET_PRIVATE_KEY is required")
        if not self.api_key:
            raise ValueError("POLYMARKET_API_KEY is required")
        if not self.api_secret:
            raise ValueError("POLYMARKET_API_SECRET is required")
        if not self.api_passphrase:
            raise ValueError("POLYMARKET_API_PASSPHRASE is required")
