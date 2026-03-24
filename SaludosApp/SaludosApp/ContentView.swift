import SwiftUI

struct ContentView: View {
    @State private var currentGreeting = "¡Toca el botón!"
    @State private var isAnimating = false

    private let greetings = [
        Greeting(text: "¡Hola! ¿Cómo estás?", emoji: "👋"),
        Greeting(text: "¡Buenos días!", emoji: "🌅"),
        Greeting(text: "¡Buenas tardes!", emoji: "☀️"),
        Greeting(text: "¡Buenas noches!", emoji: "🌙"),
        Greeting(text: "¡Bienvenido!", emoji: "🎉"),
        Greeting(text: "¿Qué tal?", emoji: "😊"),
        Greeting(text: "¡Hola, amigo!", emoji: "🤝"),
        Greeting(text: "¡Qué gusto verte!", emoji: "😄"),
        Greeting(text: "¿Cómo te va?", emoji: "🙌"),
        Greeting(text: "¡Saludos!", emoji: "✨"),
    ]

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [.orange, .red, .yellow],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 40) {
                Text("Saludos")
                    .font(.system(size: 42, weight: .bold, design: .rounded))
                    .foregroundColor(.white)

                Text(currentGreeting)
                    .font(.system(size: 28, weight: .medium, design: .rounded))
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 30)
                    .scaleEffect(isAnimating ? 1.1 : 1.0)
                    .animation(.spring(response: 0.3), value: isAnimating)

                Button(action: generateGreeting) {
                    Text("Nuevo Saludo")
                        .font(.title2)
                        .fontWeight(.semibold)
                        .foregroundColor(.orange)
                        .padding(.horizontal, 40)
                        .padding(.vertical, 16)
                        .background(.white)
                        .clipShape(Capsule())
                        .shadow(radius: 10)
                }
            }
        }
    }

    private func generateGreeting() {
        let greeting = greetings.randomElement()!
        currentGreeting = "\(greeting.emoji) \(greeting.text)"
        isAnimating = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            isAnimating = false
        }
    }
}

struct Greeting {
    let text: String
    let emoji: String
}

#Preview {
    ContentView()
}
