import React, { useState, useEffect } from 'react';
import { 
  Pencil, 
  X, 
  Check, 
  Calendar, 
  Clock, 
  User, 
  Hash, 
  Tag, 
  Truck, 
  Store, 
  Briefcase, 
  Lock, 
  FileText, 
  CheckSquare, 
  Square,
  Save,
  CreditCard,
  Banknote
} from 'lucide-react';
import { Transaction, TransactionType, PaymentMode, MainCashOutCategory } from '../types';
import { 
  EXPENSE_CATEGORIES, 
  VENDOR_PAYMENT_SUBCATEGORIES, 
  MARKET_CREDITOR_SUBCATEGORIES,
  COMMON_VENDORS,
  COMMON_MARKET_CREDITORS
} from '../data/sampleLedger';
import { formatPKR } from '../utils/exportSpreadsheet';

interface EditTransactionModalProps {
  isOpen: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Transaction>) => void;
  staffList: string[];
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  isOpen,
  transaction,
  onClose,
  onSave,
  staffList
}) => {
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [type, setType] = useState<TransactionType>('cash_in');
  const [salesperson, setSalesperson] = useState<string>('');
  const [billNumber, setBillNumber] = useState<string>('');
  const [receiptNumber, setReceiptNumber] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [mainCategory, setMainCategory] = useState<MainCashOutCategory>('expenses');
  const [partyName, setPartyName] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [verified, setVerified] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Pre-fill state whenever transaction prop changes
  useEffect(() => {
    if (transaction) {
      setAmount(String(transaction.amount || ''));
      setDate(transaction.date || '');
      setTime(transaction.time || '');
      setType(transaction.type || 'cash_in');
      setSalesperson(transaction.salesperson || '');
      setBillNumber(transaction.billNumber || '');
      setReceiptNumber(transaction.receiptNumber || transaction.biltyNumber || '');
      setPaymentMode(transaction.paymentMode || 'cash');

      // Detect main category if not explicitly set
      let detectedMain: MainCashOutCategory = transaction.mainCategory || 'expenses';
      const catLower = (transaction.category || '').toLowerCase();
      const descLower = (transaction.description || '').toLowerCase();
      if (!transaction.mainCategory) {
        if (catLower.includes('vendor') || descLower.includes('vendor') || descLower.includes('supplier')) {
          detectedMain = 'vendor_payments';
        } else if (catLower.includes('creditor') || catLower.includes('market') || descLower.includes('creditor')) {
          detectedMain = 'market_payments';
        }
      }
      setMainCategory(detectedMain);
      setPartyName(transaction.partyName || (detectedMain !== 'expenses' ? transaction.salesperson || '' : ''));
      setCategory(transaction.category || (detectedMain === 'vendor_payments' ? VENDOR_PAYMENT_SUBCATEGORIES[0] : detectedMain === 'market_payments' ? MARKET_CREDITOR_SUBCATEGORIES[0] : EXPENSE_CATEGORIES[0]));
      setDescription(transaction.description || '');
      setNotes(transaction.notes || '');
      setVerified(!!transaction.verified);
      setErrorMsg('');
    }
  }, [transaction]);

  // Handle ESC key to dismiss
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !transaction) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('Please enter a valid amount greater than 0.');
      return;
    }
    if (!date) {
      setErrorMsg('Please select a valid date.');
      return;
    }

    const updates: Partial<Transaction> = {
      amount: numAmount,
      date,
      time: time.trim() || undefined,
      type,
      paymentMode,
      description: description.trim() || (type === 'cash_in' ? 'Sales Revenue' : category),
      notes: notes.trim() || undefined,
      verified
    };

    if (type === 'cash_in') {
      updates.salesperson = salesperson.trim() || undefined;
      updates.billNumber = billNumber.trim() || undefined;
      updates.category = category.trim() || 'Sales Revenue';
      updates.receiptNumber = receiptNumber.trim() || undefined;
    } else {
      updates.mainCategory = mainCategory;
      updates.category = category.trim() || EXPENSE_CATEGORIES[0];
      updates.partyName = (mainCategory === 'vendor_payments' || mainCategory === 'market_payments') 
        ? partyName.trim() || undefined 
        : undefined;
      updates.salesperson = partyName.trim() || salesperson.trim() || undefined;
      updates.receiptNumber = receiptNumber.trim() || undefined;
      updates.biltyNumber = receiptNumber.trim() || undefined;
    }

    onSave(transaction.id, updates);
    onClose();
  };

  const isInternalTransfer = transaction.isInternalTransfer;

  return (
    <div
      id="modal-edit-transaction"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-transaction-modal-title"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-stone-200 overflow-hidden my-6 transform transition-all"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <h3 id="edit-transaction-modal-title" className="text-sm sm:text-base font-bold text-stone-900">
                Edit Ledger Entry
              </h3>
              <p className="text-[11px] text-stone-500 font-mono">
                Entry ID: {transaction.id.slice(0, 16)}...
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors cursor-pointer"
            title="Close editor (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 max-h-[78vh] overflow-y-auto text-xs">
          {errorMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {isInternalTransfer && (
            <div className="p-2.5 bg-purple-50/80 border border-purple-200 rounded-xl text-purple-900 text-xs flex items-center gap-2">
              <Lock className="w-4 h-4 text-purple-700 shrink-0" />
              <span>
                <strong>Internal Safe / Bank Transfer:</strong> Updating the amount will automatically recalculate the safe balance.
              </span>
            </div>
          )}

          {/* Transaction Type Switcher */}
          {!isInternalTransfer && (
            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1">
                Transaction Type
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setType('cash_in')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    type === 'cash_in'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Banknote className="w-3.5 h-3.5" />
                  <span>Cash In (Sales Revenue)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType('cash_out')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    type === 'cash_out'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Cash Out (Expenses / Payments)</span>
                </button>
              </div>
            </div>
          )}

          {/* Amount Field with Quick Add Chips */}
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-3">
            <label htmlFor="edit-input-amount" className="block text-xs font-bold text-stone-800 mb-1">
              Amount (PKR) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-stone-400">Rs.</span>
              <input
                id="edit-input-amount"
                type="number"
                step="any"
                required
                value={amount}
                onChange={e => {
                  setAmount(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="0"
                className="w-full pl-10 pr-3 py-2 bg-white border border-stone-300 rounded-lg text-base font-mono font-bold text-stone-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden"
              />
            </div>
            {/* Quick adjust chips */}
            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              <span className="text-[10px] text-stone-400 font-medium">Quick Set:</span>
              {[500, 1000, 2000, 5000, 10000, 50000].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(String(val))}
                  className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 hover:border-stone-300 transition-colors cursor-pointer"
                >
                  +{val.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-input-date" className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-stone-500" />
                <span>Entry Date <span className="text-rose-500">*</span></span>
              </label>
              <input
                id="edit-input-date"
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-semibold text-stone-900 focus:bg-white focus:border-emerald-600 outline-hidden"
              />
            </div>
            <div>
              <label htmlFor="edit-input-time" className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-stone-500" />
                <span>Entry Time</span>
              </label>
              <input
                id="edit-input-time"
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-semibold text-stone-900 focus:bg-white focus:border-emerald-600 outline-hidden"
              />
            </div>
          </div>

          {/* IF CASH OUT: 3 MAIN CATEGORIES SWITCHER */}
          {type === 'cash_out' && !isInternalTransfer && (
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Cash Out Category Classification:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setMainCategory('expenses');
                      setCategory(EXPENSE_CATEGORIES[0]);
                    }}
                    className={`py-2 px-2 rounded-lg border text-center transition-all cursor-pointer ${
                      mainCategory === 'expenses'
                        ? 'bg-amber-100 border-amber-400 text-amber-950 font-bold shadow-2xs'
                        : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5 mx-auto mb-0.5 text-amber-700" />
                    <span>1. Expenses</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMainCategory('vendor_payments');
                      setCategory(VENDOR_PAYMENT_SUBCATEGORIES[0]);
                    }}
                    className={`py-2 px-2 rounded-lg border text-center transition-all cursor-pointer ${
                      mainCategory === 'vendor_payments'
                        ? 'bg-blue-100 border-blue-400 text-blue-950 font-bold shadow-2xs'
                        : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5 mx-auto mb-0.5 text-blue-700" />
                    <span>2. Vendor Payments</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMainCategory('market_payments');
                      setCategory(MARKET_CREDITOR_SUBCATEGORIES[0]);
                    }}
                    className={`py-2 px-2 rounded-lg border text-center transition-all cursor-pointer ${
                      mainCategory === 'market_payments'
                        ? 'bg-purple-100 border-purple-400 text-purple-950 font-bold shadow-2xs'
                        : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <Store className="w-3.5 h-3.5 mx-auto mb-0.5 text-purple-700" />
                    <span>3. Market (Creditor)</span>
                  </button>
                </div>
              </div>

              {/* Vendor / Creditor Name input */}
              {mainCategory === 'vendor_payments' && (
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5">
                  <label htmlFor="edit-input-vendor" className="block text-xs font-bold text-blue-950 flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-blue-700" />
                    <span>Vendor / Supplier Name</span>
                  </label>
                  <div className="flex flex-wrap items-center gap-1">
                    {COMMON_VENDORS.slice(0, 4).map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setPartyName(v)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                          partyName === v
                            ? 'bg-blue-700 text-white border-blue-800'
                            : 'bg-white text-stone-700 border-blue-200 hover:bg-blue-100'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  <input
                    id="edit-input-vendor"
                    type="text"
                    value={partyName}
                    onChange={e => setPartyName(e.target.value)}
                    placeholder="e.g. Saqib Electric, Diamond Cables..."
                    className="w-full px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-semibold text-stone-900 focus:border-blue-600 outline-hidden"
                  />
                </div>
              )}

              {mainCategory === 'market_payments' && (
                <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-1.5">
                  <label htmlFor="edit-input-creditor" className="block text-xs font-bold text-purple-950 flex items-center gap-1">
                    <Store className="w-3.5 h-3.5 text-purple-700" />
                    <span>Market Creditor / Party Name</span>
                  </label>
                  <div className="flex flex-wrap items-center gap-1">
                    {COMMON_MARKET_CREDITORS.slice(0, 4).map(cred => (
                      <button
                        key={cred}
                        type="button"
                        onClick={() => setPartyName(cred)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                          partyName === cred
                            ? 'bg-purple-700 text-white border-purple-800'
                            : 'bg-white text-stone-700 border-purple-200 hover:bg-purple-100'
                        }`}
                      >
                        {cred}
                      </button>
                    ))}
                  </div>
                  <input
                    id="edit-input-creditor"
                    type="text"
                    value={partyName}
                    onChange={e => setPartyName(e.target.value)}
                    placeholder="e.g. Akbari Mandi Creditor, Shah Alam Creditor..."
                    className="w-full px-3 py-1.5 bg-white border border-purple-300 rounded-lg text-xs font-semibold text-stone-900 focus:border-purple-600 outline-hidden"
                  />
                </div>
              )}

              {/* Subcategory dropdown */}
              <div>
                <label htmlFor="edit-select-subcat" className="block text-xs font-bold text-stone-700 mb-1">
                  {mainCategory === 'expenses'
                    ? 'Expense Category'
                    : mainCategory === 'vendor_payments'
                    ? 'Vendor Invoice Type'
                    : 'Creditor Settlement Type'}
                </label>
                <select
                  id="edit-select-subcat"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-semibold text-stone-900 focus:bg-white focus:border-emerald-600 outline-hidden"
                >
                  {mainCategory === 'expenses' && EXPENSE_CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  {mainCategory === 'vendor_payments' && VENDOR_PAYMENT_SUBCATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  {mainCategory === 'market_payments' && MARKET_CREDITOR_SUBCATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* IF CASH IN: Salesperson / Counter & Bill # */}
          {type === 'cash_in' && !isInternalTransfer && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="edit-select-salesperson" className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-stone-500" />
                  <span>Salesperson / Counter</span>
                </label>
                <div className="space-y-1.5">
                  <select
                    id="edit-select-salesperson"
                    value={salesperson}
                    onChange={e => setSalesperson(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-semibold text-stone-900 focus:bg-white focus:border-emerald-600 outline-hidden"
                  >
                    {staffList.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                    {!staffList.includes(salesperson) && salesperson && (
                      <option value={salesperson}>{salesperson}</option>
                    )}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="edit-input-bill" className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-stone-500" />
                  <span>Bill # / Receipt #</span>
                </label>
                <input
                  id="edit-input-bill"
                  type="text"
                  value={billNumber}
                  onChange={e => setBillNumber(e.target.value)}
                  placeholder="e.g. 104, 3951"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-semibold text-stone-900 focus:bg-white focus:border-emerald-600 outline-hidden"
                />
              </div>
            </div>
          )}

          {/* Receipt / Voucher # for Cash Out */}
          {type === 'cash_out' && (
            <div>
              <label htmlFor="edit-input-receipt" className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-stone-500" />
                <span>Receipt / Voucher / Invoice #</span>
              </label>
              <input
                id="edit-input-receipt"
                type="text"
                value={receiptNumber}
                onChange={e => setReceiptNumber(e.target.value)}
                placeholder="e.g. Receipt # 9250, Inv # 440"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-semibold text-stone-900 focus:bg-white focus:border-emerald-600 outline-hidden"
              />
            </div>
          )}

          {/* Payment Mode */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Payment Mode
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 rounded-lg">
              <button
                type="button"
                onClick={() => setPaymentMode('cash')}
                className={`py-1.5 px-3 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  paymentMode === 'cash'
                    ? 'bg-white text-stone-900 shadow-2xs border border-stone-300'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Banknote className="w-3.5 h-3.5 text-emerald-700" />
                <span>Cash (Register Drawer)</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode('online')}
                className={`py-1.5 px-3 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  paymentMode === 'online'
                    ? 'bg-rose-600 text-white shadow-2xs font-bold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Online / Bank Transfer</span>
              </button>
            </div>
          </div>

          {/* Particulars / Description */}
          <div>
            <label htmlFor="edit-input-desc" className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-stone-500" />
              <span>Particulars / Description</span>
            </label>
            <input
              id="edit-input-desc"
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Freight delivery cargo, Counter sales, Shop tea..."
              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs text-stone-900 focus:bg-white focus:border-emerald-600 outline-hidden"
            />
          </div>

          {/* Notes (Optional) */}
          <div>
            <label htmlFor="edit-input-notes" className="block text-xs font-bold text-stone-700 mb-1">
              Additional Notes (Optional)
            </label>
            <input
              id="edit-input-notes"
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Optional remarks, reference details..."
              className="w-full px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs text-stone-900 focus:bg-white focus:border-emerald-600 outline-hidden"
            />
          </div>

          {/* Verified Toggle */}
          <div className="pt-1">
            <label
              htmlFor="edit-checkbox-verified"
              className="flex items-center gap-2 p-2.5 bg-stone-50 border border-stone-200 rounded-xl cursor-pointer hover:bg-stone-100 transition-colors"
            >
              <input
                id="edit-checkbox-verified"
                type="checkbox"
                checked={verified}
                onChange={e => setVerified(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
              />
              <div>
                <span className="text-xs font-bold text-stone-900 flex items-center gap-1">
                  <span>Mark as Verified (✓)</span>
                </span>
                <span className="text-[11px] text-stone-500 block">
                  Displays verified checkmark tick in ledger and daily reconciliation
                </span>
              </div>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="btn-save-edit-transaction"
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
