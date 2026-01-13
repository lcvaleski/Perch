import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var themeManager: ThemeManager
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var plaidService: PlaidService
    @Environment(\.dismiss) var dismiss

    @State private var lunchMoneyKey = ""
    @State private var usePlaid = false
    @State private var plaidConnected = false
    @State private var selectedTheme: ThemeKey = .river
    @State private var showAlert = false
    @State private var alertMessage = ""
    @State private var dragOffset: CGSize = .zero
    @State private var showingPlaidLink = false
    @StateObject private var hapticManager = HapticManager()
    @Binding var demoMode: Bool

    var body: some View {
        NavigationView {
            ZStack {
                PerchColors.background
                    .ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 24) {
                        // Pill indicator
                        Capsule()
                            .fill(Color(white: 0.82))
                            .frame(width: 40, height: 5)
                            .padding(.top, 12)

                        // Settings content
                        VStack(spacing: 24) {
                            // Use Plaid toggle
                            Toggle(isOn: $usePlaid) {
                                Text("Use Plaid")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(PerchColors.text)
                            }
                            .tint(themeManager.activeTheme.primaryLighter)
                            .onChange(of: usePlaid) { _ in
                                hapticManager.impact(.light)
                            }

                            if usePlaid {
                                // Plaid Connection
                                plaidConnectionSection
                            } else {
                                // LunchMoney API Key
                                lunchMoneySection

                                // Color Theme
                                colorThemeSection
                            }

                            // Demo Mode Toggle
                            Toggle(isOn: $demoMode) {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Demo Mode (App Store Video)")
                                        .font(.system(size: 14, weight: .medium))
                                        .foregroundColor(PerchColors.text)
                                    Text("Shows sample transactions for recording")
                                        .font(.system(size: 12))
                                        .foregroundColor(PerchColors.textSecondaryOpacity06)
                                }
                            }
                            .tint(themeManager.activeTheme.primaryLighter)
                            .onChange(of: demoMode) { _ in
                                hapticManager.impact(.light)
                            }

                            // Sign Out button (iOS only)
                            #if os(iOS)
                            Button(action: signOut) {
                                Text("Sign Out")
                                    .font(.system(size: 16, weight: .semibold))
                                    .foregroundColor(.white)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 14)
                                    .background(themeManager.activeTheme.primary)
                                    .cornerRadius(8)
                            }
                            .padding(.top, 20)
                            #endif
                        }
                        .padding(.horizontal, 20)
                        .padding(.top, 20)
                    }
                }
            }
            .navigationBarHidden(true)
            .overlay(
                // Custom navigation bar
                HStack {
                    Button(action: cancel) {
                        Image(systemName: "xmark")
                            .font(.system(size: 28))
                            .foregroundColor(PerchColors.textSecondary)
                            .frame(width: 44, height: 44)
                    }

                    Spacer()

                    Button(action: save) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 32))
                            .foregroundColor(themeManager.activeTheme.primary)
                            .frame(width: 44, height: 44)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 35),
                alignment: .top
            )
        }
        .alert("Settings", isPresented: $showAlert) {
            Button("OK", role: .cancel) { }
        } message: {
            Text(alertMessage)
        }
        .onAppear {
            loadSettings()
        }
        .gesture(
            DragGesture()
                .onChanged { value in
                    if value.translation.height > 0 {
                        dragOffset = value.translation
                    }
                }
                .onEnded { value in
                    if value.translation.height > 100 {
                        hapticManager.impact(.light)
                        dismiss()
                    } else {
                        withAnimation(.spring()) {
                            dragOffset = .zero
                        }
                    }
                }
        )
        .offset(y: max(0, dragOffset.height))
        .sheet(isPresented: $showingPlaidLink) {
            PlaidLinkView()
                .environmentObject(plaidService)
                .environmentObject(themeManager)
        }
        .onChange(of: plaidService.isConnected) { newValue in
            plaidConnected = newValue
        }
    }

    private var plaidConnectionSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Plaid Connection")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(PerchColors.text)

            if plaidConnected {
                HStack {
                    Text("✓ Bank account connected")
                        .font(.system(size: 14))
                        .foregroundColor(PerchColors.text)

                    Spacer()

                    Button("Disconnect") {
                        hapticManager.impact(.medium)
                        disconnectPlaid()
                    }
                    .font(.system(size: 14))
                    .foregroundColor(themeManager.activeTheme.primary)
                }
                .padding()
                .background(Color.white)
                .cornerRadius(8)
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(PerchColors.border, lineWidth: 1)
                )
            } else {
                VStack(spacing: 16) {
                    Text("Add Bank Account")
                        .font(.system(size: 14))
                        .foregroundColor(PerchColors.textSecondary)

                    Button(action: connectPlaid) {
                        Text("+")
                            .font(.system(size: 36, weight: .light))
                            .foregroundColor(.white)
                            .frame(width: 60, height: 60)
                            .background(themeManager.activeTheme.primary)
                            .clipShape(Circle())
                            .shadow(color: .black.opacity(0.15), radius: 4, x: 0, y: 2)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 20)
            }
        }
    }

    private var lunchMoneySection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("LunchMoney API Key")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(PerchColors.text)

            SecureField("Enter your API key", text: $lunchMoneyKey)
                .textFieldStyle(RoundedBorderTextFieldStyle())
                .autocapitalization(.none)
                .disableAutocorrection(true)
        }
    }

    private var colorThemeSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Color Theme")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(PerchColors.text)

            HStack(spacing: 12) {
                ForEach(ThemeKey.allCases, id: \.self) { theme in
                    ThemeOption(
                        theme: theme,
                        isSelected: selectedTheme == theme,
                        themeManager: themeManager
                    ) {
                        hapticManager.selection()
                        selectedTheme = theme
                    }
                }
            }
        }
    }

    private func loadSettings() {
        lunchMoneyKey = KeychainManager.shared.getLunchMoneyAPIKey() ?? ""
        usePlaid = UserDefaults.standard.bool(forKey: "use_plaid")
        plaidConnected = plaidService.isConnected
        selectedTheme = themeManager.currentTheme
    }

    private func save() {
        hapticManager.impact(.light)

        if !usePlaid && lunchMoneyKey.isEmpty {
            alertMessage = "Please enter a LunchMoney API key or connect with Plaid"
            showAlert = true
            return
        }

        if usePlaid && !plaidConnected {
            alertMessage = "Please connect your bank account with Plaid"
            showAlert = true
            return
        }

        // Save settings
        if !usePlaid {
            KeychainManager.shared.setLunchMoneyAPIKey(lunchMoneyKey)
        }
        UserDefaults.standard.set(usePlaid, forKey: "use_plaid")
        themeManager.currentTheme = selectedTheme

        hapticManager.success()
        dismiss()
    }

    private func cancel() {
        hapticManager.impact(.light)
        dismiss()
    }

    private func connectPlaid() {
        hapticManager.impact(.medium)
        showingPlaidLink = true
    }

    private func disconnectPlaid() {
        plaidService.disconnect()
        plaidConnected = false
        hapticManager.success()
    }

    private func signOut() {
        hapticManager.impact(.medium)
        authManager.signOut()
        dismiss()
    }
}

struct ThemeOption: View {
    let theme: ThemeKey
    let isSelected: Bool
    let themeManager: ThemeManager
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Circle()
                    .fill(themeManager.theme(for: theme).primary)
                    .frame(width: 32, height: 32)

                Text(themeManager.theme(for: theme).name)
                    .font(.system(size: 12))
                    .foregroundColor(isSelected ? themeManager.theme(for: theme).primary : PerchColors.text)
            }
            .padding(12)
            .background(isSelected ? themeManager.theme(for: theme).primary.opacity(0.05) : Color.clear)
            .cornerRadius(8)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(
                        isSelected ? themeManager.theme(for: theme).primary : PerchColors.border,
                        lineWidth: isSelected ? 2 : 1
                    )
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}