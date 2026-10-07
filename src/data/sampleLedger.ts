import { Transaction } from '../types';

export const INITIAL_STAFF_COUNTERS = [
  'Abdullah',
  'Ishtiaq',
  'Ilyas',
  'Tayab Electric',
  'General Counter'
];

export const EXPENSE_CATEGORIES = [
  'Freight & Cargo',
  'Logistics & Courier',
  'Office & Refreshment',
  'Fuel & Travel',
  'Supplier & Vendor Payment',
  'Partner Drawing & Transfer',
  'Transfer to Safe (Vault)',
  'Bank Deposit (From Drawer)',
  'Utilities & Maintenance',
  'Miscellaneous'
];

// No demo data - pristine empty transaction log
export const SAMPLE_TRANSACTIONS: Transaction[] = [];

export const EMPTY_DENOMINATIONS = {
  5000: 0,
  1000: 0,
  500: 0,
  100: 0,
  50: 0,
  20: 0,
  10: 0,
  coins: 0
};

export const INITIAL_SLIP_DENOMINATIONS = {
  ...EMPTY_DENOMINATIONS
};
