import random


def greet():
    greetings = [
        "¡Hola! ¿Cómo estás?",
        "¡Buenos días!",
        "¡Buenas tardes!",
        "¡Buenas noches!",
        "¡Bienvenido!",
        "¿Qué tal?",
        "¡Hola, amigo!",
    ]
    return random.choice(greetings)


if __name__ == "__main__":
    print(greet())
