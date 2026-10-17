export type TransactionType = 'cash_in' | 'cash_out';

export type PaymentMode = 'cash' | 'online';

export type TransferSource = 'safe' | 'owner_capital' | 'bank_withdrawal' | 'drawer' | 'bank' | 'other';
export type TransferDestination = 'safe' | 'bank' | 'drawer' | 'individual';

export type MainCashOutCategory = 'expenses' | 'vendor_payments' | 'market_payments';

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
  mainCategory?: MainCashOutCategory; // 'expenses' | 'vendor_payments' | 'market_payments'
  partyName?: string; // Vendor name or Creditor name (for vendor payments / market creditor payments)
  category?: string; // Specific subcategory / category
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
  isConsolidated?: boolean;
  consolidatedAt?: number;
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

/**
 * Checks if a transaction is a Day-End Safe Vault Handover (Drawer -> Safe).
 * CRITICAL BUSINESS RULE:
 * Day-end safe vault handovers are internal movements of cash into the business vault,
 * NOT operating expenses or disbursements. They must NEVER be treated as "cash out" / expenses,
 * and must NEVER reduce net operating balance to negative.
 */
export const isDrawerToSafeTransfer = (t: Transaction): boolean => {
  if (t.transferDestination === 'safe') return true;
  const cat = (t.category || '').toLowerCase();
  if (
    cat.includes('drawer ➔ safe') || 
    cat.includes('transfer to safe') || 
    cat.includes('drawer to safe') || 
    cat.includes('handover to safe') ||
    cat.includes('sales transfer to safe')
  ) return true;
  const desc = (t.description || '').toLowerCase();
  if (
    desc.includes('handover to safe') || 
    desc.includes('sales transfer to safe') || 
    desc.includes('drawer to safe') || 
    desc.includes('transfer to safe') ||
    desc.includes('drawer ➔ safe')
  ) return true;
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

  // Only consider transfer destinations if moving to safe vault, bank, or individual
  if (t.transferDestination === 'safe' || t.transferDestination === 'bank' || t.transferDestination === 'individual') return true;

  // Only consider transfer source if cash originates from safe vault or capital injection
  if (t.transferSource === 'safe' || t.transferSource === 'owner_capital' || t.transferSource === 'bank_withdrawal') return true;

  // Specific transfer categories
  if (
    cat.includes('internal transfer') ||
    cat.includes('transfer to safe') ||
    cat.includes('safe vault') ||
    cat.includes('safe transfer') ||
    cat.includes('safe ➔') ||
    cat.includes('safe to individual') ||
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
    desc.includes('safe to bank') ||
    desc.includes('safe to individual') ||
    desc.includes('safe cash to') ||
    desc.includes('safe ➔')
  ) return true;

  return false;
};

export const getMainCashOutCategory = (t: Transaction): MainCashOutCategory | 'internal_transfer' => {
  if (t.isInternalTransfer || isInternalTransferTransaction(t)) {
    return 'internal_transfer';
  }
  if (t.mainCategory) {
    return t.mainCategory;
  }
  const cat = (t.category || '').toLowerCase();
  const desc = (t.description || '').toLowerCase();

  if (
    cat.includes('market') || 
    cat.includes('creditor') || 
    cat.includes('udhaar') || 
    desc.includes('market payment') || 
    desc.includes('creditor') ||
    desc.includes('market creditor')
  ) {
    return 'market_payments';
  }

  if (
    cat.includes('vendor') || 
    cat.includes('supplier') || 
    desc.includes('vendor payment') || 
    desc.includes('supplier')
  ) {
    return 'vendor_payments';
  }

  return 'expenses';
};



