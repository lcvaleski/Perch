import Foundation

struct Configuration {
    // Backend URL - Update this with your actual Vercel deployment URL
    // For local development: "http://localhost:3000/api"
    // For production: "https://your-app.vercel.app/api"
    static let backendURL = "https://perch-backend.vercel.app/api"

    // You can also use environment-based configuration
    static var dynamicBackendURL: String {
        #if DEBUG
        // For local development/testing
        return ProcessInfo.processInfo.environment["BACKEND_URL"] ?? "http://localhost:3000/api"
        #else
        // For production builds
        return ProcessInfo.processInfo.environment["BACKEND_URL"] ?? "https://perch-backend.vercel.app/api"
        #endif
    }
}