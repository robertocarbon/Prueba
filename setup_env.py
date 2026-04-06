import getpass

print("=== Configuración del Grid Trading Bot ===\n")

api_key = getpass.getpass("Pega tu API Key y pulsa Enter: ")
api_secret = getpass.getpass("Pega tu Secret Key y pulsa Enter: ")

with open(".env", "w") as f:
    f.write(f"BINANCE_API_KEY={api_key}\n")
    f.write(f"BINANCE_API_SECRET={api_secret}\n")
    f.write("SYMBOL=BTCUSDT\n")
    f.write("INVESTMENT_AMOUNT=1000.0\n")
    f.write("TESTNET=false\n")
    f.write("AUTO_ANALYZE=true\n")

print("\n¡Listo! Archivo .env creado.")
print("Ahora ejecuta: python main.py")
