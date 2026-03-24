from bot.config import load_config
from bot.logger_setup import setup_logger
from bot.trader import GridTrader


def main():
    logger = setup_logger()
    logger.info("Cargando configuración...")

    try:
        config = load_config()
    except ValueError as e:
        logger.error(f"Error de configuración: {e}")
        return

    trader = GridTrader(config)
    trader.run()


if __name__ == "__main__":
    main()
