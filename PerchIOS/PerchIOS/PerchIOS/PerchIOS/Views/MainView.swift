import SwiftUI

enum ViewMode: String, CaseIterable {
    case day = "Day"
    case week = "Week"
    case month = "Month"
    case year = "Year"
}

struct MainView: View {
    @EnvironmentObject var themeManager: ThemeManager
    @EnvironmentObject var authManager: AuthManager
    @StateObject private var transactionViewModel = TransactionViewModel()
    @StateObject private var hapticManager = HapticManager()

    @State private var currentMode: ViewMode = .week
    @State private var showSettings = false
    @State private var showStats = false
    @State private var refreshing = false
    @State private var dragOffset: CGSize = .zero
    @State private var hiddenTransactions = Set<String>()

    // Animation states
    @State private var listOpacity: Double = 1
    @State private var listScale: Double = 1
    @State private var totalScale: Double = 1
    @State private var totalOpacity: Double = 1
    @State private var shimmerOpacity: Double = 0.8
    @State private var backgroundScale: Double = 1

    // Demo mode
    @State private var demoMode = false

    private let modes = ViewMode.allCases
    private let swipeThreshold: CGFloat = UIScreen.main.bounds.width * 0.1 // 10% of screen width
    private let velocityThreshold: CGFloat = 0.2

    var body: some View {
        ZStack {
            PerchColors.background
                .ignoresSafeArea()

            GeometryReader { geometry in
                VStack(spacing: 0) {
                    // Header
                    headerView
                        .padding(.top, 60)
                        .padding(.bottom, 12)

                    // Transaction list
                    transactionListView
                        .opacity(listOpacity)
                        .scaleEffect(listScale)
                }
                .scaleEffect(backgroundScale)
                .gesture(swipeGesture)
            }

            // Settings button
            VStack {
                HStack {
                    Spacer()
                    Button(action: {
                        hapticManager.impact(.light)
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                            backgroundScale = 0.93
                        }
                        showSettings = true
                    }) {
                        Image(systemName: "gearshape.fill")
                            .font(.system(size: 20))
                            .foregroundColor(PerchColors.textSecondaryOpacity02)
                            .frame(width: 44, height: 44)
                    }
                    .padding(.trailing, 20)
                }
                .padding(.top, 10)
                Spacer()
            }
        }
        .sheet(isPresented: $showSettings) {
            SettingsView(demoMode: $demoMode)
                .environmentObject(themeManager)
                .environmentObject(authManager)
                .onDisappear {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                        backgroundScale = 1
                    }
                    // Refresh data when settings close
                    Task {
                        await transactionViewModel.refresh(mode: currentMode)
                    }
                }
        }
        .sheet(isPresented: $showStats) {
            StatsView(currentMode: currentMode, onSwitchMode: handleModalSwipe)
                .environmentObject(themeManager)
        }
        .onAppear {
            Task {
                await transactionViewModel.loadTransactions(mode: currentMode)
            }
            loadHiddenTransactions()
        }
    }

    private var headerView: some View {
        VStack(spacing: 16) {
            // Total amount
            Button(action: {
                hapticManager.impact(.light)
                showStats = true
            }) {
                Text(totalDisplay)
                    .font(.custom("Courier", size: 26))
                    .fontWeight(.bold)
                    .foregroundColor(themeManager.activeTheme.primary)
                    .opacity(totalOpacity)
                    .scaleEffect(totalScale)
            }

            // Tab selector
            HStack(spacing: 0) {
                ForEach(modes, id: \.self) { mode in
                    TabButton(
                        title: mode.rawValue,
                        isActive: currentMode == mode,
                        theme: themeManager.activeTheme,
                        action: {
                            switchMode(to: mode, withHaptics: true)
                        }
                    )
                }
            }
            .frame(height: 30)
        }
    }

    private var transactionListView: some View {
        ScrollView {
            if transactionViewModel.isLoading && transactionViewModel.transactionStates.isEmpty {
                SkeletonLoader()
            } else if transactionViewModel.transactionStates.isEmpty {
                Text("No transactions yet")
                    .font(.system(size: 13))
                    .foregroundColor(PerchColors.textSecondaryOpacity06.opacity(0.4))
                    .italic()
                    .padding(.top, 20)
            } else {
                LazyVStack(spacing: 0) {
                    ForEach(transactionViewModel.transactionStates, id: \.transaction.id) { state in
                        TransactionRow(
                            state: state,
                            isNew: transactionViewModel.newTransactionIds.contains("\(state.transaction.id)"),
                            isHidden: hiddenTransactions.contains("\(state.transaction.id)")
                        ) {
                            toggleHiddenTransaction("\(state.transaction.id)")
                        }
                    }
                }
                .padding(.top, 10)
            }
        }
        .refreshable {
            await handleRefresh()
        }
    }

    private var swipeGesture: some Gesture {
        DragGesture()
            .onChanged { value in
                dragOffset = value.translation
            }
            .onEnded { value in
                let horizontalAmount = value.translation.width
                let verticalAmount = value.translation.height
                let velocity = value.velocity.width

                // Check if horizontal swipe
                if abs(horizontalAmount) > abs(verticalAmount) {
                    if abs(horizontalAmount) > swipeThreshold || abs(velocity) > velocityThreshold {
                        if horizontalAmount < 0 {
                            // Swipe left - next mode
                            if let currentIndex = modes.firstIndex(of: currentMode),
                               currentIndex < modes.count - 1 {
                                switchMode(to: modes[currentIndex + 1])
                            }
                        } else {
                            // Swipe right - previous mode
                            if let currentIndex = modes.firstIndex(of: currentMode),
                               currentIndex > 0 {
                                switchMode(to: modes[currentIndex - 1])
                            }
                        }
                    }
                }

                // Reset offset
                withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                    dragOffset = .zero
                }
            }
    }

    private var totalDisplay: String {
        if demoMode {
            return transactionViewModel.demoTotal
        }

        let visibleTotal = transactionViewModel.transactionStates
            .filter { !hiddenTransactions.contains("\($0.transaction.id)") }
            .reduce(0) { $0 + $1.transaction.displayAmount }

        return String(format: "$%.2f", visibleTotal)
    }

    private func switchMode(to mode: ViewMode, withHaptics: Bool = true) {
        if withHaptics {
            hapticManager.impact(.light)
        }

        currentMode = mode

        // Animate transition
        withAnimation(.easeOut(duration: 0.05)) {
            listOpacity = 0.5
            listScale = 0.99
        }

        Task {
            await transactionViewModel.loadTransactions(mode: mode)

            withAnimation(.easeIn(duration: 0.1)) {
                listOpacity = 1
                listScale = 1
            }
        }
    }

    private func handleRefresh() async {
        refreshing = true
        await transactionViewModel.refresh(mode: currentMode)
        refreshing = false
    }

    private func handleModalSwipe(direction: String) {
        if direction == "left" {
            if let currentIndex = modes.firstIndex(of: currentMode),
               currentIndex < modes.count - 1 {
                switchMode(to: modes[currentIndex + 1])
            }
        } else {
            if let currentIndex = modes.firstIndex(of: currentMode),
               currentIndex > 0 {
                switchMode(to: modes[currentIndex - 1])
            }
        }
    }

    private func toggleHiddenTransaction(_ id: String) {
        hapticManager.selection()

        withAnimation(.spring(response: 0.2, dampingFraction: 0.7)) {
            totalScale = 0.97
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.08) {
            withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                totalScale = 1
            }
        }

        if hiddenTransactions.contains(id) {
            hiddenTransactions.remove(id)
        } else {
            hiddenTransactions.insert(id)
        }
        saveHiddenTransactions()
    }

    private func loadHiddenTransactions() {
        if let data = UserDefaults.standard.array(forKey: "hidden_transactions") as? [String] {
            hiddenTransactions = Set(data)
        }
    }

    private func saveHiddenTransactions() {
        UserDefaults.standard.set(Array(hiddenTransactions), forKey: "hidden_transactions")
    }
}

struct TabButton: View {
    let title: String
    let isActive: Bool
    let theme: ColorTheme
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Text(title)
                    .font(.system(size: 13, weight: isActive ? .medium : .regular))
                    .foregroundColor(isActive ? theme.primaryLighter : PerchColors.textSecondaryOpacity06)
                    .animation(.easeInOut(duration: 0.1), value: isActive)

                if isActive {
                    Rectangle()
                        .fill(theme.primaryLighter)
                        .frame(height: 2)
                        .cornerRadius(1)
                } else {
                    Rectangle()
                        .fill(Color.clear)
                        .frame(height: 2)
                }
            }
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(PlainButtonStyle())
    }
}