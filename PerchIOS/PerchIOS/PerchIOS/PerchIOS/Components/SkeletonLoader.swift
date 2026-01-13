import SwiftUI

struct SkeletonLoader: View {
    let count: Int = 8
    @State private var shimmerPhase: CGFloat = 0

    var body: some View {
        VStack(spacing: 0) {
            ForEach(0..<count, id: \.self) { index in
                SkeletonRow(delay: Double(index) * 0.1, shimmerPhase: shimmerPhase)
            }
        }
        .onAppear {
            withAnimation(Animation.linear(duration: 1).repeatForever(autoreverses: true)) {
                shimmerPhase = 1
            }
        }
    }
}

struct SkeletonRow: View {
    let delay: Double
    let shimmerPhase: CGFloat
    @State private var opacity: Double = 0.3

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                // Left column
                VStack(alignment: .leading, spacing: 4) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color(white: 0.87).opacity(opacity))
                        .frame(width: 140, height: 14)

                    RoundedRectangle(cornerRadius: 3)
                        .fill(Color(white: 0.87).opacity(opacity * 0.67))
                        .frame(width: 80, height: 11)
                }

                Spacer()

                // Right column
                VStack(alignment: .trailing, spacing: 4) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color(white: 0.87).opacity(opacity))
                        .frame(width: 60, height: 14)

                    RoundedRectangle(cornerRadius: 3)
                        .fill(Color(white: 0.87).opacity(opacity * 0.67))
                        .frame(width: 30, height: 11)
                }
            }
            .padding(.horizontal, 40)
            .padding(.vertical, 12)

            // Separator
            Rectangle()
                .fill(PerchColors.borderOpacity05)
                .frame(height: 0.5)
                .padding(.leading, 40)
        }
        .onAppear {
            withAnimation(
                Animation.easeInOut(duration: 1)
                    .delay(delay)
                    .repeatForever(autoreverses: true)
            ) {
                opacity = 0.6
            }
        }
    }
}