import Foundation
import Security

class KeychainManager {
    static let shared = KeychainManager()
    private init() {}

    private let lunchMoneyKey = "lunch_money_api_key"
    private let plaidAccessTokenKey = "plaid_access_token"
    private let plaidItemIdKey = "plaid_item_id"

    // MARK: - LunchMoney API Key
    func setLunchMoneyAPIKey(_ key: String) -> Bool {
        return save(key: lunchMoneyKey, value: key)
    }

    func getLunchMoneyAPIKey() -> String? {
        return load(key: lunchMoneyKey)
    }

    func deleteLunchMoneyAPIKey() -> Bool {
        return delete(key: lunchMoneyKey)
    }

    // MARK: - Plaid Tokens
    func setPlaidAccessToken(_ token: String) -> Bool {
        return save(key: plaidAccessTokenKey, value: token)
    }

    func getPlaidAccessToken() -> String? {
        return load(key: plaidAccessTokenKey)
    }

    func setPlaidItemId(_ itemId: String) -> Bool {
        return save(key: plaidItemIdKey, value: itemId)
    }

    func getPlaidItemId() -> String? {
        return load(key: plaidItemIdKey)
    }

    func deletePlaidTokens() -> Bool {
        let token = delete(key: plaidAccessTokenKey)
        let itemId = delete(key: plaidItemIdKey)
        return token && itemId
    }

    // MARK: - Private Keychain Methods
    private func save(key: String, value: String) -> Bool {
        guard let data = value.data(using: .utf8) else { return false }

        // Delete any existing item first
        delete(key: key)

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]

        let status = SecItemAdd(query as CFDictionary, nil)
        return status == errSecSuccess
    }

    private func load(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var dataTypeRef: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &dataTypeRef)

        guard status == errSecSuccess,
              let data = dataTypeRef as? Data,
              let value = String(data: data, encoding: .utf8) else {
            return nil
        }

        return value
    }

    @discardableResult
    private func delete(key: String) -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key
        ]

        let status = SecItemDelete(query as CFDictionary)
        return status == errSecSuccess || status == errSecItemNotFound
    }
}