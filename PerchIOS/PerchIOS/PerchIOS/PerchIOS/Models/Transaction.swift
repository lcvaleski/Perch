import Foundation

struct Transaction: Identifiable, Codable {
    let id: Int
    let date: String
    let payee: String
    let amount: String
    let currency: String

    // Various field names from API
    let plaidAccountName: String?
    let plaid_account_name: String?
    let assetName: String?
    let asset_name: String?
    let account_display_name: String?

    let excludeFromBudget: Bool?
    let exclude_from_budget: Bool?
    let excludeFromTotals: Bool?
    let exclude_from_totals: Bool?
    let isGroup: Bool?
    let is_group: Bool?
    let groupId: Int?
    let group_id: Int?
    let categoryName: String?
    let category_name: String?

    var displayAmount: Double {
        let cleanAmount = amount.replacingOccurrences(of: "[^0-9.-]", with: "", options: .regularExpression)
        return Double(cleanAmount) ?? 0
    }

    var accountName: String? {
        // Try all possible field names from the API
        if let name = plaidAccountName ?? plaid_account_name ?? assetName ?? asset_name ?? account_display_name {
            // Return raw account name, truncated to 10 characters
            return name.count > 10 ? String(name.prefix(10)) : name
        }
        return nil
    }

    var formattedDate: String {
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        guard let date = dateFormatter.date(from: date) else { return date }

        dateFormatter.dateFormat = "MMM d, yyyy"
        return dateFormatter.string(from: date)
    }

    var shouldExclude: Bool {
        return excludeFromTotals ?? exclude_from_totals ?? false
    }

    var category: String? {
        return categoryName ?? category_name
    }
}

class TransactionState: ObservableObject {
    @Published var transaction: Transaction

    init(_ transaction: Transaction) {
        self.transaction = transaction
    }
}