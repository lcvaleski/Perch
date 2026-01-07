import { Transaction } from './Transaction';

export class TransactionState {
  transaction: Transaction;

  constructor(transaction: Transaction) {
    this.transaction = transaction;
  }
}