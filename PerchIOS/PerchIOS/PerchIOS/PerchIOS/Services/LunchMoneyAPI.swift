import Foundation

class LunchMoneyAPI {
    private let baseURL = "https://dev.lunchmoney.app/v1"
    private var apiKey: String? {
        return KeychainManager.shared.getLunchMoneyAPIKey()
    }

    func fetchDailyTransactions() async throws -> [Transaction] {
        let today = DateFormatter.apiDateFormatter.string(from: Date())
        return try await fetchTransactions(startDate: today, endDate: today)
    }

    func fetchWeeklyTransactions() async throws -> [Transaction] {
        let calendar = Calendar.current
        let now = Date()
        let startOfWeek = calendar.dateInterval(of: .weekOfYear, for: now)?.start ?? now
        let endOfWeek = calendar.dateInterval(of: .weekOfYear, for: now)?.end ?? now

        let startDate = DateFormatter.apiDateFormatter.string(from: startOfWeek)
        let endDate = DateFormatter.apiDateFormatter.string(from: endOfWeek)

        return try await fetchTransactions(startDate: startDate, endDate: endDate)
    }

    func fetchMonthlyTransactions() async throws -> [Transaction] {
        let calendar = Calendar.current
        let now = Date()
        let startOfMonth = calendar.dateInterval(of: .month, for: now)?.start ?? now
        let endOfMonth = calendar.dateInterval(of: .month, for: now)?.end ?? now

        let startDate = DateFormatter.apiDateFormatter.string(from: startOfMonth)
        let endDate = DateFormatter.apiDateFormatter.string(from: endOfMonth)

        return try await fetchTransactions(startDate: startDate, endDate: endDate)
    }

    func fetchYearlyTransactions() async throws -> [Transaction] {
        let calendar = Calendar.current
        let now = Date()
        let year = calendar.component(.year, from: now)
        let month = calendar.component(.month, from: now)

        var allTransactions: [Transaction] = []

        // Fetch each month up to current month
        for monthNum in 1...month {
            let startOfMonth = calendar.date(from: DateComponents(year: year, month: monthNum, day: 1))!
            let endOfMonth = calendar.date(byAdding: .month, value: 1, to: startOfMonth)!
            let endDate = calendar.date(byAdding: .day, value: -1, to: endOfMonth)!

            let startDateStr = DateFormatter.apiDateFormatter.string(from: startOfMonth)
            let endDateStr = DateFormatter.apiDateFormatter.string(from: endDate)

            do {
                let monthTransactions = try await fetchTransactions(startDate: startDateStr, endDate: endDateStr, limit: 1000)
                allTransactions.append(contentsOf: monthTransactions)
            } catch {
                print("Error fetching transactions for month \(monthNum): \(error)")
            }
        }

        return filterTransactions(allTransactions)
    }

    private func fetchTransactions(startDate: String, endDate: String, limit: Int = 500) async throws -> [Transaction] {
        guard let apiKey = apiKey else {
            throw APIError.missingAPIKey
        }

        var components = URLComponents(string: "\(baseURL)/transactions")!
        components.queryItems = [
            URLQueryItem(name: "start_date", value: startDate),
            URLQueryItem(name: "end_date", value: endDate),
            URLQueryItem(name: "limit", value: String(limit))
        ]

        guard let url = components.url else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw APIError.invalidResponse
        }

        let decoder = JSONDecoder()
        let result = try decoder.decode(TransactionResponse.self, from: data)
        return filterTransactions(result.transactions)
    }

    private func filterTransactions(_ transactions: [Transaction]) -> [Transaction] {
        return transactions
            .filter { transaction in
                // Filter out negative amounts (income in LunchMoney)
                guard transaction.displayAmount >= 0 else { return false }

                // Filter out excluded transactions
                guard !transaction.shouldExclude else { return false }

                // Filter out certain categories
                let excludeCategories = ["transfer", "payment", "income", "allowance"]
                if let category = transaction.category?.lowercased() {
                    for excludeCategory in excludeCategories {
                        if category.contains(excludeCategory) {
                            return false
                        }
                    }
                }

                return true
            }
            .sorted { t1, t2 in
                // Sort by date, newest first
                t1.date > t2.date
            }
    }
}

struct TransactionResponse: Codable {
    let transactions: [Transaction]
}

enum APIError: LocalizedError {
    case missingAPIKey
    case invalidURL
    case invalidResponse
    case decodingError

    var errorDescription: String? {
        switch self {
        case .missingAPIKey:
            return "LunchMoney API key not configured"
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid response from server"
        case .decodingError:
            return "Failed to decode response"
        }
    }
}

extension DateFormatter {
    static let apiDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()
}