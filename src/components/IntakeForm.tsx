import React, { useState, useEffect } from 'react';
import { PlusCircle, MinusCircle, Check, ArrowRight, Tag, User, Hash, CheckSquare, Sparkles, Undo2, RotateCcw, Save, Lock, ArrowUpRight, Landmark, Briefcase, Calendar, Clock, Truck, Store, Building2, CreditCard } from 'lucide-react';
import { Transaction, TransactionType, PaymentMode, MainCashOutCategory } from '../types';
import { 
  INITIAL_STAFF_COUNTERS, 
  EXPENSE_CATEGORIES, 
  MAIN_CASHOUT_CATEGORIES, 
  VENDOR_PAYMENT_SUBCATEGORIES, 
  MARKET_CREDITOR_SUBCATEGORIES,
  COMMON_VENDORS,
  COMMON_MARKET_CREDITORS 
} from '../data/sampleLedger';
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
  onTransferSafeToIndividual?: (amount: number, recipient: string, reason: string, receiptNumber?: string, notes?: string) => void;
}

export const IntakeForm: React.FC<IntakeFormProps> = ({
  onAddTransaction,
  staffList,
  onAddStaff,
  selectedDate,
  cashInCount = 0,
  cashOutCount = 0,
  safeRunningBalance = 0,
  onDeductFromSafe,
  onTransferSafeToIndividual
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
  const [outSource, setOutSource] = useState<'drawer' | 'safe' | 'bank'>('drawer');
  const [mainCategory, setMainCategory] = useState<MainCashOutCategory>('expenses');
  const [partyName, setPartyName] = useState<string>('');
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
    setPartyName('');
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
      const isSafeToIndividual = outSource === 'safe' || (mainCategory === 'expenses' && category.toLowerCase().includes('safe transfer to individual'));
      const isBankDeposit = !isSafeToIndividual && (category.includes('Bank Deposit') || outSource === 'bank');
      const isTransfer = isSafeToIndividual || isBankDeposit || category.includes('Internal Transfer');
      const targetDate = entryDate || selectedDate;
      const cleanReceipt = receiptNumber.trim() || undefined;
      const cleanParty = partyName.trim() || undefined;

      if (isSafeToIndividual) {
        const recipientName = cleanParty || salesperson.trim() || 'Individual';
        if (onTransferSafeToIndividual) {
          onTransferSafeToIndividual(
            numAmount,
            recipientName,
            description.trim() || (mainCategory === 'vendor_payments' ? 'Safe Vendor Payment' : mainCategory === 'market_payments' ? 'Safe Market Creditor Payment' : 'Safe Cash Handover to Individual'),
            cleanReceipt,
            description.trim() || undefined
          );
        } else {
          if (onDeductFromSafe) {
            onDeductFromSafe(numAmount);
          }
          onAddTransaction({
            date: targetDate,
            time: entryTime,
            type: 'cash_out',
            amount: numAmount,
            mainCategory,
            partyName: cleanParty,
            category: 'Safe Transfer (Safe ➔ Individual)',
            paymentMode: 'online', // Keep physical drawer register untouched
            description: description.trim() || `Cash handover to ${recipientName} from Safe`,
            salesperson: recipientName,
            receiptNumber: cleanReceipt,
            biltyNumber: cleanReceipt,
            verified,
            isInternalTransfer: true,
            transferSource: 'safe',
            transferDestination: 'individual',
            notes: `Cash transferred from Safe Vault to ${recipientName}`
          });
        }
      } else {
        const defaultDesc = mainCategory === 'vendor_payments'
          ? (cleanParty ? `Payment to ${cleanParty} (${category})` : `Vendor Payment (${category})`)
          : mainCategory === 'market_payments'
          ? (cleanParty ? `Market Creditor payment to ${cleanParty} (${category})` : `Market Creditor Payment (${category})`)
          : category.split('(')[0].trim();

        onAddTransaction({
          date: targetDate,
          time: entryTime,
          type: 'cash_out',
          amount: numAmount,
          mainCategory,
          partyName: cleanParty,
          category,
          paymentMode: outSource === 'bank' ? 'online' : paymentMode,
          description: description.trim() || defaultDesc,
          receiptNumber: cleanReceipt,
          biltyNumber: cleanReceipt,
          verified,
          isInternalTransfer: isTransfer,
          transferDestination: isBankDeposit ? 'bank' : undefined,
          transferSource: isTransfer ? 'drawer' : undefined
        });
      }

      // Reset cash out fields
      setAmount('');
      setDescription('');
      setReceiptNumber('');
      setPaymentMode('cash');
      setOutSource('drawer');
      setPartyName('');
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
          <div className="space-y-3.5 pt-1">
            {/* 3 MAIN CATEGORIES SWITCHER */}
            <div className="bg-stone-50 border border-stone-200/90 rounded-xl p-2.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>Select Main Category:</span>
                </span>
                <span className="text-[10px] text-stone-500 font-medium">
                  3 Primary Cash Out Classifications
                </span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* 1. Expenses */}
                <button
                  type="button"
                  id="btn-cat-expenses"
                  onClick={() => {
                    setMainCategory('expenses');
                    setCategory(EXPENSE_CATEGORIES[0]);
                  }}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                    mainCategory === 'expenses'
                      ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-400/30 text-amber-950 shadow-xs'
                      : 'bg-white border-stone-200 hover:border-stone-300 text-stone-700 hover:bg-stone-50/60'
                  }`}
                >
                  <div className={`p-1.5 rounded-md mt-0.5 shrink-0 ${
                    mainCategory === 'expenses' ? 'bg-amber-200 text-amber-900' : 'bg-stone-100 text-stone-600'
                  }`}>
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold flex items-center gap-1">
                      <span>1. Expenses</span>
                      {mainCategory === 'expenses' && <Check className="w-3.5 h-3.5 text-amber-700" />}
                    </div>
                    <div className="text-[10px] text-stone-500 leading-tight mt-0.5 truncate">
                      Daily shop & office operational costs
                    </div>
                  </div>
                </button>

                {/* 2. Vendor payments */}
                <button
                  type="button"
                  id="btn-cat-vendor"
                  onClick={() => {
                    setMainCategory('vendor_payments');
                    setCategory(VENDOR_PAYMENT_SUBCATEGORIES[0]);
                  }}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                    mainCategory === 'vendor_payments'
                      ? 'bg-blue-50/90 border-blue-400 ring-2 ring-blue-400/30 text-blue-950 shadow-xs'
                      : 'bg-white border-stone-200 hover:border-stone-300 text-stone-700 hover:bg-stone-50/60'
                  }`}
                >
                  <div className={`p-1.5 rounded-md mt-0.5 shrink-0 ${
                    mainCategory === 'vendor_payments' ? 'bg-blue-200 text-blue-900' : 'bg-stone-100 text-stone-600'
                  }`}>
                    <Truck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold flex items-center gap-1">
                      <span>2. Vendor payments</span>
                      {mainCategory === 'vendor_payments' && <Check className="w-3.5 h-3.5 text-blue-700" />}
                    </div>
                    <div className="text-[10px] text-stone-500 leading-tight mt-0.5 truncate">
                      Goods, suppliers & factory invoices
                    </div>
                  </div>
                </button>

                {/* 3. Market payments which is a creditor */}
                <button
                  type="button"
                  id="btn-cat-market-creditor"
                  onClick={() => {
                    setMainCategory('market_payments');
                    setCategory(MARKET_CREDITOR_SUBCATEGORIES[0]);
                  }}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                    mainCategory === 'market_payments'
                      ? 'bg-purple-50/90 border-purple-400 ring-2 ring-purple-400/30 text-purple-950 shadow-xs'
                      : 'bg-white border-stone-200 hover:border-stone-300 text-stone-700 hover:bg-stone-50/60'
                  }`}
                >
                  <div className={`p-1.5 rounded-md mt-0.5 shrink-0 ${
                    mainCategory === 'market_payments' ? 'bg-purple-200 text-purple-900' : 'bg-stone-100 text-stone-600'
                  }`}>
                    <Store className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold flex items-center gap-1">
                      <span>3. Market payments</span>
                      {mainCategory === 'market_payments' && <Check className="w-3.5 h-3.5 text-purple-700" />}
                    </div>
                    <div className="text-[10px] text-purple-700 font-semibold leading-tight mt-0.5 truncate">
                      Creditor / wholesale udhaar accounts
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* PARTY / SUBCATEGORY / VOUCHER / PAYMENT SOURCE ROW */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* Category / Subcategory Dropdown */}
              <div className="md:col-span-1">
                <label htmlFor="select-category" className="block text-xs font-bold text-stone-700 mb-1.5">
                  {mainCategory === 'expenses'
                    ? 'Expense Category'
                    : mainCategory === 'vendor_payments'
                    ? 'Vendor Payment Type'
                    : 'Creditor Settlement Type'}
                </label>
                <select
                  id="select-category"
                  value={category}
                  onChange={e => {
                    const nextCat = e.target.value;
                    setCategory(nextCat);
                    if (nextCat.includes('Safe Transfer to Individual')) {
                      setOutSource('safe');
                      setPaymentMode('online');
                    }
                  }}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-semibold text-stone-800 focus:bg-white focus:border-amber-600 outline-hidden"
                >
                  {mainCategory === 'expenses' && EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  {mainCategory === 'vendor_payments' && VENDOR_PAYMENT_SUBCATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  {mainCategory === 'market_payments' && MARKET_CREDITOR_SUBCATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Receipt / Voucher Reference # */}
              <div className="md:col-span-1">
                <label htmlFor="input-receipt-num" className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center justify-between">
                  <span>
                    {mainCategory === 'vendor_payments' ? 'Invoice / Voucher #' : mainCategory === 'market_payments' ? 'Credit Slip / Bill #' : 'Receipt / Voucher #'}
                  </span>
                  <span className="text-[10px] text-stone-400 font-normal">Optional</span>
                </label>
                <input
                  id="input-receipt-num"
                  type="text"
                  placeholder={
                    mainCategory === 'vendor_payments'
                      ? 'e.g. Inv # 8421, Bill # 550'
                      : mainCategory === 'market_payments'
                      ? 'e.g. Khata Slip # 104, Bilty # 77'
                      : 'e.g. Receipt # 9250644, 4359'
                  }
                  value={receiptNumber}
                  onChange={e => setReceiptNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-semibold text-stone-800 focus:bg-white focus:border-amber-600 outline-hidden"
                />
              </div>

              {/* Payment Source: Cash Drawer vs Safe Vault vs Bank Online */}
              <div className="md:col-span-1">
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  Paid From
                </label>
                <div className="grid grid-cols-3 gap-1 p-1 bg-stone-100 rounded-lg">
                  <button
                    type="button"
                    id="btn-out-mode-cash"
                    onClick={() => {
                      setOutSource('drawer');
                      setPaymentMode('cash');
                      if (category.includes('Safe Transfer to Individual')) {
                        setCategory(EXPENSE_CATEGORIES[0]);
                      }
                    }}
                    className={`py-1 px-1.5 rounded-md text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      outSource === 'drawer'
                        ? 'bg-white text-amber-900 shadow-xs border border-amber-200'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <span>Cash Drawer</span>
                  </button>
                  <button
                    type="button"
                    id="btn-out-mode-safe"
                    onClick={() => {
                      setOutSource('safe');
                      setPaymentMode('online'); // Keep drawer float untouched
                      if (mainCategory === 'expenses') {
                        setCategory('Safe Transfer to Individual');
                      }
                    }}
                    className={`py-1 px-1.5 rounded-md text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      outSource === 'safe' || category.includes('Safe Transfer to Individual')
                        ? 'bg-purple-600 text-white shadow-xs font-bold'
                        : 'text-purple-700 hover:text-purple-900 hover:bg-purple-50'
                    }`}
                    title="Disburse cash directly from Safe Vault"
                  >
                    <Lock className="w-3 h-3 shrink-0" />
                    <span>Safe Vault</span>
                  </button>
                  <button
                    type="button"
                    id="btn-out-mode-online"
                    onClick={() => {
                      setOutSource('bank');
                      setPaymentMode('online');
                      if (category.includes('Safe Transfer to Individual')) {
                        setCategory(EXPENSE_CATEGORIES[0]);
                      }
                    }}
                    className={`py-1 px-1.5 rounded-md text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      outSource === 'bank'
                        ? 'bg-amber-700 text-white shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <span>Bank Online</span>
                  </button>
                </div>
              </div>
            </div>

            {/* SPECIALIZED PARTY NAME FOR VENDOR PAYMENTS */}
            {mainCategory === 'vendor_payments' && (
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <label htmlFor="input-vendor-name" className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-blue-700" />
                    <span>Vendor / Supplier Name:</span>
                  </label>
                  <span className="text-[10px] text-blue-700 font-medium">Party / Company receiving payment</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-blue-700 font-medium">Quick Pick:</span>
                  {COMMON_VENDORS.map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setPartyName(v)}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer border ${
                        partyName === v
                          ? 'bg-blue-700 text-white border-blue-800 font-bold'
                          : 'bg-white text-stone-700 border-blue-200 hover:bg-blue-100/60'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <input
                  id="input-vendor-name"
                  type="text"
                  placeholder="e.g. Saqib Electric, Diamond Cables, Factory Supplier..."
                  value={partyName}
                  onChange={e => setPartyName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-semibold text-stone-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-hidden"
                />
              </div>
            )}

            {/* SPECIALIZED PARTY NAME FOR MARKET PAYMENTS (CREDITOR) */}
            {mainCategory === 'market_payments' && (
              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <label htmlFor="input-creditor-name" className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-purple-700" />
                    <span>Market Creditor / Party Name:</span>
                    <span className="text-[10px] bg-purple-200/80 text-purple-900 px-1.5 py-0.2 rounded font-normal">Creditor</span>
                  </label>
                  <span className="text-[10px] text-purple-700 font-medium">Wholesale Market Creditor / Udhaar Account</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-purple-700 font-medium">Quick Pick:</span>
                  {COMMON_MARKET_CREDITORS.map(cred => (
                    <button
                      key={cred}
                      type="button"
                      onClick={() => setPartyName(cred)}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer border ${
                        partyName === cred
                          ? 'bg-purple-700 text-white border-purple-800 font-bold'
                          : 'bg-white text-stone-700 border-purple-200 hover:bg-purple-100/60'
                      }`}
                    >
                      {cred}
                    </button>
                  ))}
                </div>
                <input
                  id="input-creditor-name"
                  type="text"
                  placeholder="e.g. Akbari Mandi Creditor, Shah Alam Creditor, Wholesale Distributor..."
                  value={partyName}
                  onChange={e => setPartyName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-purple-300 rounded-lg text-xs font-semibold text-stone-900 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 outline-hidden"
                />
              </div>
            )}

            {/* DEDICATED SAFE DISBURSEMENT PANEL */}
            {(outSource === 'safe' || (mainCategory === 'expenses' && category.includes('Safe Transfer to Individual'))) && (
              <div className="p-3.5 bg-purple-50/80 border border-purple-200 rounded-xl space-y-2.5 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-purple-950">
                    <div className="p-1 rounded bg-purple-200 text-purple-800">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <span>
                      {mainCategory === 'vendor_payments'
                        ? 'Safe Vault ➔ Direct Vendor Payment'
                        : mainCategory === 'market_payments'
                        ? 'Safe Vault ➔ Direct Market Creditor Payment'
                        : 'Cash Disbursed from Safe to Individual'}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-bold bg-purple-100 text-purple-900 px-2 py-0.5 rounded border border-purple-300 self-start sm:self-auto">
                    Safe Vault Total: {formatPKR(safeRunningBalance)}
                  </span>
                </div>
                <p className="text-[11px] text-purple-800 leading-snug">
                  Cash is paid directly out of the Safe Vault. This outflow will deduct from Safe Vault funds and will <strong>not</strong> decrease counter drawer register cash.
                </p>

                {/* Recipient Individual Field (for Expenses safe transfer) */}
                {mainCategory === 'expenses' && (
                  <div>
                    <label className="text-[11px] font-bold text-purple-950 block mb-1">
                      Recipient Individual / Entity Name:
                    </label>
                    <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                      <span className="text-[10px] text-purple-700 font-medium">Quick Pick:</span>
                      {['Owner Drawing', ...staffList.slice(0, 4)].map(rec => (
                        <button
                          key={rec}
                          type="button"
                          onClick={() => setSalesperson(rec)}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer border ${
                            salesperson === rec
                              ? 'bg-purple-700 text-white border-purple-800 font-bold'
                              : 'bg-white text-stone-700 border-purple-200 hover:bg-purple-100/60'
                          }`}
                        >
                          {rec}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. Partner / Owner Drawing, Abdullah, Contractor, Vendor..."
                      value={salesperson}
                      onChange={e => setSalesperson(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-purple-300 rounded-lg text-xs font-semibold text-stone-900 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 outline-hidden"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* Description / Particulars */}
              <div className="md:col-span-2">
                <label htmlFor="input-out-description" className="block text-xs font-bold text-stone-700 mb-1">
                  {(outSource === 'safe' || category.includes('Safe Transfer to Individual'))
                    ? 'Purpose / Particulars (e.g. Monthly Partner Drawing, Salary Advance)'
                    : 'Particulars / Payee Note'}
                </label>
                <input
                  id="input-out-description"
                  type="text"
                  placeholder={(outSource === 'safe' || category.includes('Safe Transfer to Individual'))
                    ? "e.g. Partner Drawing, Staff Advance Salary, Loan Handover"
                    : "e.g. Freight delivery cargo (2 pkgs), Bykea delivery, Nakash tea, Saqib Electric"}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs text-stone-800 focus:bg-white focus:border-amber-600 outline-hidden"
                />
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
                    className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-stone-800 flex items-center gap-1">
                    <span>Mark as Verified (✓)</span>
                    <span className="text-stone-400 font-normal text-[11px]">(Ledger Tick)</span>
                  </span>
                </label>
              </div>
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
