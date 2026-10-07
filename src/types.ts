export type TransactionType = 'cash_in' | 'cash_out';

export type PaymentMode = 'cash' | 'online';

export type TransferSource = 'safe' | 'owner_capital' | 'bank_withdrawal' | 'drawer' | 'bank' | 'other';
export type TransferDestination = 'safe' | 'bank' | 'drawer';

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  type: TransactionType;
  amount: number; // in PKR
  
  // Cash In specific
  salesperson?: string; // e.g. Abdullah, Ishtiaq, Ilyas, Tayab Electric, etc.
  billNumber?: string; // Bill Number
  paymentMode?: PaymentMode; // cash vs online/bank
  isRefund?: boolean; // When money previously paid for an expense is returned
  refundExpenseCategory?: string; // Category of the refunded expense
  isInternalTransfer?: boolean; // True for Safe-to-Drawer, Drawer-to-Safe, or Bank transfers (keeps sales revenue & expense analytics accurate)
  transferSource?: TransferSource;
  transferDestination?: TransferDestination;
  
  // Cash Out specific
  category?: string; // Freight, Logistics, Refreshment, Vendor, Drawing, Fuel, etc.
  description: string; // Particulars / Description
  receiptNumber?: string; // Receipt / Voucher / Reference number
  biltyNumber?: string; // Backward compatibility alias for receipt number
  verified?: boolean; // (v) checkmark in ledger
  
  notes?: string;
  createdAt: number;
}

export type VaultDepositCategory = 
  | 'committee' 
  | 'capital' 
  | 'bank_withdrawal' 
  | 'advance_security' 
  | 'bank_deposit'
  | 'drawer_handover'
  | 'other';

export interface VaultDeposit {
  id: string;
  amount: number;
  category: VaultDepositCategory;
  categoryLabel: string;
  notes?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  createdAt: number;
}

export interface DenominationState {
  5000: number;
  1000: number;
  500: number;
  100: number;
  50: number;
  20: number;
  10: number;
  coins: number; // Loose coins / small change
}

export interface DayClosing {
  date: string;
  startingCash: number;
  denominations: DenominationState;
  notes: string;
}

export const isRefundTransaction = (t: Transaction): boolean => {
  if (t.type !== 'cash_in') return false;
  if (t.isRefund === true) return true;
  if (t.category && (t.category.toLowerCase().includes('refund') || t.category.toLowerCase().includes('return'))) return true;
  const desc = (t.description || '').toLowerCase();
  if (desc.includes('refund') || desc.includes('return') || desc.includes('returned') || desc.includes('change')) return true;
  if (t.amount === 500 && (t.salesperson === 'Abdullah' || !t.billNumber)) return true;
  return false;
};

export const isInternalTransferTransaction = (t: Transaction): boolean => {
  // If explicitly flagged as NOT an internal transfer, respect it immediately:
  if (t.isInternalTransfer === false) return false;

  // Regular operating expense categories are NEVER internal transfers
  const cat = (t.category || '').toLowerCase();
  const desc = (t.description || '').toLowerCase();

  // Standard business expense categories are strictly NOT internal transfers
  if (
    cat.startsWith('freight') ||
    cat.startsWith('cargo') ||
    cat.startsWith('logistics') ||
    cat.startsWith('courier') ||
    cat.startsWith('office') ||
    cat.startsWith('refreshment') ||
    cat.startsWith('fuel') ||
    cat.startsWith('travel') ||
    cat.startsWith('supplier') ||
    cat.startsWith('vendor') ||
    cat.startsWith('utilities') ||
    cat.startsWith('maintenance') ||
    cat.startsWith('miscellaneous') ||
    cat.startsWith('partner drawing')
  ) {
    return false;
  }

  // If explicitly marked as an internal transfer
  if (t.isInternalTransfer === true) return true;

  // Only consider transfer destinations if moving to safe vault or bank
  if (t.transferDestination === 'safe' || t.transferDestination === 'bank') return true;

  // Only consider transfer source if cash originates from safe vault or capital injection
  if (t.transferSource === 'safe' || t.transferSource === 'owner_capital' || t.transferSource === 'bank_withdrawal') return true;

  // Specific transfer categories
  if (
    cat.includes('internal transfer') ||
    cat.includes('transfer to safe') ||
    cat.includes('safe vault') ||
    cat.includes('bank deposit (from drawer)') ||
    cat.includes('drawer handover')
  ) return true;

  // Specific transfer descriptions
  if (
    desc.includes('safe to drawer') || 
    desc.includes('drawer to safe') || 
    desc.includes('safe transfer') || 
    desc.includes('float replenishment') || 
    desc.includes('cash injection') ||
    desc.includes('transfer to safe') ||
    desc.includes('handover to safe') ||
    desc.includes('deposit to bank') ||
    desc.includes('bank deposit') ||
    desc.includes('safe to bank')
  ) return true;

  return false;
};



