// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "PerchIOS",
    platforms: [.iOS(.v17)],
    dependencies: [
        .package(url: "https://github.com/plaid/plaid-link-ios", from: "5.0.0")
    ],
    targets: [
        .target(
            name: "PerchIOS",
            dependencies: [
                .product(name: "LinkKit", package: "plaid-link-ios")
            ]
        )
    ]
)