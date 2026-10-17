import { Transaction, MainCashOutCategory } from '../types';

export const INITIAL_STAFF_COUNTERS = [
  'Abdullah',
  'Ishtiaq',
  'Ilyas',
  'Tayab Electric',
  'General Counter'
];

// The 3 main Cash Out categories requested by the user:
export const MAIN_CASHOUT_CATEGORIES: { id: MainCashOutCategory; label: string; shortLabel: string; description: string }[] = [
  { 
    id: 'expenses', 
    label: 'Expenses', 
    shortLabel: 'Expenses',
    description: 'Operating shop expenses (freight, utilities, fuel, office refreshment)' 
  },
  { 
    id: 'vendor_payments', 
    label: 'Vendor payments', 
    shortLabel: 'Vendor Payments',
    description: 'Payments to goods suppliers, manufacturers & inventory vendors' 
  },
  { 
    id: 'market_payments', 
    label: 'Market payments which is a creditor', 
    shortLabel: 'Market Creditor',
    description: 'Payments to market creditors, wholesale udhaar & credit account settlements' 
  }
];

// Operating expense subcategories:
export const EXPENSE_CATEGORIES = [
  'Freight & Cargo',
  'Logistics & Courier',
  'Office & Refreshment',
  'Fuel & Travel',
  'Utilities & Maintenance',
  'Safe Transfer to Individual',
  'Bank Deposit (From Drawer)',
  'Miscellaneous'
];

// Vendor payment subcategories:
export const VENDOR_PAYMENT_SUBCATEGORIES = [
  'Raw Materials & Supplies',
  'Goods / Stock Purchase',
  'Factory / Manufacturer Invoice',
  'Equipment & Machinery Parts',
  'Packaging Material',
  'Vendor Advance / Token',
  'Direct Supplier Settlement'
];

// Market creditor payment subcategories:
export const MARKET_CREDITOR_SUBCATEGORIES = [
  'Market Creditor Settlement',
  'Wholesale Market Account',
  'Market Udhaar Clearance',
  'Weekly Mandi / Bazar Creditor',
  'Brand Distributor Credit Payment',
  'Partial Credit Installment',
  'Full Balance Clearance'
];

export const COMMON_VENDORS = [
  'Saqib Electric',
  'Diamond Cables',
  'Al-Madina Traders',
  'Pakistan Cables',
  'Pak Star Goods',
  'Universal Hardware',
  'Royal Electric Co.'
];

export const COMMON_MARKET_CREDITORS = [
  'Akbari Mandi Creditor',
  'Shah Alam Market Creditor',
  'Brand Distributor Account',
  'Wholesale Market Creditor',
  'Chamber Wholesale Creditor',
  'Bano Bazar Creditor',
  'General Market Creditor'
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
