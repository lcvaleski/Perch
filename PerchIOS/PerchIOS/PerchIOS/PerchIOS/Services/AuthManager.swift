import Foundation
import AuthenticationServices
import SwiftUI

class AuthManager: ObservableObject {
    @Published var isAuthenticated = false
    @Published var user: String?
    @Published var email: String?
    @Published var fullName: PersonNameComponents?
    @Published var authError: String?

    private let userKey = "apple_auth_user"
    private let emailKey = "apple_auth_email"
    private let nameKey = "apple_auth_name"

    // Check if running on simulator
    var isSimulator: Bool {
        #if targetEnvironment(simulator)
        return true
        #else
        return false
        #endif
    }

    init() {
        checkAuthStatus()
    }

    func checkAuthStatus() {
        if let userData = UserDefaults.standard.string(forKey: userKey) {
            self.user = userData
            self.email = UserDefaults.standard.string(forKey: emailKey)
            if let nameData = UserDefaults.standard.data(forKey: nameKey) {
                self.fullName = try? JSONDecoder().decode(PersonNameComponents.self, from: nameData)
            }
            self.isAuthenticated = true
        }
    }

    // Development login for simulator
    func performDevelopmentLogin() {
        let userId = "dev_user_\(UUID().uuidString.prefix(8))"
        let email = "dev@perch.app"
        var fullName = PersonNameComponents()
        fullName.givenName = "Development"
        fullName.familyName = "User"

        // Store user information
        UserDefaults.standard.set(userId, forKey: userKey)
        UserDefaults.standard.set(email, forKey: emailKey)
        if let nameData = try? JSONEncoder().encode(fullName) {
            UserDefaults.standard.set(nameData, forKey: nameKey)
        }

        self.user = userId
        self.email = email
        self.fullName = fullName
        self.isAuthenticated = true
        self.authError = nil
    }

    func handleSignInWithApple(result: Result<ASAuthorization, Error>) {
        switch result {
        case .success(let authResults):
            if let appleIDCredential = authResults.credential as? ASAuthorizationAppleIDCredential {
                let userId = appleIDCredential.user
                let email = appleIDCredential.email
                let fullName = appleIDCredential.fullName

                // Store user information
                UserDefaults.standard.set(userId, forKey: userKey)
                if let email = email {
                    UserDefaults.standard.set(email, forKey: emailKey)
                }
                if let fullName = fullName,
                   let nameData = try? JSONEncoder().encode(fullName) {
                    UserDefaults.standard.set(nameData, forKey: nameKey)
                }

                self.user = userId
                self.email = email
                self.fullName = fullName
                self.isAuthenticated = true
                self.authError = nil
            }
        case .failure(let error):
            print("Apple Sign In failed: \(error.localizedDescription)")
            self.authError = "Sign in failed. Please try again."

            // On simulator, suggest using development login
            if isSimulator {
                self.authError = "Apple Sign In doesn't work on simulator. Use 'Continue as Guest' instead."
            }
        }
    }

    func signOut() {
        UserDefaults.standard.removeObject(forKey: userKey)
        UserDefaults.standard.removeObject(forKey: emailKey)
        UserDefaults.standard.removeObject(forKey: nameKey)
        self.user = nil
        self.email = nil
        self.fullName = nil
        self.isAuthenticated = false
    }
}

// PersonNameComponents already conforms to Codable in Foundation