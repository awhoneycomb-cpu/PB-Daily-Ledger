import React, { useState, useMemo } from 'react';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Wallet, 
  CreditCard, 
  Edit3, 
  Check, 
  TrendingUp, 
  PlusCircle, 
  DollarSign,
  Truck,
  Store,
  Briefcase 
} from 'lucide-react';
import { Transaction, getMainCashOutCategory } from '../types';
import { formatPKR } from '../utils/exportSpreadsheet';
import { CashFlowTrendChart } from './CashFlowTrendChart';

interface StatsOverviewProps {
  transactions: Transaction[];
  openingCash: number;
  onChangeOpeningCash: (val: number) => void;
  selectedDate: string;
  totalSafeCash?: number;
  expectedDrawerCash?: number;
  safeTransferAmount?: number;
  onChangeDate?: (date: string) => void;
  onLoadSampleHistory?: () => void;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ 
  transactions, 
  openingCash,
  onChangeOpeningCash,
  selectedDate,
  totalSafeCash,
  expectedDrawerCash,
  safeTransferAmount = 0,
  onChangeDate,
  onLoadSampleHistory
}) => {
  const [isEditingOpening, setIsEditingOpening] = useState<boolean>(false);
  const [tempOpening, setTempOpening] = useState<string>(String(openingCash || 0));
  const [statScope, setStatScope] = useState<'today' | 'all'>('today');

  // Filter transactions according to selected scope (Today's active date vs All recorded history)
  const scopedTransactions = useMemo(() => {
    if (statScope === 'all') return transactions;
    return transactions.filter(t => (t.date || '').trim() === selectedDate.trim());
  }, [transactions, statScope, selectedDate]);

  // High-performance single-pass calculations isolating sales/expenses from safe transfers
  const {
    cashInTransactions,
    cashOutTransactions,
    salesTransactions,
    expenseTransactions,
    totalGrossSales,
    totalOnlineSales,
    totalPhysicalSales,
    totalOperatingExpenses,
    totalOnlineExpenses,
    totalPhysicalExpenses,
    totalExpensesCategory,
    totalVendorPayments,
    totalMarketPayments,
    totalSafeInjections,
    totalSafeHandovers,
    totalBankDeposits,
    calculatedExpectedDrawer,
    netOperatingFlow,
    drawerCashIn,
    drawerCashOut
  } = useMemo(() => {
    const ins: Transaction[] = [];
    const outs: Transaction[] = [];
    const salesTx: Transaction[] = [];
    const expTx: Transaction[] = [];

    let grossSales = 0;
    let onlineSales = 0;
    let physicalSales = 0;

    let opExpenses = 0;
    let onlineExp = 0;
    let physicalExp = 0;

    let totalExpensesCategory = 0;
    let totalVendorPayments = 0;
    let totalMarketPayments = 0;

    let safeInjections = 0;
    let safeHandovers = 0;
    let bankDeposits = 0;

    let drawerCashIn = 0;
    let drawerCashOut = 0;

    for (let i = 0; i < scopedTransactions.length; i++) {
      const t = scopedTransactions[i];
      const amt = typeof t.amount === 'number' ? t.amount : (parseFloat(String(t.amount)) || 0);
      const isTransfer = t.isInternalTransfer || (t.category?.toLowerCase().includes('internal transfer'));

      if (t.type === 'cash_in') {
        ins.push(t);
        if (isTransfer) {
          safeInjections += amt;
          if (t.paymentMode !== 'online') {
            drawerCashIn += amt;
          }
        } else {
          salesTx.push(t);
          grossSales += amt;
          if (t.paymentMode === 'online') {
            onlineSales += amt;
          } else {
            physicalSales += amt;
            drawerCashIn += amt;
          }
        }
      } else if (t.type === 'cash_out') {
        outs.push(t);
        if (isTransfer) {
          if (t.transferDestination === 'bank' || t.description.toLowerCase().includes('bank')) {
            bankDeposits += amt;
          } else {
            safeHandovers += amt;
            if (t.paymentMode !== 'online' && t.transferSource !== 'safe') {
              drawerCashOut += amt;
            }
          }
        } else {
          expTx.push(t);
          opExpenses += amt;
          const mainCat = getMainCashOutCategory(t);
          if (mainCat === 'vendor_payments') {
            totalVendorPayments += amt;
          } else if (mainCat === 'market_payments') {
            totalMarketPayments += amt;
          } else {
            totalExpensesCategory += amt;
          }

          if (t.paymentMode === 'online') {
            onlineExp += amt;
          } else {
            physicalExp += amt;
            drawerCashOut += amt;
          }
        }
      }
    }

    // Accurate Cash Drawer formula: Opening Float + Drawer Cash In - Drawer Cash Out
    const drawerCalc = openingCash + drawerCashIn - drawerCashOut;
    const net = grossSales - opExpenses;

    return {
      cashInTransactions: ins,
      cashOutTransactions: outs,
      salesTransactions: salesTx,
      expenseTransactions: expTx,
      totalGrossSales: grossSales,
      totalOnlineSales: onlineSales,
      totalPhysicalSales: physicalSales,
      totalOperatingExpenses: opExpenses,
      totalOnlineExpenses: onlineExp,
      totalPhysicalExpenses: physicalExp,
      totalExpensesCategory,
      totalVendorPayments,
      totalMarketPayments,
      totalSafeInjections: safeInjections,
      totalSafeHandovers: safeHandovers,
      totalBankDeposits: bankDeposits,
      calculatedExpectedDrawer: drawerCalc,
      netOperatingFlow: net,
      drawerCashIn,
      drawerCashOut
    };
  }, [scopedTransactions, openingCash]);

  const handleSaveOpening = () => {
    const parsed = Math.max(0, parseFloat(tempOpening) || 0);
    onChangeOpeningCash(parsed);
    setIsEditingOpening(false);
  };

  // If in 'today' scope, use expectedDrawerCash if passed from App, otherwise calculatedExpectedDrawer
  const finalDrawerValue = statScope === 'today' && expectedDrawerCash !== undefined 
    ? expectedDrawerCash 
    : calculatedExpectedDrawer;

  return (
    <div id="stats-overview-area" className="mb-6 space-y-4">
      {/* Scope Switcher Bar: Today's Active Register vs All Recorded History */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-stone-700">Analytics Scope:</span>
          <div className="inline-flex p-0.5 bg-stone-200/80 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => setStatScope('today')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                statScope === 'today'
                  ? 'bg-white text-stone-900 shadow-2xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              📅 Today ({selectedDate})
            </button>
            <button
              type="button"
              onClick={() => setStatScope('all')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                statScope === 'all'
                  ? 'bg-white text-stone-900 shadow-2xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              🌐 All-Time History ({transactions.length})
            </button>
          </div>
        </div>
        <span className="text-[11px] text-stone-500">
          {statScope === 'today' 
            ? `Showing real-time figures for active day (${selectedDate})` 
            : `Showing cumulative totals across all ${transactions.length} entries`}
        </span>
      </div>

      {/* 4 Core Real-Time KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Total Sales / Cash In */}
        <div id="stat-card-cash-in" className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-emerald-300 transition-colors">
          <div className="flex items-start justify-between text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
            <div>
              <span className="block">Total Sales (Revenue)</span>
              <span className="block text-xs font-bold text-emerald-700 font-mono normal-case mt-0.5">
                {salesTransactions.length} {salesTransactions.length === 1 ? 'sale' : 'sales'}
                {totalSafeInjections > 0 && ` • ${cashInTransactions.length - salesTransactions.length} transfer`}
              </span>
            </div>
            <span className="p-1.5 rounded-xl bg-emerald-50 text-emerald-700">
              <ArrowDownLeft className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-stone-900 tracking-tight">
            {formatPKR(totalGrossSales)}
          </div>
          <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600">
            <span>Physical: <strong className="text-emerald-700">{formatPKR(totalPhysicalSales)}</strong></span>
            <span className="inline-flex items-center gap-1 text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded font-medium">
              <CreditCard className="w-3 h-3 text-stone-500" /> Online: {formatPKR(totalOnlineSales)}
            </span>
          </div>
          {totalSafeInjections > 0 && (
            <div className="mt-1.5 pt-1 border-t border-dashed border-stone-200 text-[11px] text-indigo-700 flex items-center justify-between">
              <span>Safe Float Injection:</span>
              <strong className="font-mono">+{formatPKR(totalSafeInjections)}</strong>
            </div>
          )}
        </div>

        {/* 2. Total Expenses / Cash Out */}
        <div id="stat-card-cash-out" className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-amber-300 transition-colors">
          <div className="flex items-start justify-between text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
            <div>
              <span className="block">Operating Expenses</span>
              <span className="block text-xs font-bold text-amber-800 font-mono normal-case mt-0.5">
                {expenseTransactions.length} {expenseTransactions.length === 1 ? 'voucher' : 'vouchers'}
                {(totalSafeHandovers > 0 || totalBankDeposits > 0) && ` • ${cashOutTransactions.length - expenseTransactions.length} transfer`}
              </span>
            </div>
            <span className="p-1.5 rounded-xl bg-amber-50 text-amber-700">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-stone-900 tracking-tight">
            {formatPKR(totalOperatingExpenses)}
          </div>
          <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600">
            <span>Drawer Paid: <strong className="text-amber-800">{formatPKR(totalPhysicalExpenses)}</strong></span>
            <span className="text-[11px] font-medium text-stone-600">
              {totalOnlineExpenses > 0 ? (
                <span className="text-stone-500">Bank: {formatPKR(totalOnlineExpenses)}</span>
              ) : (
                <span className="text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded font-medium">{expenseTransactions.length} vouchers</span>
              )}
            </span>
          </div>
          {/* 3 Main Categories Breakdown */}
          {totalOperatingExpenses > 0 && (
            <div className="mt-2 pt-2 border-t border-stone-100 space-y-1 text-[11px]">
              <div className="flex items-center justify-between text-stone-600">
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3 h-3 text-amber-600" />
                  <span>1. Expenses:</span>
                </span>
                <span className="font-mono font-semibold text-stone-800">{formatPKR(totalExpensesCategory)}</span>
              </div>
              <div className="flex items-center justify-between text-stone-600">
                <span className="flex items-center gap-1">
                  <Truck className="w-3 h-3 text-blue-600" />
                  <span>2. Vendor Payments:</span>
                </span>
                <span className="font-mono font-semibold text-blue-900">{formatPKR(totalVendorPayments)}</span>
              </div>
              <div className="flex items-center justify-between text-stone-600">
                <span className="flex items-center gap-1">
                  <Store className="w-3 h-3 text-purple-600" />
                  <span>3. Market Creditor:</span>
                </span>
                <span className="font-mono font-semibold text-purple-900">{formatPKR(totalMarketPayments)}</span>
              </div>
            </div>
          )}
          {(totalSafeHandovers > 0 || totalBankDeposits > 0) && (
            <div className="mt-1.5 pt-1 border-t border-dashed border-stone-200 text-[11px] text-stone-500 flex items-center justify-between">
              <span>Transfers:</span>
              <span className="font-mono text-stone-700">
                {totalSafeHandovers > 0 && `Safe: ${formatPKR(totalSafeHandovers)}`}
                {totalSafeHandovers > 0 && totalBankDeposits > 0 && ' | '}
                {totalBankDeposits > 0 && `Bank: ${formatPKR(totalBankDeposits)}`}
              </span>
            </div>
          )}
        </div>

        {/* 3. Net Daily Operating Flow */}
        <div id="stat-card-net-flow" className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-blue-300 transition-colors">
          <div className="flex items-start justify-between text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
            <div>
              <span className="block">Net Operating Flow</span>
              <span className="block text-[11px] font-medium text-stone-500 normal-case mt-0.5">
                Gross Sales minus Expenses
              </span>
            </div>
            <span className={`p-1.5 rounded-xl ${netOperatingFlow >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className={`text-2xl font-bold font-mono tracking-tight ${netOperatingFlow >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
            {netOperatingFlow >= 0 ? '+' : ''}{formatPKR(netOperatingFlow)}
          </div>
          <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span>Operating Margin</span>
            <span className={`font-semibold ${netOperatingFlow >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              {netOperatingFlow >= 0 ? 'Operating Surplus' : 'Operating Deficit'}
            </span>
          </div>
        </div>

        {/* 4. Opening Balance Slot (Direct input & Expected Cash in Register) */}
        <div id="stat-card-opening-balance" className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-emerald-300 transition-colors flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
              <div className="flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-emerald-700" />
                <span>Opening Balance Slot</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTempOpening(String(openingCash));
                  setIsEditingOpening(true);
                  setTimeout(() => {
                    document.getElementById('input-opening-stat')?.focus();
                  }, 50);
                }}
                className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
                title="Edit opening balance directly"
              >
                <Edit3 className="w-3 h-3" />
                <span>Edit</span>
              </button>
            </div>

            {/* Direct Input or Display */}
            {!isEditingOpening ? (
              <div 
                onClick={() => {
                  setTempOpening(String(openingCash));
                  setIsEditingOpening(true);
                }}
                className="cursor-pointer group flex items-baseline justify-between"
                title="Click to edit opening cash balance"
              >
                <span className="text-2xl font-bold font-mono text-stone-900 tracking-tight group-hover:text-emerald-700 transition-colors">
                  {formatPKR(openingCash)}
                </span>
                <span className="text-[10px] text-stone-400 group-hover:text-emerald-600">
                  Morning Float
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 my-1">
                <span className="text-xs font-bold text-stone-400">Rs.</span>
                <input
                  id="input-opening-stat"
                  type="number"
                  min="0"
                  step="any"
                  value={tempOpening}
                  onChange={e => setTempOpening(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveOpening();
                    if (e.key === 'Escape') setIsEditingOpening(false);
                  }}
                  className="w-full px-2 py-1 bg-stone-50 border border-emerald-500 rounded-lg text-sm font-bold font-mono text-stone-900 focus:bg-white outline-hidden"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleSaveOpening}
                  className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600">
            <span className="text-stone-500">Expected Register:</span>
            <strong className="text-emerald-800 font-mono font-bold text-sm bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              {formatPKR(finalDrawerValue)}
            </strong>
          </div>

          {typeof totalSafeCash === 'number' && totalSafeCash > 0 && (
            <div 
              onClick={() => {
                document.getElementById('cash-safe-manager')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className="mt-1.5 pt-1.5 border-t border-dashed border-stone-200 flex items-center justify-between text-xs cursor-pointer group"
              title="Click to view Cash Safe & Vault Transfer"
            >
              <span className="text-indigo-700 font-medium group-hover:underline flex items-center gap-1">
                <span>Safe Vault Total:</span>
              </span>
              <strong className="text-indigo-900 font-mono font-bold">
                {formatPKR(totalSafeCash)}
              </strong>
            </div>
          )}
        </div>
      </div>

      {/* Cash Flow Trends Chart (Recharts) */}
      <CashFlowTrendChart 
        transactions={transactions} 
        selectedDate={selectedDate} 
        onSelectDate={onChangeDate}
        onLoadSampleHistory={onLoadSampleHistory}
      />
    </div>
  );
};
