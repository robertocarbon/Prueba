import sys

from bot.logger_setup import setup_logger


def main():
    logger = setup_logger()

    if "--demo" in sys.argv:
        logger.info("Iniciando modo DEMO...")
        from bot.demo import run_demo
        run_demo()
        return

    logger.info("Cargando configuración...")
    from bot.config import load_config
    from bot.trader import GridTrader

    try:
        config = load_config()
    except ValueError as e:
        logger.error(f"Error de configuración: {e}")
        return

    trader = GridTrader(config)
    trader.run()


if __name__ == "__main__":
    main()
