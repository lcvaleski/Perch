import SwiftUI
import AuthenticationServices

@main
struct PerchApp: App {
    @StateObject private var themeManager = ThemeManager()
    @StateObject private var authManager = AuthManager()
    @StateObject private var plaidService = PlaidService()
    @State private var showSplash = true

    var body: some Scene {
        WindowGroup {
            Group {
                if showSplash {
                    SplashView()
                        .onAppear {
                            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                                withAnimation {
                                    showSplash = false
                                }
                            }
                        }
                } else if authManager.isAuthenticated {
                    MainView()
                        .environmentObject(themeManager)
                        .environmentObject(authManager)
                        .environmentObject(plaidService)
                } else {
                    AuthView()
                        .environmentObject(themeManager)
                        .environmentObject(authManager)
                        .environmentObject(plaidService)
                }
            }
            .preferredColorScheme(.light)
        }
    }
}

struct SplashView: View {
    var body: some View {
        ZStack {
            PerchColors.background
                .ignoresSafeArea()

            VStack {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: Color(red: 70/255, green: 130/255, blue: 180/255)))
                    .scaleEffect(1.2)
                Text("Loading Perch...")
                    .font(.system(size: 16))
                    .foregroundColor(PerchColors.textSecondary)
                    .padding(.top, 16)
            }
        }
    }
}