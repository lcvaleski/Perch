import SwiftUI
import AuthenticationServices

struct AuthView: View {
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var themeManager: ThemeManager
    @State private var showingError = false

    var body: some View {
        ZStack {
            PerchColors.background
                .ignoresSafeArea()

            VStack(spacing: 40) {
                // Wallet image
                Image("wallet")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 100, height: 100)

                VStack(spacing: 20) {
                    // Sign in with Apple button
                    SignInWithAppleButton(
                        .signIn,
                        onRequest: { request in
                            request.requestedScopes = [.fullName, .email]
                        },
                        onCompletion: { result in
                            authManager.handleSignInWithApple(result: result)
                            showingError = authManager.authError != nil
                        }
                    )
                    .signInWithAppleButtonStyle(.black)
                    .frame(width: 220, height: 44)

                    // Development login for simulator
                    if authManager.isSimulator {
                        Button(action: {
                            authManager.performDevelopmentLogin()
                        }) {
                            HStack {
                                Image(systemName: "person.fill")
                                Text("Continue as Guest")
                            }
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.white)
                            .frame(width: 220, height: 44)
                            .background(themeManager.activeTheme.primary)
                            .cornerRadius(8)
                        }
                    }
                }

                // Error message
                if let error = authManager.authError {
                    Text(error)
                        .font(.system(size: 14))
                        .foregroundColor(.red)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 40)
                        .opacity(showingError ? 1 : 0)
                        .animation(.easeInOut(duration: 0.3), value: showingError)
                }
            }
            .padding(.horizontal, 40)
        }
        .onChange(of: authManager.authError) { _ in
            showingError = authManager.authError != nil
        }
    }
}