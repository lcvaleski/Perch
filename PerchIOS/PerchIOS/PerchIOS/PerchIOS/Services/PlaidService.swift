import Foundation
import LinkKit

@MainActor
class PlaidService: ObservableObject {
    @Published var isConnected = false
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let keychain = KeychainManager.shared
    private var linkHandler: Handler?
    private let backendURL: String

    private let accessTokenKey = "plaid_access_token"
    private let itemIdKey = "plaid_item_id"

    init() {
        self.backendURL = Configuration.dynamicBackendURL
        checkConnectionStatus()
    }

    func checkConnectionStatus() {
        isConnected = keychain.get(accessTokenKey) != nil
    }

    func createLinkToken(userId: String = "default-user") async throws -> String {
        guard let url = URL(string: "\(backendURL)/create-link-token") else {
            throw PlaidError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = ["user_id": userId]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw PlaidError.networkError
        }

        let result = try JSONDecoder().decode(LinkTokenResponse.self, from: data)
        return result.linkToken
    }

    func exchangePublicToken(_ publicToken: String) async throws {
        guard let url = URL(string: "\(backendURL)/exchange-token") else {
            throw PlaidError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = ["public_token": publicToken]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw PlaidError.networkError
        }

        let result = try JSONDecoder().decode(ExchangeTokenResponse.self, from: data)

        // Store tokens securely
        keychain.save(result.accessToken, forKey: accessTokenKey)
        keychain.save(result.itemId, forKey: itemIdKey)

        isConnected = true
    }

    func presentPlaidLink() async {
        isLoading = true
        errorMessage = nil

        do {
            let linkToken = try await createLinkToken()

            var configuration = LinkTokenConfiguration(
                token: linkToken,
                onSuccess: { [weak self] success in
                    Task { @MainActor in
                        do {
                            try await self?.exchangePublicToken(success.publicToken)
                            self?.isLoading = false
                        } catch {
                            self?.errorMessage = error.localizedDescription
                            self?.isLoading = false
                        }
                    }
                }
            )

            configuration.onExit = { [weak self] exit in
                if let error = exit.error {
                    self?.errorMessage = error.localizedDescription
                }
                self?.isLoading = false
            }

            let result = Plaid.create(configuration)
            switch result {
            case .success(let handler):
                self.linkHandler = handler
                handler.open(presentUsing: .viewController(UIApplication.shared.windows.first?.rootViewController))
            case .failure(let error):
                self.errorMessage = error.localizedDescription
                self.isLoading = false
            }

        } catch {
            self.errorMessage = error.localizedDescription
            self.isLoading = false
        }
    }

    func disconnect() {
        keychain.delete(accessTokenKey)
        keychain.delete(itemIdKey)
        isConnected = false
    }

    func fetchTransactions(startDate: Date, endDate: Date) async throws -> [Transaction] {
        guard let accessToken = keychain.get(accessTokenKey) else {
            throw PlaidError.noAccessToken
        }

        guard let url = URL(string: "\(backendURL)/get-transactions") else {
            throw PlaidError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"

        let body: [String: Any] = [
            "access_token": accessToken,
            "start_date": dateFormatter.string(from: startDate),
            "end_date": dateFormatter.string(from: endDate)
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw PlaidError.networkError
        }

        let result = try JSONDecoder().decode(TransactionsResponse.self, from: data)

        // Map account names
        var accountsMap: [String: String] = [:]
        for account in result.accounts {
            accountsMap[account.accountId] = account.name ?? account.officialName ?? "Unknown"
        }

        // Map Plaid transactions to our Transaction model
        return result.transactions.map { plaidTransaction in
            Transaction(
                id: Int(plaidTransaction.transactionId.hashValue),
                date: plaidTransaction.date,
                payee: plaidTransaction.name,
                amount: String(plaidTransaction.amount),
                currency: plaidTransaction.isoCurrencyCode ?? "usd",
                plaidAccountName: accountsMap[plaidTransaction.accountId],
                plaid_account_name: nil,
                assetName: nil,
                asset_name: nil,
                account_display_name: accountsMap[plaidTransaction.accountId],
                excludeFromBudget: nil,
                exclude_from_budget: nil,
                excludeFromTotals: false,
                exclude_from_totals: nil,
                isGroup: nil,
                is_group: nil,
                groupId: nil,
                group_id: nil,
                categoryName: plaidTransaction.category?.first,
                category_name: nil
            )
        }
    }
}

// MARK: - Plaid Error Types
enum PlaidError: LocalizedError {
    case invalidURL
    case networkError
    case noAccessToken

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid backend URL"
        case .networkError:
            return "Network error occurred"
        case .noAccessToken:
            return "No Plaid access token found"
        }
    }
}

// MARK: - Response Models
struct LinkTokenResponse: Codable {
    let linkToken: String

    enum CodingKeys: String, CodingKey {
        case linkToken = "link_token"
    }
}

struct ExchangeTokenResponse: Codable {
    let accessToken: String
    let itemId: String

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case itemId = "item_id"
    }
}

struct TransactionsResponse: Codable {
    let accounts: [PlaidAccount]
    let transactions: [PlaidTransaction]
}

struct PlaidAccount: Codable {
    let accountId: String
    let name: String?
    let officialName: String?

    enum CodingKeys: String, CodingKey {
        case accountId = "account_id"
        case name
        case officialName = "official_name"
    }
}

struct PlaidTransaction: Codable {
    let transactionId: String
    let accountId: String
    let amount: Double
    let date: String
    let name: String
    let category: [String]?
    let isoCurrencyCode: String?

    enum CodingKeys: String, CodingKey {
        case transactionId = "transaction_id"
        case accountId = "account_id"
        case amount
        case date
        case name
        case category
        case isoCurrencyCode = "iso_currency_code"
    }
}