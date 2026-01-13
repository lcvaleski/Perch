#!/bin/bash

# Create a new iOS app using Swift directly
cd "$(dirname "$0")"

# Create Package.swift for SPM
cat > Package.swift << 'EOF'
// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "PerchIOS",
    platforms: [.iOS(.v17)],
    products: [
        .library(
            name: "PerchIOS",
            targets: ["PerchIOS"]),
    ],
    targets: [
        .target(
            name: "PerchIOS",
            dependencies: [],
            path: "PerchIOS")
    ]
)
EOF

# Use xcodegen with proper config
cat > project.yml << 'EOF'
name: PerchIOS
options:
  bundleIdPrefix: com.perch
  deploymentTarget:
    iOS: 17.0
targets:
  PerchIOS:
    type: application
    platform: iOS
    sources:
      - PerchIOS
    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: com.perch.PerchIOS
        INFOPLIST_FILE: PerchIOS/Info.plist
        DEVELOPMENT_ASSET_PATHS: '"PerchIOS/Preview Content"'
        ENABLE_PREVIEWS: YES
        SWIFT_VERSION: 5.0
EOF

xcodegen generate

echo "Project created! Open with: open PerchIOS.xcodeproj"