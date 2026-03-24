import os
from datetime import datetime

from rich.console import Console
from rich.layout import Layout
from rich.live import Live
from rich.panel import Panel
from rich.table import Table
from rich.text import Text


class Dashboard:
    def __init__(self, symbol: str, testnet: bool):
        self.symbol = symbol
        self.testnet = testnet
        self.console = Console()
        self.current_price = 0.0
        self.grid_prices: list[float] = []
        self.active_orders: dict[str, dict] = {}
        self.filled_trades: list[dict] = []
        self.total_profit = 0.0
        self.lower_price = 0.0
        self.upper_price = 0.0
        self.investment = 0.0
        self.atr = 0.0
        self.supports: list[float] = []
        self.resistances: list[float] = []
        self._live: Live | None = None

    def start(self) -> Live:
        self._live = Live(
            self._build_layout(),
            console=self.console,
            refresh_per_second=1,
            screen=True,
        )
        self._live.start()
        return self._live

    def stop(self) -> None:
        if self._live:
            self._live.stop()

    def update(
        self,
        current_price: float,
        active_orders: dict[str, dict],
        filled_trade: dict | None = None,
    ) -> None:
        self.current_price = current_price
        self.active_orders = active_orders

        if filled_trade:
            self.filled_trades.append(filled_trade)
            if filled_trade["side"] == "SELL":
                self.total_profit += filled_trade.get("profit", 0.0)

        if self._live:
            self._live.update(self._build_layout())

    def _build_layout(self) -> Layout:
        layout = Layout()
        layout.split_column(
            Layout(name="header", size=3),
            Layout(name="body"),
            Layout(name="footer", size=3),
        )
        layout["body"].split_row(
            Layout(name="left", ratio=1),
            Layout(name="right", ratio=1),
        )
        layout["left"].split_column(
            Layout(name="grid", ratio=2),
            Layout(name="analysis", ratio=1),
        )
        layout["right"].split_column(
            Layout(name="orders", ratio=1),
            Layout(name="trades", ratio=1),
        )

        layout["header"].update(self._header_panel())
        layout["grid"].update(self._grid_panel())
        layout["analysis"].update(self._analysis_panel())
        layout["orders"].update(self._orders_panel())
        layout["trades"].update(self._trades_panel())
        layout["footer"].update(self._footer_panel())

        return layout

    def _header_panel(self) -> Panel:
        mode = "[yellow]TESTNET[/yellow]" if self.testnet else "[red]REAL[/red]"
        price_text = f"[bold white]{self.symbol}[/bold white]  [bold cyan]${self.current_price:,.2f}[/bold cyan]  {mode}"
        return Panel(Text.from_markup(price_text, justify="center"), style="bold blue")

    def _grid_panel(self) -> Panel:
        table = Table(show_header=True, expand=True, header_style="bold magenta")
        table.add_column("Nivel", justify="center", width=6)
        table.add_column("Precio", justify="right")
        table.add_column("Tipo", justify="center")
        table.add_column("Estado", justify="center")

        # Encontrar órdenes activas por precio
        order_by_price: dict[float, dict] = {}
        for info in self.active_orders.values():
            order_by_price[info["price"]] = info

        for i, price in enumerate(reversed(self.grid_prices)):
            idx = len(self.grid_prices) - 1 - i
            order = order_by_price.get(price)

            if order:
                side = order["side"]
                if side == "BUY":
                    tipo = "[green]BUY[/green]"
                    estado = "[green]Activa[/green]"
                else:
                    tipo = "[red]SELL[/red]"
                    estado = "[red]Activa[/red]"
            else:
                tipo = "-"
                estado = "[dim]---[/dim]"

            # Resaltar el nivel más cercano al precio actual
            price_str = f"${price:,.2f}"
            if self.grid_prices and abs(price - self.current_price) == min(
                abs(p - self.current_price) for p in self.grid_prices
            ):
                price_str = f"[bold yellow]► ${price:,.2f}[/bold yellow]"

            table.add_row(str(idx), price_str, tipo, estado)

        return Panel(table, title="Grid", border_style="green")

    def _analysis_panel(self) -> Panel:
        lines = []
        lines.append(f"[bold]Rango:[/bold] ${self.lower_price:,.2f} - ${self.upper_price:,.2f}")
        lines.append(f"[bold]ATR:[/bold] ${self.atr:,.2f}")
        lines.append(f"[bold]Inversión:[/bold] ${self.investment:,.2f} USDT")

        if self.supports:
            s = ", ".join(f"${p:,.2f}" for p in self.supports[:3])
            lines.append(f"[green]Soportes:[/green] {s}")
        if self.resistances:
            r = ", ".join(f"${p:,.2f}" for p in self.resistances[:3])
            lines.append(f"[red]Resistencias:[/red] {r}")

        return Panel("\n".join(lines), title="Análisis", border_style="cyan")

    def _orders_panel(self) -> Panel:
        table = Table(show_header=True, expand=True, header_style="bold")
        table.add_column("Lado", justify="center")
        table.add_column("Precio", justify="right")
        table.add_column("Grid #", justify="center")

        buy_orders = []
        sell_orders = []
        for info in self.active_orders.values():
            if info["side"] == "BUY":
                buy_orders.append(info)
            else:
                sell_orders.append(info)

        for info in sorted(sell_orders, key=lambda x: x["price"], reverse=True):
            table.add_row(
                "[red]SELL[/red]",
                f"${info['price']:,.2f}",
                str(info["grid_index"]),
            )
        for info in sorted(buy_orders, key=lambda x: x["price"], reverse=True):
            table.add_row(
                "[green]BUY[/green]",
                f"${info['price']:,.2f}",
                str(info["grid_index"]),
            )

        title = f"Órdenes Activas ({len(self.active_orders)})"
        return Panel(table, title=title, border_style="yellow")

    def _trades_panel(self) -> Panel:
        table = Table(show_header=True, expand=True, header_style="bold")
        table.add_column("Hora", justify="center")
        table.add_column("Lado", justify="center")
        table.add_column("Precio", justify="right")

        # Mostrar las últimas 10 operaciones
        for trade in reversed(self.filled_trades[-10:]):
            side = "[green]BUY[/green]" if trade["side"] == "BUY" else "[red]SELL[/red]"
            time_str = trade.get("time", "")
            table.add_row(time_str, side, f"${trade['price']:,.2f}")

        profit_color = "green" if self.total_profit >= 0 else "red"
        title = f"Trades | Ganancia: [{profit_color}]${self.total_profit:,.2f}[/{profit_color}]"
        return Panel(table, title=title, border_style="magenta")

    def _footer_panel(self) -> Panel:
        now = datetime.now().strftime("%H:%M:%S")
        text = f"[dim]Última actualización: {now} | Ctrl+C para detener[/dim]"
        return Panel(Text.from_markup(text, justify="center"), style="dim")
