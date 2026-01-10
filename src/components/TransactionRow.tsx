import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { TransactionState } from '../models/TransactionState';
import { TransactionUtils } from '../models/Transaction';
import { Colors } from '../utils/colors';

interface TransactionRowProps {
  state: TransactionState;
  isNew?: boolean;
  isHidden?: boolean;
  onToggleHidden?: () => void;
}

export const TransactionRow: React.FC<TransactionRowProps> = ({ state, isNew, isHidden, onToggleHidden }) => {
  const amount = TransactionUtils.getAmount(state.transaction);
  const accountName = TransactionUtils.getAccountName(state.transaction);

  // Format date as "Jan 6, 2026"
  const formatDate = () => {
    const date = new Date(state.transaction.date);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  return (
    <View style={{ opacity: isHidden ? 0.5 : 1 }}>
      <TouchableOpacity
        style={styles.container}
        onPress={onToggleHidden}
        activeOpacity={0.7}
      >
        {/* Left Column */}
        <View style={styles.leftColumn}>
          <View style={styles.merchantContainer}>
            <Text style={styles.merchantName} numberOfLines={1} ellipsizeMode="tail">
              {state.transaction.payee.length > 25
                ? state.transaction.payee.substring(0, 20) + '...'
                : state.transaction.payee}
            </Text>
          </View>
          <Text style={styles.dateText}>{formatDate()}</Text>
        </View>

        {/* Right Column */}
        <View style={styles.rightColumn}>
          <View style={styles.amountRow}>
            <Text style={styles.amount}>${amount.toFixed(2)}</Text>
            {isNew && (
              <View style={[styles.newDot, { backgroundColor: Colors.riverBlueLighter }]} />
            )}
          </View>
          {accountName && (
            <Text style={styles.paymentMethod}>{accountName}</Text>
          )}
        </View>
      </TouchableOpacity>
      <View style={styles.separator} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 40,
    backgroundColor: Colors.riverBackground,
  },
  leftColumn: {
    flex: 1,
    paddingRight: 12,
  },
  merchantContainer: {
    minHeight: 20,
    marginBottom: 4,
  },
  merchantName: {
    fontSize: 13,
    fontWeight: '400',
    color: Colors.riverTextOpacity07,
    lineHeight: 17,
  },
  dateText: {
    fontSize: 10,
    color: Colors.riverTextSecondaryOpacity06,
  },
  rightColumn: {
    alignItems: 'flex-end',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  amount: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.riverText,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  newDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  paymentMethod: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.riverTextSecondaryOpacity07,
  },
  separator: {
    height: 0.5,
    backgroundColor: Colors.riverBorderOpacity05,
    marginLeft: 40,
  },
});