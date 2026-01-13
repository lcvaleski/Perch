import SwiftUI
import Charts

struct StatsView: View {
    @EnvironmentObject var themeManager: ThemeManager
    @Environment(\.dismiss) var dismiss
    @StateObject private var hapticManager = HapticManager()

    let currentMode: ViewMode
    let onSwitchMode: (String) -> Void

    @State private var data: [ChartData] = []
    @State private var average: Double = 0
    @State private var title = ""
    @State private var averageLabel = ""
    @State private var scaleAnimation: Double = 0.95
    @State private var opacityAnimation: Double = 0
    @State private var dragOffset: CGSize = .zero

    var body: some View {
        ZStack {
            // Dimmed background
            Color.black.opacity(0.3)
                .ignoresSafeArea()
                .onTapGesture {
                    hapticManager.impact(.light)
                    dismiss()
                }

            // Modal content
            VStack(spacing: 0) {
                // Close button
                HStack {
                    Spacer()
                    Button(action: {
                        hapticManager.impact(.light)
                        dismiss()
                    }) {
                        Image(systemName: "xmark")
                            .font(.system(size: 24))
                            .foregroundColor(PerchColors.textSecondary)
                            .frame(width: 44, height: 44)
                    }
                }
                .padding(.top, 16)
                .padding(.trailing, 16)

                // Chart content
                if !data.isEmpty {
                    VStack(spacing: 20) {
                        // Line chart
                        Chart(data) { item in
                            LineMark(
                                x: .value("Label", item.label),
                                y: .value("Amount", item.amount)
                            )
                            .foregroundStyle(themeManager.activeTheme.primary)
                            .lineStyle(StrokeStyle(lineWidth: 3.5))

                            PointMark(
                                x: .value("Label", item.label),
                                y: .value("Amount", item.amount)
                            )
                            .foregroundStyle(themeManager.activeTheme.primary)
                            .symbolSize(50)
                        }
                        .frame(height: 180)
                        .padding(.horizontal, 30)
                        .chartXAxis {
                            AxisMarks(values: .automatic) { value in
                                AxisGridLine()
                                AxisValueLabel()
                                    .font(.system(size: 9))
                                    .foregroundStyle(PerchColors.textSecondary)
                            }
                        }
                        .chartYAxis {
                            AxisMarks(values: .automatic) { value in
                                AxisGridLine()
                                AxisValueLabel()
                                    .font(.system(size: 7))
                                    .foregroundStyle(PerchColors.textSecondary)
                            }
                        }

                        Text(title)
                            .font(.system(size: 13))
                            .foregroundColor(PerchColors.textSecondary)

                        // Divider
                        Rectangle()
                            .fill(PerchColors.border)
                            .frame(width: UIScreen.main.bounds.width * 0.6, height: 1)
                            .padding(.vertical, 10)

                        // Average
                        VStack(spacing: 8) {
                            Text(String(format: "$%.0f", average))
                                .font(.custom("Courier", size: 26))
                                .fontWeight(.bold)
                                .foregroundColor(themeManager.activeTheme.primary)

                            Text(averageLabel)
                                .font(.system(size: 13))
                                .foregroundColor(PerchColors.textSecondary)
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 40)
                } else {
                    Text("Loading spending data...")
                        .font(.system(size: 14))
                        .foregroundColor(PerchColors.textSecondary)
                        .padding(60)
                }
            }
            .frame(width: UIScreen.main.bounds.width * 0.85)
            .frame(maxHeight: UIScreen.main.bounds.height * 0.7)
            .background(Color.white)
            .cornerRadius(20)
            .shadow(color: .black.opacity(0.25), radius: 4, x: 0, y: 2)
            .scaleEffect(scaleAnimation)
            .opacity(opacityAnimation)
            .offset(dragOffset)
            .gesture(
                DragGesture()
                    .onChanged { value in
                        dragOffset = value.translation
                    }
                    .onEnded { value in
                        let horizontalAmount = value.translation.width
                        let threshold = UIScreen.main.bounds.width * 0.15

                        if abs(horizontalAmount) > threshold {
                            hapticManager.impact(.light)
                            if horizontalAmount > 0 {
                                onSwitchMode("right") // Previous view
                            } else {
                                onSwitchMode("left") // Next view
                            }
                        }

                        withAnimation(.spring()) {
                            dragOffset = .zero
                        }
                    }
            )
        }
        .onAppear {
            loadData()
            withAnimation(.easeOut(duration: 0.15)) {
                scaleAnimation = 1
                opacityAnimation = 1
            }
        }
    }

    private func loadData() {
        // Generate dummy data based on current view mode
        switch currentMode {
        case .day:
            let days = ["M", "T", "W", "T", "F", "S", "S"]
            data = days.map { ChartData(label: $0, amount: Double.random(in: 50...250)) }
            title = "Last Seven Days"
            averageLabel = "30 Day Average"
            average = Double.random(in: 75...225)

        case .week:
            let weeks = ["W1", "W2", "W3", "W4", "W5", "W6"]
            data = weeks.map { ChartData(label: $0, amount: Double.random(in: 400...1200)) }
            title = "Last Six Weeks"
            averageLabel = "12 Week Average"
            average = Double.random(in: 500...1200)

        case .month:
            let months = ["A", "S", "O", "N", "D", "J"]
            data = months.map { ChartData(label: $0, amount: Double.random(in: 1000...4000)) }
            title = "Last Six Months"
            averageLabel = "12 Month Average"
            average = Double.random(in: 1500...4000)

        case .year:
            let years = ["20", "21", "22", "23", "24", "25"]
            data = years.map { ChartData(label: $0, amount: Double.random(in: 15000...50000)) }
            title = "Last Six Years"
            averageLabel = "6 Year Average"
            average = Double.random(in: 20000...50000)
        }
    }
}

struct ChartData: Identifiable {
    let id = UUID()
    let label: String
    let amount: Double
}