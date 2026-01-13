import SwiftUI

enum ThemeKey: String, CaseIterable {
    case river, forest, sunset, plum
}

struct ColorTheme {
    let name: String
    let primary: Color
    let primaryHover: Color
    let primaryLighter: Color
}

class ThemeManager: ObservableObject {
    @Published var currentTheme: ThemeKey = .river {
        didSet {
            UserDefaults.standard.set(currentTheme.rawValue, forKey: "color_theme")
        }
    }

    private let themes: [ThemeKey: ColorTheme] = [
        .river: ColorTheme(
            name: "River",
            primary: Color(red: 70/255, green: 130/255, blue: 180/255), // #4682B4
            primaryHover: Color(red: 90/255, green: 154/255, blue: 214/255),
            primaryLighter: Color(red: 120/255, green: 174/255, blue: 224/255)
        ),
        .forest: ColorTheme(
            name: "Forest",
            primary: Color(red: 45/255, green: 122/255, blue: 45/255), // #2d7a2d
            primaryHover: Color(red: 72/255, green: 144/255, blue: 72/255),
            primaryLighter: Color(red: 102/255, green: 174/255, blue: 102/255)
        ),
        .sunset: ColorTheme(
            name: "Sunset",
            primary: Color(red: 194/255, green: 92/255, blue: 58/255), // #c25c3a
            primaryHover: Color(red: 210/255, green: 120/255, blue: 90/255),
            primaryLighter: Color(red: 230/255, green: 150/255, blue: 120/255)
        ),
        .plum: ColorTheme(
            name: "Plum",
            primary: Color(red: 139/255, green: 90/255, blue: 140/255), // #8b5a8c
            primaryHover: Color(red: 155/255, green: 110/255, blue: 156/255),
            primaryLighter: Color(red: 185/255, green: 140/255, blue: 186/255)
        )
    ]

    init() {
        if let savedTheme = UserDefaults.standard.string(forKey: "color_theme"),
           let theme = ThemeKey(rawValue: savedTheme) {
            currentTheme = theme
        }
    }

    func theme(for key: ThemeKey) -> ColorTheme {
        return themes[key]!
    }

    var activeTheme: ColorTheme {
        return themes[currentTheme]!
    }
}

// Static colors that don't change with theme
struct PerchColors {
    static let background = Color(red: 243/255, green: 243/255, blue: 243/255) // rgb(243, 243, 243)
    static let text = Color(red: 51/255, green: 51/255, blue: 51/255) // rgb(51, 51, 51)
    static let textSecondary = Color(red: 102/255, green: 102/255, blue: 102/255) // rgb(102, 102, 102)
    static let border = Color(red: 221/255, green: 221/255, blue: 221/255) // rgb(221, 221, 221)

    // Opacity variations
    static let textOpacity07 = Color(red: 51/255, green: 51/255, blue: 51/255).opacity(0.7)
    static let textSecondaryOpacity06 = Color(red: 102/255, green: 102/255, blue: 102/255).opacity(0.6)
    static let textSecondaryOpacity07 = Color(red: 102/255, green: 102/255, blue: 102/255).opacity(0.7)
    static let textSecondaryOpacity02 = Color(red: 102/255, green: 102/255, blue: 102/255).opacity(0.2)
    static let borderOpacity05 = Color(red: 221/255, green: 221/255, blue: 221/255).opacity(0.5)
}