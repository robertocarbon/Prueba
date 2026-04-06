def compute_grid_levels(lower: float, upper: float, levels: int) -> list[float]:
    """Retorna niveles de precio equidistantes de lower a upper, inclusive."""
    step = (upper - lower) / (levels - 1)
    return [round(lower + i * step, 2) for i in range(levels)]


def quantity_per_grid(investment: float, levels: int, avg_price: float) -> float:
    """Cantidad de BTC a comprar/vender en cada nivel del grid."""
    usdt_per_level = investment / levels
    return round(usdt_per_level / avg_price, 5)
