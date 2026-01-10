import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Dimensions,
  Animated,
  Platform,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Svg, { Line, Polyline, Text as SvgText, Circle } from 'react-native-svg';
import { Colors } from '../utils/colors';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface StatsModalProps {
  visible: boolean;
  onClose: () => void;
  data?: { label: string; amount: number }[];
  average?: number;
  title?: string;
  averageLabel?: string;
  currentMode?: string;
  onSwitchMode?: (direction: 'left' | 'right') => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({ visible, onClose, data, average, title, averageLabel, currentMode, onSwitchMode }) => {
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [isModalVisible, setIsModalVisible] = useState(visible);

  // Create PanResponder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 5;
      },
      onPanResponderRelease: (_, gestureState) => {
        const swipeThreshold = screenWidth * 0.15;

        if (gestureState.dx > swipeThreshold && onSwitchMode) {
          // Swipe right - go to previous view
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onSwitchMode('right');
        } else if (gestureState.dx < -swipeThreshold && onSwitchMode) {
          // Swipe left - go to next view
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onSwitchMode('left');
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      setIsModalVisible(true);
      scaleAnim.setValue(0.95);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsModalVisible(false);
      });
    }
  }, [visible]);

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  if (!isModalVisible) return null;

  return (
    <Modal
      visible={isModalVisible}
      transparent={true}
      animationType="none"
      presentationStyle="overFullScreen"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              {...panResponder.panHandlers}
              style={[
                styles.modalContainer,
                {
                  opacity: opacityAnim,
                  transform: [{ scale: scaleAnim }],
                }
              ]}
            >
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={Colors.riverTextSecondary} />
              </TouchableOpacity>

              <View style={styles.content}>
                {data && data.length > 0 ? (
                  <View style={styles.graphContainer}>
                    <Svg width={screenWidth * 0.5} height={120}>
                      {/* X and Y axis */}
                      <Line x1={25} y1={95} x2={screenWidth * 0.5 - 15} y2={95} stroke={Colors.riverBorder} strokeWidth={2.5} />
                      <Line x1={25} y1={15} x2={25} y2={95} stroke={Colors.riverBorder} strokeWidth={2.5} />

                      {/* Plot the line graph */}
                      {(() => {
                        const maxAmount = Math.max(...data.map(d => d.amount));
                        const minAmount = Math.min(...data.map(d => d.amount));
                        const range = maxAmount - minAmount || 1;
                        const graphWidth = screenWidth * 0.5 - 40;
                        const graphHeight = 75;
                        const xStep = graphWidth / (data.length - 1 || 1);

                        const points = data.map((item, index) => {
                          const x = 25 + index * xStep;
                          const y = 15 + graphHeight - ((item.amount - minAmount) / range) * graphHeight;
                          return `${x},${y}`;
                        }).join(' ');

                        return (
                          <>
                            {/* Draw the line */}
                            <Polyline
                              points={points}
                              fill="none"
                              stroke={Colors.riverBlue}
                              strokeWidth={3.5}
                            />

                            {/* Draw dots at each point */}
                            {data.map((item, index) => {
                              const x = 25 + index * xStep;
                              const y = 15 + graphHeight - ((item.amount - minAmount) / range) * graphHeight;
                              return (
                                <Circle
                                  key={index}
                                  cx={x}
                                  cy={y}
                                  r={4.5}
                                  fill={Colors.riverBlue}
                                />
                              );
                            })}

                            {/* X-axis labels */}
                            {data.map((item, index) => {
                              const x = 25 + index * xStep;
                              return (
                                <SvgText
                                  key={`label-${index}`}
                                  x={x}
                                  y={108}
                                  fontSize={9}
                                  fill={Colors.riverTextSecondary}
                                  textAnchor="middle"
                                >
                                  {item.label}
                                </SvgText>
                              );
                            })}

                            {/* Y-axis labels (amounts) */}
                            <SvgText
                              x={20}
                              y={19}
                              fontSize={7}
                              fill={Colors.riverTextSecondary}
                              textAnchor="end"
                            >
                              {Math.round(maxAmount)}
                            </SvgText>
                            <SvgText
                              x={20}
                              y={93}
                              fontSize={7}
                              fill={Colors.riverTextSecondary}
                              textAnchor="end"
                            >
                              {Math.round(minAmount)}
                            </SvgText>
                          </>
                        );
                      })()}
                    </Svg>
                    <Text style={styles.graphTitle}>{title || 'Stats'}</Text>
                    {average && (
                      <>
                        <View style={styles.divider} />
                        <View style={styles.averageContainer}>
                          <Text style={[styles.averageAmount, { color: Colors.riverBlue }]}>${average.toFixed(0)}</Text>
                          <Text style={styles.averageLabel}>{averageLabel || 'Average'}</Text>
                        </View>
                      </>
                    )}
                  </View>
                ) : (
                  <Text style={styles.placeholder}>Loading spending data...</Text>
                )}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: screenWidth * 0.85,
    height: screenHeight * 0.7,
    backgroundColor: '#FFF',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 4,
    zIndex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  graphContainer: {
    alignItems: 'center',
  },
  graphTitle: {
    marginTop: 8,
    fontSize: 13,
    color: Colors.riverTextSecondary,
  },
  placeholder: {
    color: Colors.riverTextSecondary,
    fontSize: 14,
  },
  divider: {
    width: '60%',
    height: 1,
    backgroundColor: Colors.riverBorder,
    marginTop: 20,
    marginBottom: 10,
    alignSelf: 'center',
  },
  averageContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  averageLabel: {
    fontSize: 13,
    color: Colors.riverTextSecondary,
    marginTop: 8,
  },
  averageAmount: {
    fontSize: 26,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});