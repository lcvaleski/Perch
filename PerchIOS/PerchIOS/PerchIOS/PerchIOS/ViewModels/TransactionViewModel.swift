import Foundation
import SwiftUI

@MainActor
class TransactionViewModel: ObservableObject {
    @Published var transactions: [Transaction] = []
    @Published var transactionStates: [TransactionState] = []
    @Published var newTransactionIds = Set<String>()
    @Published var isLoading = false
    @Published var errorMessage: String?

    @Published var dailyTotal: Double = 0
    @Published var weeklyTotal: Double = 0
    @Published var monthlyTotal: Double = 0
    @Published var yearlyTotal: Double = 0

    // Demo mode
    @Published var demoMode = false
    @Published var demoTransactionStates: [TransactionState] = []
    @Published var demoTotal = "$0.00"

    private let api = LunchMoneyAPI()
    private let viewedService = ViewedTransactionsService()
    private var transactionCache = [ViewMode: (transactions: [Transaction], timestamp: Date)]()
    private let cacheDuration: TimeInterval = 30 // 30 seconds

    private let mockTransactions = [
        Transaction(id: 1001, date: "2025-01-12", payee: "Uber Eats", amount: "32.64", currency: "usd",
                   plaidAccountName: "Visa", plaid_account_name: nil, assetName: nil, asset_name: nil,
                   account_display_name: nil, excludeFromBudget: nil, exclude_from_budget: nil,
                   excludeFromTotals: false, exclude_from_totals: nil, isGroup: nil, is_group: nil,
                   groupId: nil, group_id: nil, categoryName: "Food & Drink", category_name: nil),
        Transaction(id: 1002, date: "2025-01-12", payee: "MTA", amount: "6.75", currency: "usd",
                   plaidAccountName: "Visa", plaid_account_name: nil, assetName: nil, asset_name: nil,
                   account_display_name: nil, excludeFromBudget: nil, exclude_from_budget: nil,
                   excludeFromTotals: false, exclude_from_totals: nil, isGroup: nil, is_group: nil,
                   groupId: nil, group_id: nil, categoryName: "Transportation", category_name: nil),
        Transaction(id: 1003, date: "2025-01-12", payee: "Trader Joe's", amount: "46.29", currency: "usd",
                   plaidAccountName: "Amex", plaid_account_name: nil, assetName: nil, asset_name: nil,
                   account_display_name: nil, excludeFromBudget: nil, exclude_from_budget: nil,
                   excludeFromTotals: false, exclude_from_totals: nil, isGroup: nil, is_group: nil,
                   groupId: nil, group_id: nil, categoryName: "Groceries", category_name: nil),
        Transaction(id: 1004, date: "2025-01-12", payee: "Spotify", amount: "4.99", currency: "usd",
                   plaidAccountName: "Amex", plaid_account_name: nil, assetName: nil, asset_name: nil,
                   account_display_name: nil, excludeFromBudget: nil, exclude_from_budget: nil,
                   excludeFromTotals: false, exclude_from_totals: nil, isGroup: nil, is_group: nil,
                   groupId: nil, group_id: nil, categoryName: "Entertainment", category_name: nil),
        Transaction(id: 1005, date: "2025-01-12", payee: "Gas", amount: "41.03", currency: "usd",
                   plaidAccountName: "Chase Work", plaid_account_name: nil, assetName: nil, asset_name: nil,
                   account_display_name: nil, excludeFromBudget: nil, exclude_from_budget: nil,
                   excludeFromTotals: false, exclude_from_totals: nil, isGroup: nil, is_group: nil,
                   groupId: nil, group_id: nil, categoryName: "Transportation", category_name: nil),
        Transaction(id: 1006, date: "2025-01-12", payee: "Starbucks", amount: "7.99", currency: "usd",
                   plaidAccountName: "Chase Work", plaid_account_name: nil, assetName: nil, asset_name: nil,
                   account_display_name: nil, excludeFromBudget: nil, exclude_from_budget: nil,
                   excludeFromTotals: false, exclude_from_totals: nil, isGroup: nil, is_group: nil,
                   groupId: nil, group_id: nil, categoryName: "Food & Drink", category_name: nil)
    ]

    init() {
        Task {
            await viewedService.initialize()
        }
    }

    func loadTransactions(mode: ViewMode, forceRefresh: Bool = false) async {
        // Check cache first
        if !forceRefresh,
           let cached = transactionCache[mode],
           Date().timeIntervalSince(cached.timestamp) < cacheDuration {
            self.transactions = cached.transactions
            self.transactionStates = cached.transactions.map { TransactionState($0) }
            await checkForNewTransactions(cached.transactions)
            return
        }

        isLoading = true
        errorMessage = nil

        do {
            let fetchedTransactions: [Transaction]

            switch mode {
            case .day:
                fetchedTransactions = try await api.fetchDailyTransactions()
                dailyTotal = fetchedTransactions.reduce(0) { $0 + $1.displayAmount }
            case .week:
                fetchedTransactions = try await api.fetchWeeklyTransactions()
                weeklyTotal = fetchedTransactions.reduce(0) { $0 + $1.displayAmount }
            case .month:
                fetchedTransactions = try await api.fetchMonthlyTransactions()
                monthlyTotal = fetchedTransactions.reduce(0) { $0 + $1.displayAmount }
            case .year:
                fetchedTransactions = try await api.fetchYearlyTransactions()
                yearlyTotal = fetchedTransactions.reduce(0) { $0 + $1.displayAmount }
            }

            // Cache the results
            transactionCache[mode] = (fetchedTransactions, Date())

            self.transactions = fetchedTransactions
            self.transactionStates = fetchedTransactions.map { TransactionState($0) }

            await checkForNewTransactions(fetchedTransactions)

            // Mark as viewed after 3 seconds
            Task {
                try? await Task.sleep(nanoseconds: 3_000_000_000)
                await markTransactionsAsViewed()
            }
        } catch {
            errorMessage = error.localizedDescription
            print("Error loading transactions: \(error)")
        }

        isLoading = false
    }

    func refresh(mode: ViewMode) async {
        await loadTransactions(mode: mode, forceRefresh: true)
    }

    private func checkForNewTransactions(_ transactions: [Transaction]) async {
        newTransactionIds.removeAll()
        for transaction in transactions {
            let id = "\(transaction.id)"
            let isViewed = await viewedService.isViewed(id)
            if !isViewed {
                newTransactionIds.insert(id)
            }
        }
    }

    private func markTransactionsAsViewed() async {
        let idsToMark = Array(newTransactionIds)
        await viewedService.markAsViewed(idsToMark)
        newTransactionIds.removeAll()
    }

    // Demo mode functions
    func startDemoMode() {
        demoMode = true
        demoTransactionStates = []
        updateDemoTotal()

        // Simulate loading transactions
        Task {
            try? await Task.sleep(nanoseconds: 300_000_000)
            demoTransactionStates = Array(mockTransactions.prefix(2)).map { TransactionState($0) }
            updateDemoTotal()

            // Add more transactions periodically
            for i in stride(from: 2, to: mockTransactions.count, by: 2) {
                try? await Task.sleep(nanoseconds: 1_600_000_000)
                let endIndex = min(i + 2, mockTransactions.count)
                demoTransactionStates = Array(mockTransactions.prefix(endIndex)).map { TransactionState($0) }
                updateDemoTotal()
            }
        }
    }

    func stopDemoMode() {
        demoMode = false
        demoTransactionStates = []
        demoTotal = "$0.00"
    }

    private func updateDemoTotal() {
        let total = demoTransactionStates.reduce(0) { $0 + $1.transaction.displayAmount }
        demoTotal = String(format: "$%.2f", total)
    }
}