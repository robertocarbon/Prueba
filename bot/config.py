import os
from dataclasses import dataclass

from dotenv import load_dotenv


@dataclass
class Config:
    api_key: str
    api_secret: str
    symbol: str
    upper_price: float
    lower_price: float
    grid_levels: int
    investment_amount: float
    testnet: bool


def load_config() -> Config:
    load_dotenv()

    config = Config(
        api_key=os.getenv("BINANCE_API_KEY", ""),
        api_secret=os.getenv("BINANCE_API_SECRET", ""),
        symbol=os.getenv("SYMBOL", "BTCUSDT"),
        upper_price=float(os.getenv("UPPER_PRICE", "0")),
        lower_price=float(os.getenv("LOWER_PRICE", "0")),
        grid_levels=int(os.getenv("GRID_LEVELS", "0")),
        investment_amount=float(os.getenv("INVESTMENT_AMOUNT", "0")),
        testnet=os.getenv("TESTNET", "true").lower() == "true",
    )

    if not config.api_key or not config.api_secret:
        raise ValueError("BINANCE_API_KEY y BINANCE_API_SECRET son requeridos")
    if config.upper_price <= config.lower_price:
        raise ValueError("UPPER_PRICE debe ser mayor que LOWER_PRICE")
    if config.grid_levels < 2:
        raise ValueError("GRID_LEVELS debe ser al menos 2")
    if config.investment_amount <= 0:
        raise ValueError("INVESTMENT_AMOUNT debe ser mayor que 0")

    return config
