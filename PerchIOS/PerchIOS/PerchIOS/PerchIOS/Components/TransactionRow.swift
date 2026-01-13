import SwiftUI

struct TransactionRow: View {
    let state: TransactionState
    let isNew: Bool
    let isHidden: Bool
    let onToggleHidden: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            Button(action: onToggleHidden) {
                HStack {
                    // Left column
                    VStack(alignment: .leading, spacing: 4) {
                        Text(truncatedPayee)
                            .font(.system(size: 13, weight: .regular))
                            .foregroundColor(PerchColors.textOpacity07)
                            .lineLimit(1)
                            .frame(minHeight: 20)

                        Text(state.transaction.formattedDate)
                            .font(.system(size: 10))
                            .foregroundColor(PerchColors.textSecondaryOpacity06)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)

                    Spacer()

                    // Right column
                    VStack(alignment: .trailing, spacing: 4) {
                        HStack(spacing: 6) {
                            Text(String(format: "$%.2f", state.transaction.displayAmount))
                                .font(.custom("Courier", size: 13))
                                .fontWeight(.semibold)
                                .foregroundColor(PerchColors.text)

                            if isNew {
                                Circle()
                                    .fill(Color(red: 120/255, green: 174/255, blue: 224/255)) // River blue lighter
                                    .frame(width: 6, height: 6)
                            }
                        }

                        if let accountName = state.transaction.accountName {
                            Text(accountName)
                                .font(.system(size: 10, weight: .medium))
                                .foregroundColor(PerchColors.textSecondaryOpacity07)
                        }
                    }
                }
                .padding(.horizontal, 40)
                .padding(.vertical, 12)
                .background(PerchColors.background)
                .opacity(isHidden ? 0.5 : 1)
            }
            .buttonStyle(PlainButtonStyle())

            // Separator
            Rectangle()
                .fill(PerchColors.borderOpacity05)
                .frame(height: 0.5)
                .padding(.leading, 40)
        }
    }

    private var truncatedPayee: String {
        let payee = state.transaction.payee
        if payee.count > 25 {
            return String(payee.prefix(20)) + "..."
        }
        return payee
    }
}