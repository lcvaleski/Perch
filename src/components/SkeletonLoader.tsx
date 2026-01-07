import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Colors } from '../utils/colors';

interface SkeletonLoaderProps {
  count?: number;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ count = 8 }) => {
  const shimmerAnimations = useRef(
    Array.from({ length: count }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    const animations = shimmerAnimations.map((anim, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 1000,
            delay: index * 100,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      )
    );

    animations.forEach(anim => anim.start());

    return () => {
      animations.forEach(anim => anim.stop());
    };
  }, []);

  return (
    <View style={styles.container}>
      {shimmerAnimations.map((anim, index) => (
        <View key={index}>
          <View style={styles.row}>
            <View style={styles.leftColumn}>
              <Animated.View
                style={[
                  styles.merchantSkeleton,
                  {
                    opacity: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 0.6],
                    }),
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.dateSkeleton,
                  {
                    opacity: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 0.6],
                    }),
                  },
                ]}
              />
            </View>
            <View style={styles.rightColumn}>
              <Animated.View
                style={[
                  styles.amountSkeleton,
                  {
                    opacity: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 0.6],
                    }),
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.methodSkeleton,
                  {
                    opacity: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 0.6],
                    }),
                  },
                ]}
              />
            </View>
          </View>
          <View style={styles.separator} />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 40,
  },
  leftColumn: {
    flex: 1,
  },
  rightColumn: {
    alignItems: 'flex-end',
  },
  merchantSkeleton: {
    width: 140,
    height: 14,
    backgroundColor: 'rgba(221, 221, 221, 0.3)',
    borderRadius: 4,
    marginBottom: 4,
  },
  dateSkeleton: {
    width: 80,
    height: 11,
    backgroundColor: 'rgba(221, 221, 221, 0.2)',
    borderRadius: 3,
  },
  amountSkeleton: {
    width: 60,
    height: 14,
    backgroundColor: 'rgba(221, 221, 221, 0.3)',
    borderRadius: 4,
    marginBottom: 4,
  },
  methodSkeleton: {
    width: 30,
    height: 11,
    backgroundColor: 'rgba(221, 221, 221, 0.2)',
    borderRadius: 3,
  },
  separator: {
    height: 0.5,
    backgroundColor: Colors.riverBorderOpacity05,
    marginLeft: 40,
  },
});