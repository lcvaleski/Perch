import SwiftUI

struct ContentView: View {
    @EnvironmentObject var themeManager: ThemeManager
    @EnvironmentObject var authManager: AuthManager

    var body: some View {
        Group {
            if authManager.isAuthenticated {
                MainView()
                    .environmentObject(themeManager)
                    .environmentObject(authManager)
            } else {
                AuthView()
                    .environmentObject(themeManager)
                    .environmentObject(authManager)
            }
        }
    }
}