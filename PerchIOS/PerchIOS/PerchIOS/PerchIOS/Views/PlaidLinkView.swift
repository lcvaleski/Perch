import SwiftUI

struct PlaidLinkView: View {
    @EnvironmentObject var plaidService: PlaidService
    @EnvironmentObject var themeManager: ThemeManager
    @Environment(\.presentationMode) var presentationMode
    @State private var showingAlert = false

    var body: some View {
        NavigationView {
            ZStack {
                PerchColors.background
                    .ignoresSafeArea()

                VStack(spacing: 30) {
                    // Status icon
                    Image(systemName: plaidService.isConnected ? "checkmark.circle.fill" : "link.circle.fill")
                        .font(.system(size: 60))
                        .foregroundColor(plaidService.isConnected ? .green : themeManager.activeTheme.primary)

                    // Status text
                    Text(plaidService.isConnected ? "Bank Connected" : "Connect Your Bank")
                        .font(.system(size: 24, weight: .semibold))
                        .foregroundColor(PerchColors.text)

                    if plaidService.isConnected {
                        VStack(spacing: 20) {
                            Text("Your bank account is connected and syncing transactions.")
                                .font(.system(size: 16))
                                .foregroundColor(PerchColors.textSecondary)
                                .multilineTextAlignment(.center)
                                .padding(.horizontal, 40)

                            Button(action: {
                                showingAlert = true
                            }) {
                                Text("Disconnect Bank")
                                    .font(.system(size: 16, weight: .medium))
                                    .foregroundColor(.red)
                                    .padding(.horizontal, 30)
                                    .padding(.vertical, 12)
                                    .background(
                                        RoundedRectangle(cornerRadius: 8)
                                            .stroke(Color.red, lineWidth: 1)
                                    )
                            }
                        }
                    } else {
                        VStack(spacing: 20) {
                            Text("Connect your bank account to automatically import and track your transactions.")
                                .font(.system(size: 16))
                                .foregroundColor(PerchColors.textSecondary)
                                .multilineTextAlignment(.center)
                                .padding(.horizontal, 40)

                            Button(action: {
                                Task {
                                    await plaidService.presentPlaidLink()
                                }
                            }) {
                                HStack {
                                    Image(systemName: "link")
                                    Text("Connect with Plaid")
                                }
                                .font(.system(size: 16, weight: .medium))
                                .foregroundColor(.white)
                                .padding(.horizontal, 30)
                                .padding(.vertical, 12)
                                .background(themeManager.activeTheme.primary)
                                .cornerRadius(8)
                            }
                            .disabled(plaidService.isLoading)

                            if plaidService.isLoading {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle())
                                    .scaleEffect(0.8)
                            }
                        }
                    }

                    if let error = plaidService.errorMessage {
                        Text(error)
                            .font(.system(size: 14))
                            .foregroundColor(.red)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 40)
                    }

                    Spacer()
                }
                .padding(.top, 40)
            }
            .navigationTitle("Bank Connection")
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarItems(
                trailing: Button("Done") {
                    presentationMode.wrappedValue.dismiss()
                }
            )
        }
        .alert(isPresented: $showingAlert) {
            Alert(
                title: Text("Disconnect Bank"),
                message: Text("Are you sure you want to disconnect your bank account? You'll need to reconnect to sync transactions."),
                primaryButton: .destructive(Text("Disconnect")) {
                    plaidService.disconnect()
                },
                secondaryButton: .cancel()
            )
        }
    }
}