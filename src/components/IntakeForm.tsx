import React, { useState, useEffect } from 'react';
import { PlusCircle, MinusCircle, Check, ArrowRight, Tag, User, Hash, CheckSquare, Sparkles, Undo2, RotateCcw, Save, Lock, ArrowUpRight, Landmark, Briefcase, Calendar, Clock } from 'lucide-react';
import { Transaction, TransactionType, PaymentMode } from '../types';
import { INITIAL_STAFF_COUNTERS, EXPENSE_CATEGORIES } from '../data/sampleLedger';
import { formatPKR } from '../utils/exportSpreadsheet';

interface IntakeFormProps {
  onAddTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => void;
  staffList: string[];
  onAddStaff: (name: string) => void;
  selectedDate: string;
  cashInCount?: number;
  cashOutCount?: number;
  safeRunningBalance?: number;
  onDeductFromSafe?: (amount: number) => boolean;
}

export const IntakeForm: React.FC<IntakeFormProps> = ({
  onAddTransaction,
  staffList,
  onAddStaff,
  selectedDate,
  cashInCount = 0,
  cashOutCount = 0,
  safeRunningBalance = 0,
  onDeductFromSafe
}) => {
  const [type, setType] = useState<TransactionType>('cash_in');
  const [cashInSubtype, setCashInSubtype] = useState<'sales' | 'refund' | 'injection'>('sales');
  const [injectionSource, setInjectionSource] = useState<'safe' | 'owner_capital' | 'bank_withdrawal' | 'other'>('safe');
  const [isExpenseRefund, setIsExpenseRefund] = useState<boolean>(false);
  const [refundCategory, setRefundCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState<string>('');
  const [salesperson, setSalesperson] = useState<string>(staffList[0] || 'Abdullah');
  const [newStaffInput, setNewStaffInput] = useState<string>('');
  const [isAddingNewStaff, setIsAddingNewStaff] = useState<boolean>(false);
  const [billNumber, setBillNumber] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [description, setDescription] = useState<string>('');
  const [receiptNumber, setReceiptNumber] = useState<string>('');
  const [verified, setVerified] = useState<boolean>(true);
  const [entryDate, setEntryDate] = useState<string>(selectedDate);

  useEffect(() => {
    setEntryDate(selectedDate);
  }, [selectedDate]);

  const getTodayString = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const getYesterdayString = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const [entryTime, setEntryTime] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [justSubmitted, setJustSubmitted] = useState<boolean>(false);

  const quickAmounts = [500, 1000, 2000, 5000, 10000, 50000];

  const refundPresets = [
    { label: 'Fuel / petrol change', cat: 'Fuel & Travel', desc: 'Remaining petrol change returned' },
    { label: 'Courier advance change', cat: 'Logistics & Courier', desc: 'Unused courier/Bykea advance returned' },
    { label: 'Tea / chai change', cat: 'Office & Refreshment', desc: 'Remaining tea/refreshment change returned' },
    { label: 'Cargo / freight refund', cat: 'Freight & Cargo', desc: 'Cancelled freight / cargo delivery refund' },
    { label: 'Supplier refund', cat: 'Supplier & Vendor Payment', desc: 'Supplier return refund' }
  ];

  const handleQuickAddAmount = (addVal: number) => {
    const current = Number(amount) || 0;
    setAmount(String(current + addVal));
  };

  const handleClearForm = () => {
    setAmount('');
    setBillNumber('');
    setDescription('');
    setReceiptNumber('');
    setIsExpenseRefund(false);
    setCashInSubtype('sales');
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      document.getElementById('input-amount')?.focus();
      return;
    }

    if (type === 'cash_in') {
      if (cashInSubtype === 'injection') {
        if (injectionSource === 'safe' && onDeductFromSafe) {
          onDeductFromSafe(numAmount);
        }
        const sourceLabel = injectionSource === 'safe' 
          ? 'Safe Vault' 
          : injectionSource === 'owner_capital' 
          ? 'Owner Capital' 
          : injectionSource === 'bank_withdrawal'
          ? 'Bank Cash'
          : 'Other Injection';

        const targetDate = entryDate || selectedDate;
        onAddTransaction({
          date: targetDate,
          time: entryTime,
          type: 'cash_in',
          amount: numAmount,
          salesperson: salesperson.trim() || 'Safe / Transfer',
          billNumber: billNumber.trim() || undefined,
          paymentMode: 'cash',
          isInternalTransfer: true,
          transferSource: injectionSource,
          category: `Internal Transfer (${sourceLabel})`,
          description: description.trim() || `Cash injection from ${sourceLabel} to Drawer (Float Replenishment)`
        });
      } else if (cashInSubtype === 'refund' || isExpenseRefund) {
        const targetDate = entryDate || selectedDate;
        onAddTransaction({
          date: targetDate,
          time: entryTime,
          type: 'cash_in',
          amount: numAmount,
          salesperson: salesperson.trim() || 'Counter',
          billNumber: billNumber.trim() || undefined,
          paymentMode,
          isRefund: true,
          refundExpenseCategory: refundCategory,
          category: `Refund: ${refundCategory}`,
          description: description.trim() || `Cash refund from ${refundCategory}`
        });
      } else {
        const targetDate = entryDate || selectedDate;
        onAddTransaction({
          date: targetDate,
          time: entryTime,
          type: 'cash_in',
          amount: numAmount,
          salesperson: salesperson.trim() || 'Counter',
          billNumber: billNumber.trim() || undefined,
          paymentMode,
          description: description.trim() || (paymentMode === 'online' ? 'Online Transfer Sale' : 'Cash Sale')
        });
      }
      // Reset cash in fields
      setAmount('');
      setBillNumber('');
      setDescription('');
      setIsExpenseRefund(false);
    } else {
      const isTransfer = category.includes('Safe') || category.includes('Bank Deposit') || category.includes('Internal Transfer');
      const targetDate = entryDate || selectedDate;
      const cleanReceipt = receiptNumber.trim() || undefined;
      onAddTransaction({
        date: targetDate,
        time: entryTime,
        type: 'cash_out',
        amount: numAmount,
        category,
        paymentMode,
        description: description.trim() || category.split('(')[0].trim(),
        receiptNumber: cleanReceipt,
        biltyNumber: cleanReceipt,
        verified,
        isInternalTransfer: isTransfer,
        transferDestination: category.includes('Safe') ? 'safe' : category.includes('Bank Deposit') ? 'bank' : undefined,
        transferSource: isTransfer ? 'drawer' : undefined
      });
      // Reset cash out fields
      setAmount('');
      setDescription('');
      setReceiptNumber('');
      setPaymentMode('cash');
    }

    setJustSubmitted(true);
    setTimeout(() => setJustSubmitted(false), 1500);
  };

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStaffInput.trim()) {
      onAddStaff(newStaffInput.trim());
      setSalesperson(newStaffInput.trim());
      setNewStaffInput('');
      setIsAddingNewStaff(false);
    }
  };

  return (
    <div id="intake-form-container" className="bg-white border border-stone-200 rounded-2xl shadow-xs p-5 md:p-6 mb-6">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100 mb-5">
        <div>
          <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
            <span>Transaction Intake Form</span>
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Record sales receipts or business cash payouts in real time.
          </p>
        </div>

        {/* Cash In / Cash Out Selectors with Entry Counts Underneath */}
        <div className="flex p-1 bg-stone-100 border border-stone-200 rounded-xl w-full sm:w-auto sm:min-w-[300px]">
          <button
            id="tab-btn-cash-in"
            type="button"
            onClick={() => setType('cash_in')}
            className={`flex-1 py-2 px-3 rounded-lg text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
              type === 'cash_in'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>Cash In</span>
            </div>
            <span className={`text-[11px] font-mono mt-0.5 font-semibold ${
              type === 'cash_in' ? 'text-emerald-100' : 'text-emerald-700'
            }`}>
              {cashInCount} {cashInCount === 1 ? 'entry' : 'entries'}
            </span>
          </button>

          <button
            id="tab-btn-cash-out"
            type="button"
            onClick={() => setType('cash_out')}
            className={`flex-1 py-2 px-3 rounded-lg text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
              type === 'cash_out'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
              <MinusCircle className="w-4 h-4 shrink-0" />
              <span>Cash Out</span>
            </div>
            <span className={`text-[11px] font-mono mt-0.5 font-semibold ${
              type === 'cash_out' ? 'text-amber-100' : 'text-amber-700'
            }`}>
              {cashOutCount} {cashOutCount === 1 ? 'entry' : 'entries'}
            </span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ROW 1: Amount & Quick Add Buttons */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="input-amount" className="text-xs font-bold text-stone-700 flex items-center gap-1">
              <span>Amount in PKR</span>
              <span className="text-rose-500">*</span>
            </label>
            <span className="text-[11px] text-stone-500 font-medium">Pakistani Rupees</span>
          </div>

          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-stone-500 text-sm">
              Rs.
            </span>
            <input
              id="input-amount"
              type="number"
              min="1"
              step="any"
              required
              placeholder="e.g. 10500"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 font-bold text-lg focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 outline-hidden transition-all"
            />
          </div>

          {/* Quick Amount Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className="text-[11px] text-stone-400 font-medium mr-1">Quick Add:</span>
            {quickAmounts.map(val => (
              <button
                key={val}
                type="button"
                onClick={() => handleQuickAddAmount(val)}
                className="px-2 py-0.5 text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md font-medium transition-colors"
              >
                +{val >= 1000 ? `${val / 1000}k` : val}
              </button>
            ))}
            {amount && (
              <button
                id="btn-clear-amount"
                type="button"
                onClick={() => setAmount('')}
                className="text-[11px] text-rose-600 hover:text-rose-700 hover:underline ml-auto font-medium cursor-pointer"
                title="Clear entered amount"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* CASH IN FIELDS */}
        {type === 'cash_in' && (
          <div className="space-y-3 pt-1">
            {/* Revenue Type Selector: Sales vs Expense Refund vs Cash Injection */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-1.5 bg-stone-100/90 rounded-xl border border-stone-200">
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  id="btn-in-type-sales"
                  onClick={() => {
                    setCashInSubtype('sales');
                    setIsExpenseRefund(false);
                    setDescription('');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    cashInSubtype === 'sales'
                      ? 'bg-white text-emerald-800 shadow-xs border border-emerald-200'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Sales Revenue (Counter / Bill)
                </button>
                <button
                  type="button"
                  id="btn-in-type-refund"
                  onClick={() => {
                    setCashInSubtype('refund');
                    setIsExpenseRefund(true);
                    setPaymentMode('cash');
                    if (!description) {
                      setDescription('Remaining petrol / expense cash returned');
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    cashInSubtype === 'refund'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>Expense Refund</span>
                </button>
                <button
                  type="button"
                  id="btn-in-type-injection"
                  onClick={() => {
                    setCashInSubtype('injection');
                    setIsExpenseRefund(false);
                    setPaymentMode('cash');
                    if (!description) {
                      setDescription('Morning drawer float replenishment');
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    cashInSubtype === 'injection'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Cash Injection / Safe Transfer</span>
                </button>
              </div>

              <span className="text-[11px] text-stone-500 font-medium px-2">
                {cashInSubtype === 'injection'
                  ? 'Injecting morning float or transferring from safe to drawer'
                  : cashInSubtype === 'refund'
                  ? 'Adding returned expense money back to drawer balance'
                  : 'Recording customer sales revenue'}
              </span>
            </div>

            {/* CASH INJECTION & SAFE TRANSFER MODE */}
            {cashInSubtype === 'injection' ? (
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3">
                <div className="flex items-start gap-2.5 text-xs text-indigo-950">
                  <div className="p-1 rounded bg-indigo-200/80 text-indigo-900 shrink-0 mt-0.5">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <strong className="block font-bold">Cash Injection / Drawer Float Replenishment:</strong>
                    <span>
                      Move money from the Cash Safe into the drawer, or record fresh Owner Capital float / Bank Withdrawal.
                      This replenishes physical drawer cash without inflating sales revenue.
                    </span>
                  </div>
                </div>

                {/* Source Selection */}
                <div>
                  <label className="block text-xs font-bold text-indigo-950 mb-1.5">
                    Transfer / Injection Source:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setInjectionSource('safe');
                        setDescription('Morning drawer float from Cash Safe');
                      }}
                      className={`p-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                        injectionSource === 'safe'
                          ? 'bg-white border-indigo-500 ring-2 ring-indigo-500/20 shadow-2xs font-bold text-indigo-950'
                          : 'bg-white/80 border-stone-200 hover:bg-white text-stone-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-indigo-600" />
                        <span>From Safe (Vault)</span>
                      </div>
                      <span className="block text-[10px] text-stone-500 font-mono mt-0.5">
                        Avail: {formatPKR(safeRunningBalance)}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setInjectionSource('owner_capital');
                        setDescription('Owner personal capital float injection');
                      }}
                      className={`p-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                        injectionSource === 'owner_capital'
                          ? 'bg-white border-emerald-500 ring-2 ring-emerald-500/20 shadow-2xs font-bold text-emerald-950'
                          : 'bg-white/80 border-stone-200 hover:bg-white text-stone-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Owner Capital</span>
                      </div>
                      <span className="block text-[10px] text-stone-500 mt-0.5">
                        Personal float
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setInjectionSource('bank_withdrawal');
                        setDescription('Cash withdrawal from bank into drawer');
                      }}
                      className={`p-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                        injectionSource === 'bank_withdrawal'
                          ? 'bg-white border-blue-500 ring-2 ring-blue-500/20 shadow-2xs font-bold text-blue-950'
                          : 'bg-white/80 border-stone-200 hover:bg-white text-stone-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Landmark className="w-3.5 h-3.5 text-blue-600" />
                        <span>Bank Cash</span>
                      </div>
                      <span className="block text-[10px] text-stone-500 mt-0.5">
                        Account withdrawal
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setInjectionSource('other');
                        setDescription('Miscellaneous drawer float injection');
                      }}
                      className={`p-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                        injectionSource === 'other'
                          ? 'bg-white border-purple-500 ring-2 ring-purple-500/20 shadow-2xs font-bold text-purple-950'
                          : 'bg-white/80 border-stone-200 hover:bg-white text-stone-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <ArrowUpRight className="w-3.5 h-3.5 text-purple-600" />
                        <span>Other Injection</span>
                      </div>
                      <span className="block text-[10px] text-stone-500 mt-0.5">
                        Change / advance
                      </span>
                    </button>
                  </div>
                </div>

                {/* Quick Presets */}
                <div>
                  <span className="text-[11px] font-bold text-indigo-950 block mb-1">Quick Select Purpose:</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { label: 'Morning float replenishment', desc: 'Morning drawer float replenishment' },
                      { label: 'Register change (500/1000 notes)', desc: 'Register change support' },
                      { label: 'Emergency cash injection', desc: 'Emergency cash injection for payouts' },
                      { label: 'Bank withdrawal to drawer', desc: 'Cheque cash withdrawal deposited into register' }
                    ].map(p => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setDescription(p.desc)}
                        className="px-2.5 py-1 text-xs bg-white hover:bg-indigo-100/80 text-indigo-950 border border-indigo-200 rounded-lg font-medium transition-colors shadow-2xs"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  {/* Received / Handled By */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Received By (Cashier / Staff)
                    </label>
                    <select
                      id="select-injection-staff"
                      value={salesperson}
                      onChange={e => setSalesperson(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs font-semibold text-stone-800 focus:border-indigo-600 outline-hidden"
                    >
                      {staffList.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Description / Injection Details */}
                  <div className="md:col-span-2">
                    <label htmlFor="input-injection-desc" className="block text-xs font-bold text-stone-700 mb-1">
                      Transfer Particulars / Reason
                    </label>
                    <input
                      id="input-injection-desc"
                      type="text"
                      placeholder="e.g. Morning float replenishment from Safe, change for 5000 note"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs text-stone-800 focus:border-indigo-600 outline-hidden"
                    />
                  </div>
                </div>
              </div>
            ) : isExpenseRefund || cashInSubtype === 'refund' ? (
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
                <div className="flex items-start gap-2.5 text-xs text-amber-950">
                  <div className="p-1 rounded bg-amber-200/80 text-amber-900 shrink-0 mt-0.5">
                    <Undo2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <strong className="block font-bold">Returned Expense Cash (Reimbursement to Drawer):</strong>
                    <span>
                      Money returned from an errand, unused fuel advance, cancelled delivery, or vendor return.
                      Logging this here puts the money back into your drawer balance so your cash note count reconciles with Rs. 0 variance.
                    </span>
                  </div>
                </div>

                {/* Quick Presets */}
                <div>
                  <span className="text-[11px] font-bold text-amber-900 block mb-1">Quick Select Refund Reason:</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {refundPresets.map(preset => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setRefundCategory(preset.cat);
                          setDescription(preset.desc);
                        }}
                        className="px-2.5 py-1 text-xs bg-white hover:bg-amber-100/80 text-amber-950 border border-amber-300 rounded-lg font-medium transition-colors shadow-2xs"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  {/* Expense Category Refunded */}
                  <div>
                    <label htmlFor="select-refund-category" className="block text-xs font-bold text-stone-700 mb-1">
                      Original Expense Category
                    </label>
                    <select
                      id="select-refund-category"
                      value={refundCategory}
                      onChange={e => setRefundCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs font-semibold text-stone-800 focus:border-amber-600 outline-hidden"
                    >
                      {EXPENSE_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Staff Member Who Returned Money */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Returned By (Staff / Person)
                    </label>
                    <select
                      id="select-refund-staff"
                      value={salesperson}
                      onChange={e => setSalesperson(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs font-semibold text-stone-800 focus:border-amber-600 outline-hidden"
                    >
                      {staffList.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Payment Destination (Cash Drawer vs Bank) */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Returned Into
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-100 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setPaymentMode('cash')}
                        className={`py-1 px-2 rounded-md text-xs font-bold transition-all ${
                          paymentMode === 'cash'
                            ? 'bg-white text-emerald-800 shadow-xs border border-emerald-200'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        Cash Drawer
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMode('online')}
                        className={`py-1 px-2 rounded-md text-xs font-bold transition-all ${
                          paymentMode === 'online'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        Bank Transfer
                      </button>
                    </div>
                  </div>

                  {/* Description / Refund Details */}
                  <div className="md:col-span-2">
                    <label htmlFor="input-refund-desc" className="block text-xs font-bold text-stone-700 mb-1">
                      Refund Particulars / Details
                    </label>
                    <input
                      id="input-refund-desc"
                      type="text"
                      placeholder="e.g. Returned Rs. 400 petrol change from Ali, unused courier cash"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs text-stone-800 focus:border-amber-600 outline-hidden"
                    />
                  </div>

                  {/* Optional Reference / Slip # */}
                  <div className="md:col-span-1">
                    <label htmlFor="input-refund-slip" className="block text-xs font-bold text-stone-700 mb-1 flex items-center justify-between">
                      <span>Original Slip / Ref #</span>
                      <span className="text-[10px] text-stone-400 font-normal">Optional</span>
                    </label>
                    <input
                      id="input-refund-slip"
                      type="text"
                      placeholder="e.g. Bilty #, Slip #"
                      value={billNumber}
                      onChange={e => setBillNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs font-semibold text-stone-800 focus:border-amber-600 outline-hidden"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* STANDARD SALES REVENUE FIELDS */
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* Salesperson / Counter Tabs */}
                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    Counter / Salesperson
                  </label>
                  {!isAddingNewStaff ? (
                    <div className="space-y-1.5">
                      <select
                        id="select-salesperson"
                        value={salesperson}
                        onChange={e => {
                          if (e.target.value === '__add_new__') {
                            setIsAddingNewStaff(true);
                          } else {
                            setSalesperson(e.target.value);
                          }
                        }}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-semibold text-stone-800 focus:bg-white focus:border-emerald-600 outline-hidden"
                      >
                        {staffList.map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                        <option value="__add_new__">+ Add New Person / Counter...</option>
                      </select>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        placeholder="New counter name..."
                        value={newStaffInput}
                        onChange={e => setNewStaffInput(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 bg-white border border-emerald-500 rounded-lg text-xs"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleCreateStaff}
                        className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddingNewStaff(false)}
                        className="px-2 py-1.5 text-stone-500 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {/* Bill Number */}
                <div className="md:col-span-1">
                  <label htmlFor="input-bill-number" className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center justify-between">
                    <span>Bill Number</span>
                    <span className="text-[10px] text-stone-400 font-normal">Optional</span>
                  </label>
                  <div className="relative">
                    <Hash className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="input-bill-number"
                      type="text"
                      placeholder="e.g. 610, 1201, 3062"
                      value={billNumber}
                      onChange={e => setBillNumber(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-semibold text-stone-800 focus:bg-white focus:border-emerald-600 outline-hidden"
                    />
                  </div>
                </div>

                {/* Payment Mode (Cash vs Online Transfer) */}
                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    Payment Type
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-100 rounded-lg">
                    <button
                      type="button"
                      id="btn-mode-cash"
                      onClick={() => setPaymentMode('cash')}
                      className={`py-1 px-2 rounded-md text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                        paymentMode === 'cash'
                          ? 'bg-white text-emerald-800 shadow-xs border border-emerald-200'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <span>Cash</span>
                    </button>
                    <button
                      type="button"
                      id="btn-mode-online"
                      onClick={() => setPaymentMode('online')}
                      className={`py-1 px-2 rounded-md text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                        paymentMode === 'online'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <span>Online / Bank</span>
                    </button>
                  </div>
                </div>

                {/* Optional Customer/Item Note */}
                <div className="md:col-span-3">
                  <label htmlFor="input-in-description" className="block text-xs font-bold text-stone-700 mb-1">
                    Particulars / Customer Note
                  </label>
                  <input
                    id="input-in-description"
                    type="text"
                    placeholder="e.g. Wholesale electrical wires, Customer advance, or deposit reference"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs text-stone-800 focus:bg-white focus:border-emerald-600 outline-hidden"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* CASH OUT FIELDS */}
        {type === 'cash_out' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
            {/* Expense Category */}
            <div className="md:col-span-1">
              <label htmlFor="select-category" className="block text-xs font-bold text-stone-700 mb-1.5">
                Expense Category
              </label>
              <select
                id="select-category"
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-semibold text-stone-800 focus:bg-white focus:border-amber-600 outline-hidden"
              >
                {EXPENSE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Receipt / Voucher Reference # */}
            <div className="md:col-span-1">
              <label htmlFor="input-receipt-num" className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center justify-between">
                <span>Receipt / Voucher #</span>
                <span className="text-[10px] text-stone-400 font-normal">Optional</span>
              </label>
              <input
                id="input-receipt-num"
                type="text"
                placeholder="e.g. Receipt # 9250644, 4359"
                value={receiptNumber}
                onChange={e => setReceiptNumber(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-semibold text-stone-800 focus:bg-white focus:border-amber-600 outline-hidden"
              />
            </div>

            {/* Payment Source: Cash Drawer vs Bank Online */}
            <div className="md:col-span-1">
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                Paid From
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-100 rounded-lg">
                <button
                  type="button"
                  id="btn-out-mode-cash"
                  onClick={() => setPaymentMode('cash')}
                  className={`py-1 px-2 rounded-md text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                    paymentMode === 'cash'
                      ? 'bg-white text-amber-900 shadow-xs border border-amber-200'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <span>Cash Drawer</span>
                </button>
                <button
                  type="button"
                  id="btn-out-mode-online"
                  onClick={() => setPaymentMode('online')}
                  className={`py-1 px-2 rounded-md text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                    paymentMode === 'online'
                      ? 'bg-amber-700 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <span>Bank Account</span>
                </button>
              </div>
            </div>

            {/* Verified (✓) Toggle */}
            <div className="md:col-span-1 flex flex-col justify-end">
              <label
                htmlFor="checkbox-verified"
                className="flex items-center gap-2 px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg cursor-pointer hover:bg-stone-100 transition-colors"
              >
                <input
                  id="checkbox-verified"
                  type="checkbox"
                  checked={verified}
                  onChange={e => setVerified(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                />
                <span className="text-xs font-bold text-stone-800 flex items-center gap-1">
                  <span>Mark as Verified (✓)</span>
                  <span className="text-stone-400 font-normal text-[11px]">(Ledger Tick)</span>
                </span>
              </label>
            </div>

            {/* Description */}
            <div className="md:col-span-3">
              <label htmlFor="input-out-description" className="block text-xs font-bold text-stone-700 mb-1">
                Particulars / Payee Note
              </label>
              <input
                id="input-out-description"
                type="text"
                placeholder="e.g. Freight delivery cargo (2 pkgs), Bykea delivery, Nakash tea, Saqib Electric"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs text-stone-800 focus:bg-white focus:border-amber-600 outline-hidden"
              />
            </div>
          </div>
        )}

        {/* SUBMIT & CLEAR BUTTONS */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600">
            {/* Entry Date Picker with Quick Chips */}
            <div className="flex items-center gap-1.5 bg-stone-100 px-2.5 py-1.5 rounded-lg border border-stone-200">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-semibold text-stone-700">Date:</span>
              <input
                id="input-entry-date"
                type="date"
                value={entryDate}
                onChange={e => setEntryDate(e.target.value)}
                className="bg-transparent text-stone-800 font-bold outline-hidden cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setEntryDate(getTodayString())}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                  entryDate === getTodayString()
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                }`}
                title="Set date to Today"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setEntryDate(getYesterdayString())}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                  entryDate === getYesterdayString()
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                }`}
                title="Set date to Yesterday"
              >
                Yesterday
              </button>
            </div>

            {/* Entry Time */}
            <div className="flex items-center gap-1 bg-stone-100 px-2 py-1.5 rounded-lg border border-stone-200">
              <Clock className="w-3.5 h-3.5 text-stone-500" />
              <span className="font-semibold text-stone-700">Time:</span>
              <input
                type="time"
                value={entryTime}
                onChange={e => setEntryTime(e.target.value)}
                className="bg-transparent text-stone-800 font-bold outline-hidden cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(amount || billNumber || description || receiptNumber) && (
              <button
                id="btn-clear-form"
                type="button"
                onClick={handleClearForm}
                className="px-3 py-2 text-xs font-semibold text-stone-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer flex items-center gap-1 border border-stone-200"
                title="Clear all fields in this form"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear Form</span>
              </button>
            )}

            <button
              id="btn-submit-entry"
              type="submit"
              className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 text-white transition-all transform active:scale-95 shadow-xs cursor-pointer ${
                type === 'cash_in'
                  ? isExpenseRefund
                    ? 'bg-amber-600 hover:bg-amber-700 focus:ring-2 focus:ring-amber-600/30'
                    : 'bg-emerald-600 hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-600/30'
                  : 'bg-amber-600 hover:bg-amber-700 focus:ring-2 focus:ring-amber-600/30'
              }`}
            >
              {justSubmitted ? (
                <>
                  <Check className="w-4 h-4 text-white animate-bounce" />
                  <span>Saved to Spreadsheet!</span>
                </>
              ) : isExpenseRefund ? (
                <>
                  <Undo2 className="w-4 h-4" />
                  <span>Save to Spreadsheet (Cash Return)</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save to Spreadsheet</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
