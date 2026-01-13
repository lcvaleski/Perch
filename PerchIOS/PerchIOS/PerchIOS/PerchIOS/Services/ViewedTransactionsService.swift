import Foundation

actor ViewedTransactionsService {
    private var viewedIds = Set<String>()
    private let maxStoredIds = 1000
    private let storageKey = "viewed_transactions"
    private var initialized = false

    func initialize() async {
        guard !initialized else { return }

        if let data = UserDefaults.standard.array(forKey: storageKey) as? [String] {
            viewedIds = Set(data)
        }
        initialized = true
    }

    func isViewed(_ transactionId: String) -> Bool {
        return viewedIds.contains(transactionId)
    }

    func markAsViewed(_ transactionIds: [String]) async {
        let wasUpdated = transactionIds.contains { !viewedIds.contains($0) }

        for id in transactionIds {
            viewedIds.insert(id)
        }

        // Limit the stored IDs to prevent unlimited growth
        if viewedIds.count > maxStoredIds {
            let sortedIds = Array(viewedIds).sorted()
            // Keep only the most recent IDs
            viewedIds = Set(sortedIds.suffix(maxStoredIds))
        }

        if wasUpdated {
            save()
        }
    }

    private func save() {
        UserDefaults.standard.set(Array(viewedIds), forKey: storageKey)
    }

    func clear() async {
        viewedIds.removeAll()
        UserDefaults.standard.removeObject(forKey: storageKey)
    }
}