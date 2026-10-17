import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Search, 
  Filter, 
  Trash2, 
  Check, 
  BookOpen, 
  Table, 
  Plus, 
  CreditCard, 
  CheckCircle2, 
  Printer, 
  Clock, 
  Undo2, 
  X,
  Calendar,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Lock,
  ArrowDownToLine,
  ArrowUpRight,
  Landmark,
  User,
  Truck,
  Store,
  Briefcase,
  Pencil
} from 'lucide-react';
import { Transaction, isInternalTransferTransaction, isDrawerToSafeTransfer, getMainCashOutCategory } from '../types';
import { formatPKR, exportToExcel, exportToCSV } from '../utils/exportSpreadsheet';
import { EditTransactionModal } from './EditTransactionModal';

interface SpreadsheetLedgerProps {
  transactions: Transaction[];
  totalAllCount?: number;
  isFiltered?: boolean;
  onResetFilters?: () => void;
  onDeleteTransaction: (id: string) => void;
  onToggleVerified: (id: string) => void;
  onUpdateTransaction?: (id: string, updates: Partial<Transaction>) => void;
  selectedDate: string;
  dateRangeText?: string;
  onChangeDate: (date: string) => void;
  staffList: string[];
  drawerCashInHand: number;
  openingCash?: number;
  denominations?: Record<string | number, number>;
}

export const SpreadsheetLedger: React.FC<SpreadsheetLedgerProps> = ({
  transactions,
  totalAllCount,
  isFiltered = false,
  onResetFilters,
  onDeleteTransaction,
  onToggleVerified,
  onUpdateTransaction,
  selectedDate,
  dateRangeText,
  onChangeDate,
  staffList,
  drawerCashInHand,
  openingCash = 0,
  denominations
}) => {
  const [viewMode, setViewMode] = useState<'book' | 'table'>('book');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Pagination states
  const [pageSize, setPageSize] = useState<number | 'all'>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset to page 1 whenever transaction list or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [transactions.length, isFiltered]);

  // High-performance single-pass calculations using useMemo
  const { 
    cashOutItems, 
    cashInItems, 
    internalInItems,
    operatingOutItems,
    internalOutItems,
    totalIn, 
    totalSalesIn,
    totalSafeIn,
    totalOnline, 
    totalPhysicalIn, 
    totalOut, 
    totalOpOut,
    totalTransferOut,
    totalPhysicalOut,
    totalOnlineOut,
    totalSafeOut,
    netBalance, 
    staffSummary 
  } = useMemo(() => {
    const outs: Transaction[] = [];
    const ins: Transaction[] = [];
    const safeIns: Transaction[] = [];
    const opOuts: Transaction[] = [];
    const transferOuts: Transaction[] = [];

    let sumIn = 0;
    let sumSalesIn = 0;
    let sumSafeIn = 0;
    let sumOnline = 0;
    let sumOut = 0;
    let sumOpOut = 0;
    let sumTransferOut = 0;
    let sumPhysicalOut = 0;
    let sumOnlineOut = 0;
    let sumSafeOut = 0;

    const staffMap = new Map<string, { name: string; items: Transaction[]; total: number; online: number; cash: number }>();
    
    // Seed staff list
    staffList.forEach(name => {
      staffMap.set(name, { name, items: [], total: 0, online: 0, cash: 0 });
    });

    for (let i = 0; i < transactions.length; i++) {
      const t = transactions[i];
      const amt = typeof t.amount === 'number' ? t.amount : (parseFloat(String(t.amount)) || 0);
      const isTransfer = t.isInternalTransfer || isInternalTransferTransaction(t);

      if (t.type === 'cash_in') {
        ins.push(t);
        sumIn += amt;
        const isOnline = t.paymentMode === 'online';
        if (isOnline) sumOnline += amt;

        if (isTransfer) {
          safeIns.push(t);
          sumSafeIn += amt;
        } else {
          sumSalesIn += amt;
          const staffName = t.salesperson || 'Counter';
          let staffEntry = staffMap.get(staffName);
          if (!staffEntry) {
            staffEntry = { name: staffName, items: [], total: 0, online: 0, cash: 0 };
            staffMap.set(staffName, staffEntry);
          }
          staffEntry.items.push(t);
          staffEntry.total += amt;
          if (isOnline) {
            staffEntry.online += amt;
          } else {
            staffEntry.cash += amt;
          }
        }
      } else if (t.type === 'cash_out') {
        const isDrawerToSafe = isDrawerToSafeTransfer(t);
        // CRITICAL: Day-end safe vault handovers are internal movements of cash into vault.
        // They must NOT be treated as cash out / expenses, and must NOT reduce net balance to negative.
        if (isDrawerToSafe) {
          transferOuts.push(t);
          sumTransferOut += amt;
          continue;
        }

        outs.push(t);
        sumOut += amt;
        const isOnline = t.paymentMode === 'online';
        const isFromSafe = t.transferSource === 'safe';

        if (isOnline) {
          sumOnlineOut += amt;
        } else if (isFromSafe) {
          sumSafeOut += amt;
        } else {
          sumPhysicalOut += amt;
        }

        if (isTransfer) {
          transferOuts.push(t);
          sumTransferOut += amt;
        } else {
          opOuts.push(t);
          sumOpOut += amt;
        }
      }
    }

    const activeStaffSummary = Array.from(staffMap.values()).filter(s => s.items.length > 0);

    return {
      cashOutItems: outs,
      cashInItems: ins,
      internalInItems: safeIns,
      operatingOutItems: opOuts,
      internalOutItems: transferOuts,
      totalIn: sumIn,
      totalSalesIn: sumSalesIn,
      totalSafeIn: sumSafeIn,
      totalOnline: sumOnline,
      totalPhysicalIn: sumIn - sumOnline,
      totalOut: sumOut,
      totalOpOut: sumOpOut,
      totalTransferOut: sumTransferOut,
      totalPhysicalOut: sumPhysicalOut,
      totalOnlineOut: sumOnlineOut,
      totalSafeOut: sumSafeOut,
      netBalance: sumIn - sumOut,
      staffSummary: activeStaffSummary
    };
  }, [transactions, staffList]);

  // Paginated table items
  const paginatedTableTransactions = useMemo(() => {
    if (pageSize === 'all') return transactions;
    const startIdx = (currentPage - 1) * pageSize;
    return transactions.slice(startIdx, startIdx + pageSize);
  }, [transactions, currentPage, pageSize]);

  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(transactions.length / pageSize));

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="spreadsheet-ledger" className="bg-white border border-stone-200 rounded-2xl shadow-xs overflow-hidden">
      {/* Top Toolbar */}
      <div className="p-4 md:p-5 border-b border-stone-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-stone-50/50">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <span>Real-Time Sales & Cash Spreadsheet</span>
            </h2>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
              Cash Ledger
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Auto-calculating ledger with instant formula subtotals and 1-click Excel export.
          </p>
        </div>

        {/* View Switcher & Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex p-0.5 bg-stone-200/70 rounded-lg">
            <button
              id="view-mode-book"
              type="button"
              onClick={() => setViewMode('book')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'book'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Two-Page Book View</span>
            </button>
            <button
              id="view-mode-table"
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Grid Log (Table)</span>
            </button>
          </div>

          {/* Export / Download Excel (.xlsx) */}
          <button
            id="btn-export-excel"
            type="button"
            onClick={() => exportToExcel(transactions, selectedDate, drawerCashInHand, openingCash, denominations)}
            className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            title="Download formatted Microsoft Excel spreadsheet file (.xlsx)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Excel (.xlsx)</span>
          </button>

          {/* Export / Download CSV */}
          <button
            id="btn-export-csv"
            type="button"
            onClick={() => exportToCSV(transactions, selectedDate)}
            className="px-3 py-1.5 bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Download CSV file for importing to Google Sheets or Excel"
          >
            <Download className="w-3.5 h-3.5 text-stone-500" />
            <span>Download CSV</span>
          </button>

          {/* Print Button */}
          <button
            id="btn-print-ledger"
            type="button"
            onClick={handlePrint}
            className="p-1.5 bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 rounded-lg text-xs transition-colors"
            title="Print daily ledger sheet"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sub-toolbar: Active Filter Status & Date Range Display */}
      <div className="px-4 py-2.5 border-b border-stone-200 bg-stone-50/50 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2">
          {isFiltered ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-300 px-2.5 py-0.5 rounded-lg">
                <Filter className="w-3 h-3 text-emerald-700" />
                <span>Filtered View: {transactions.length} of {totalAllCount ?? transactions.length} records</span>
              </span>
              {onResetFilters && (
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="text-stone-500 hover:text-rose-600 font-semibold text-[11px] underline cursor-pointer flex items-center gap-0.5 ml-1"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Clear Filters</span>
                </button>
              )}
            </div>
          ) : (
            <span className="text-stone-600 font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              <span>Active Ledger Records: <strong className="text-stone-900 font-bold">{transactions.length}</strong></span>
            </span>
          )}
        </div>

        {/* Date / Period Display */}
        <div className="flex items-center gap-2 text-stone-600">
          <div className="flex items-center gap-1.5 bg-white border border-stone-200 px-2.5 py-1 rounded-lg">
            <Calendar className="w-3.5 h-3.5 text-emerald-700" />
            <span className="text-[11px] text-stone-500 font-medium">Period:</span>
            <span className="font-bold text-stone-900 text-xs">
              {dateRangeText || selectedDate}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-stone-500">
            <span>Change Day:</span>
            <input
              id="ledger-date-picker"
              type="date"
              value={selectedDate}
              onChange={e => onChangeDate(e.target.value)}
              className="px-2 py-0.5 bg-white border border-stone-300 rounded text-xs font-semibold text-stone-800 outline-hidden cursor-pointer"
              title="Select active working date"
            />
          </div>
        </div>
      </div>

      {/* VIEW 1: DUAL-PAGE BOOK LEDGER VIEW (ROZNAMCHA) */}
      {viewMode === 'book' ? (
        <div className="overflow-x-auto">
          <div className="min-w-[960px] grid grid-cols-12 divide-x divide-stone-300 bg-stone-50/20">
            
            {/* ================= LEFT PAGE: CASH OUT ================= */}
            <div className="col-span-5 p-3 sm:p-4 bg-amber-50/20">
              {/* Header */}
              <div className="pb-2.5 mb-2.5 border-b-2 border-amber-500 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                    <span>Cash - Out</span>
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-mono font-bold text-amber-800">
                      {cashOutItems.length} {cashOutItems.length === 1 ? 'entry' : 'entries'}
                    </span>
                    <span className="text-stone-400 text-[10px]">•</span>
                    <span className="text-[11px] text-stone-500">Expenses & Payouts</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-stone-500 block text-[10px]">Total Out:</span>
                  <span className="font-bold text-stone-900 text-sm text-amber-700">{formatPKR(totalOut)}</span>
                </div>
              </div>

              {/* Table of Cash Out */}
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[11px] font-bold text-stone-500 border-b border-stone-200 pb-1">
                    <th className="py-1 px-1 text-center w-8">✓</th>
                    <th className="py-1 px-2 text-right w-24">Amount (PKR)</th>
                    <th className="py-1 px-2">Particulars</th>
                    <th className="py-1 px-1 text-center w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-sans">
                  {cashOutItems.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-amber-100/30 transition-colors group">
                      {/* Verified Checkmark (v) */}
                      <td className="py-2 px-1 text-center">
                        <button
                          type="button"
                          onClick={() => onToggleVerified(item.id)}
                          className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                            item.verified 
                              ? 'text-amber-700 bg-amber-100 border border-amber-300 font-bold' 
                              : 'text-stone-300 hover:text-stone-500 border border-stone-200'
                          }`}
                          title="Click to toggle verified tick (v)"
                        >
                          {item.verified ? '✓' : ''}
                        </button>
                      </td>

                      {/* Amount */}
                      <td className="py-2 px-2 text-right font-mono font-bold text-stone-900 whitespace-nowrap">
                        {item.amount.toLocaleString()}/-
                      </td>

                      {/* Particulars & Receipt */}
                      <td className="py-2 px-2 text-stone-800">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-stone-900">{item.description}</span>
                          {(item.isInternalTransfer || isInternalTransferTransaction(item)) && (
                            item.transferDestination === 'individual' ||
                            (item.category && item.category.toLowerCase().includes('individual')) ||
                            (item.description && (
                              item.description.toLowerCase().includes('handover to') ||
                              item.description.toLowerCase().includes('safe cash to') ||
                              item.description.toLowerCase().includes('safe to individual')
                            )) ||
                            (item.transferSource === 'safe' && item.type === 'cash_out' && item.transferDestination !== 'bank' && item.transferDestination !== 'safe') ? (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-purple-900 bg-purple-100 px-1.5 py-0.2 rounded border border-purple-200">
                                <User className="w-2.5 h-2.5 text-purple-700" /> Safe ➔ {item.salesperson || 'Individual'}
                              </span>
                            ) : item.transferDestination === 'bank' || item.description.toLowerCase().includes('bank') ? (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-900 bg-blue-100 px-1.5 py-0.2 rounded border border-blue-200">
                                <Landmark className="w-2.5 h-2.5 text-blue-700" /> Safe ➔ Bank
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-900 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-200">
                                <ArrowDownToLine className="w-2.5 h-2.5 text-emerald-700" /> Drawer ➔ Safe
                              </span>
                            )
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-stone-500 mt-0.5">
                          {/* Main Category Badges */}
                          {getMainCashOutCategory(item) === 'vendor_payments' ? (
                            <span className="inline-flex items-center gap-0.5 bg-blue-100 text-blue-900 border border-blue-200 font-bold px-1.5 py-0.2 rounded">
                              <Truck className="w-2.5 h-2.5 text-blue-700" /> Vendor: {item.partyName || 'Supplier'}
                            </span>
                          ) : getMainCashOutCategory(item) === 'market_payments' ? (
                            <span className="inline-flex items-center gap-0.5 bg-purple-100 text-purple-900 border border-purple-200 font-bold px-1.5 py-0.2 rounded">
                              <Store className="w-2.5 h-2.5 text-purple-700" /> Market Creditor: {item.partyName || 'Creditor'}
                            </span>
                          ) : !item.isInternalTransfer && !isInternalTransferTransaction(item) ? (
                            <span className="bg-amber-100/80 text-amber-900 font-semibold px-1.5 py-0.2 rounded border border-amber-200/60">
                              Expense
                            </span>
                          ) : null}

                          {(item.receiptNumber || item.biltyNumber || (item.isInternalTransfer && item.billNumber)) && (
                            <span className="bg-stone-100 text-stone-800 font-semibold px-1 rounded font-mono border border-stone-200">
                              Ref #{item.receiptNumber || item.biltyNumber || item.billNumber}
                            </span>
                          )}
                          <span>{item.category?.split('(')[0].trim()}</span>
                          <span className="text-stone-400">• {item.time}</span>
                        </div>
                      </td>

                      {/* Edit & Delete Actions */}
                      <td className="py-2 px-1 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => setEditingTransaction(item)}
                            className="p-1 rounded text-stone-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                            title="Edit entry"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteTransaction(item.id)}
                            className="p-1 rounded text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {cashOutItems.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-stone-400 italic">
                        {isFiltered ? 'No cash out entries match current filter.' : 'No cash-out entries yet for this period. Use the form above to record expenses.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Subtotal row */}
              <div className="mt-3 pt-2.5 border-t-2 border-amber-400/80 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-stone-600 font-semibold">
                  <span>Operating Expenses & Store Payments:</span>
                  <span className="font-mono text-stone-900 font-bold">{formatPKR(totalOpOut)}</span>
                </div>
                {totalTransferOut > 0 && (
                  <div className="flex items-center justify-between text-indigo-900 font-semibold bg-indigo-50/90 border border-indigo-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-indigo-700" />
                      <span>Day-End Safe Vault Handover:</span>
                      <span className="text-[10px] text-indigo-700 font-normal">(Stored in Safe Vault • Retained, Not an Expense)</span>
                    </span>
                    <span className="font-mono font-bold text-indigo-950">{formatPKR(totalTransferOut)}</span>
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between font-bold pt-1.5 border-t border-amber-200 gap-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-stone-700">
                      Drawer Expenses Paid: <strong className="text-amber-800 font-mono">{formatPKR(totalPhysicalOut)}</strong>
                    </span>
                    {totalOnlineOut > 0 && (
                      <>
                        <span className="text-stone-300">|</span>
                        <span className="text-rose-700">
                          Online/Bank: <strong className="font-mono">{formatPKR(totalOnlineOut)}</strong>
                        </span>
                      </>
                    )}
                  </div>
                  <div className="text-stone-900 font-mono text-sm bg-amber-100/60 border border-amber-300 px-2.5 py-0.5 rounded">
                    Total Expenses: <span className="text-amber-900 font-bold">{formatPKR(totalOut)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ================= RIGHT PAGE: CASH IN ================= */}
            <div className="col-span-7 p-3 sm:p-4 bg-emerald-50/20">
              {/* Header */}
              <div className="pb-2.5 mb-2.5 border-b-2 border-emerald-600 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
                    <span>Cash - In</span>
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-mono font-bold text-emerald-800">
                      {cashInItems.length} {cashInItems.length === 1 ? 'entry' : 'entries'}
                    </span>
                    <span className="text-stone-400 text-[10px]">•</span>
                    <span className="text-[11px] text-stone-500">Sales & Receipts</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-stone-500 block text-[10px]">Gross Sales:</span>
                  <span className="font-bold text-stone-900 text-sm text-emerald-700">{formatPKR(totalIn)}</span>
                </div>
              </div>

              {/* Multi-counter columns or categorized list */}
              <div className="space-y-4">
                {staffSummary.map(staff => (
                  <div key={staff.name} className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-2xs">
                    {/* Person Header */}
                    <div className="px-3 py-1.5 bg-stone-100 border-b border-stone-200 flex items-center justify-between text-xs font-bold text-stone-800">
                      <span className="text-emerald-900 font-semibold">{staff.name}</span>
                      <div className="flex items-center gap-2 text-[11px]">
                        {staff.online > 0 && (
                          <span className="text-rose-700 font-medium">Online: {formatPKR(staff.online)}</span>
                        )}
                        <span className="text-stone-500 font-normal">Cash: {formatPKR(staff.cash)}</span>
                        <span className="bg-emerald-700 text-white px-2 py-0.5 rounded font-mono">
                          Total: {formatPKR(staff.total)}
                        </span>
                      </div>
                    </div>

                    {/* Person's Transactions Table */}
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-stone-50/60 text-[10px] font-bold text-stone-500 border-b border-stone-200">
                          <th className="py-1 px-2.5 w-10">Sr #</th>
                          <th className="py-1 px-2 w-20">Bill #</th>
                          <th className="py-1 px-2 w-24">Payment</th>
                          <th className="py-1 px-2 text-right">Amount (PKR)</th>
                          <th className="py-1 px-2">Notes</th>
                          <th className="py-1 px-1 text-center w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {staff.items.map((item, idx) => (
                          <tr 
                            key={item.id} 
                            className={`hover:bg-emerald-50/40 transition-colors group ${
                              item.paymentMode === 'online' ? 'bg-rose-50/30' : ''
                            }`}
                          >
                            <td className="py-1.5 px-2.5 text-stone-400 text-[11px]">{idx + 1}</td>
                            
                            {/* Bill Number */}
                            <td className="py-1.5 px-2 font-mono font-bold text-stone-900">
                              {item.isRefund ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-sans font-bold text-amber-800 bg-amber-100/90 px-1.5 py-0.5 rounded border border-amber-200">
                                  <Undo2 className="w-2.5 h-2.5" /> Return
                                </span>
                              ) : item.isInternalTransfer ? (
                                <span className="text-stone-900 font-mono text-[11px] font-bold">
                                  {item.receiptNumber || item.billNumber ? `Receipt #${item.receiptNumber || item.billNumber}` : 'Transfer'}
                                </span>
                              ) : item.billNumber ? (
                                `#${item.billNumber}`
                              ) : (
                                '-'
                              )}
                            </td>

                            {/* Mode (Cash vs Red "Online") */}
                            <td className="py-1.5 px-2">
                              {item.paymentMode === 'online' ? (
                                <span className="inline-flex items-center gap-1 font-bold text-rose-600 bg-rose-100/70 border border-rose-200 px-1.5 py-0.5 rounded text-[10px]">
                                  <CreditCard className="w-2.5 h-2.5" /> Online
                                </span>
                              ) : (
                                <span className="text-stone-600 text-[11px] font-medium">Cash</span>
                              )}
                            </td>

                            {/* Amount in PKR */}
                            <td className="py-1.5 px-2 text-right font-mono font-bold text-stone-900">
                              <span className={item.paymentMode === 'online' ? 'text-rose-700' : 'text-emerald-800'}>
                                {item.amount.toLocaleString()}/-
                              </span>
                            </td>

                            {/* Note */}
                            <td className="py-1.5 px-2 text-stone-600 text-[11px] truncate max-w-[150px]">
                              {item.isRefund ? (
                                <span className="inline-flex items-center gap-1 text-amber-900">
                                  <span className="font-semibold text-[10px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded shrink-0">
                                    Refund
                                  </span>
                                  <span className="truncate">{item.description}</span>
                                </span>
                              ) : (
                                item.description || '-'
                              )}
                            </td>

                            {/* Edit & Delete Actions */}
                            <td className="py-1.5 px-1 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => setEditingTransaction(item)}
                                  className="p-1 rounded text-stone-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                                  title="Edit entry"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteTransaction(item.id)}
                                  className="p-1 rounded text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Delete entry"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}

                {/* Dedicated Card for Safe Vault Float Replenishments & Injections */}
                {internalInItems.length > 0 && (
                  <div className="bg-white rounded-xl border border-indigo-200 overflow-hidden shadow-2xs">
                    <div className="px-3 py-1.5 bg-indigo-50 border-b border-indigo-200 flex items-center justify-between text-xs font-bold text-indigo-950">
                      <div className="flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-indigo-700" />
                        <span>Safe Vault Float Replenishments (Safe ➔ Drawer)</span>
                      </div>
                      <span className="bg-indigo-700 text-white px-2 py-0.5 rounded font-mono text-[11px]">
                        Total: {formatPKR(totalSafeIn)}
                      </span>
                    </div>

                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-indigo-50/40 text-[10px] font-bold text-stone-500 border-b border-indigo-100">
                          <th className="py-1 px-2.5 w-10">Sr #</th>
                          <th className="py-1 px-2 w-28">Source / Type</th>
                          <th className="py-1 px-2">Purpose / Notes</th>
                          <th className="py-1 px-2 text-right">Amount (PKR)</th>
                          <th className="py-1 px-1 text-center w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {internalInItems.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors group">
                            <td className="py-1.5 px-2.5 text-stone-400 text-[11px]">{idx + 1}</td>
                            <td className="py-1.5 px-2 font-semibold text-indigo-900 text-[11px]">
                              <span className="inline-flex items-center gap-1 bg-indigo-100/70 border border-indigo-200 px-1.5 py-0.5 rounded">
                                <ArrowUpRight className="w-2.5 h-2.5 text-indigo-700" /> Safe Vault
                              </span>
                            </td>
                            <td className="py-1.5 px-2 text-stone-700 text-[11px]">
                              <div className="font-medium text-stone-900">{item.description}</div>
                              <span className="text-[10px] text-stone-400">• {item.time}</span>
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono font-bold text-indigo-800">
                              +{item.amount.toLocaleString()}/-
                            </td>
                            <td className="py-1.5 px-1 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => setEditingTransaction(item)}
                                  className="p-1 rounded text-stone-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                                  title="Edit entry"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteTransaction(item.id)}
                                  className="p-1 rounded text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Delete entry"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {cashInItems.length === 0 && (
                  <div className="text-center py-8 text-stone-400 italic bg-white rounded-xl border border-stone-200">
                    {isFiltered ? 'No sales/cash in entries match current filter.' : 'No sales recorded for this date yet.'}
                  </div>
                )}
              </div>

              {/* Subtotal row */}
              <div className="mt-3 pt-2.5 border-t-2 border-emerald-600 space-y-1 text-xs">
                {totalSafeIn > 0 && (
                  <div className="flex items-center justify-between text-stone-600 font-medium">
                    <span>Customer Sales:</span>
                    <span className="font-mono text-emerald-800 font-bold">{formatPKR(totalSalesIn)}</span>
                  </div>
                )}
                {totalSafeIn > 0 && (
                  <div className="flex items-center justify-between text-indigo-700 font-medium">
                    <span>Safe Injections (Float):</span>
                    <span className="font-mono font-bold">+{formatPKR(totalSafeIn)}</span>
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between font-bold pt-1 border-t border-emerald-200 gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-stone-700">Physical Cash: <strong className="text-emerald-800">{formatPKR(totalPhysicalIn)}</strong></span>
                    <span className="text-stone-400">|</span>
                    <span className="text-rose-700">Online Transfers: <strong>{formatPKR(totalOnline)}</strong></span>
                  </div>
                  <div className="text-stone-900 font-mono text-sm">
                    Total Inflow: <span className="text-emerald-700">{formatPKR(totalIn)}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      ) : (
        /* VIEW 2: FLAT SPREADSHEET TABLE VIEW */
        <div className="overflow-x-auto">
          {/* Pagination Controls Bar */}
          <div className="px-4 py-2 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-stone-600 font-medium">Rows per page:</span>
              <select
                id="select-page-size"
                value={pageSize}
                onChange={e => {
                  const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                  setPageSize(val);
                  setCurrentPage(1);
                }}
                className="bg-white border border-stone-300 rounded px-2 py-1 text-xs font-semibold text-stone-800 outline-hidden cursor-pointer"
              >
                <option value={25}>25 entries</option>
                <option value={50}>50 entries (Recommended)</option>
                <option value={100}>100 entries</option>
                <option value={250}>250 entries</option>
                <option value="all">Show All ({transactions.length})</option>
              </select>
              {pageSize !== 'all' && (
                <span className="text-stone-500 text-[11px] ml-1">
                  Showing {Math.min(transactions.length, (currentPage - 1) * (pageSize as number) + 1)} - {Math.min(transactions.length, currentPage * (pageSize as number))} of {transactions.length}
                </span>
              )}
            </div>

            {/* Page Navigation */}
            {pageSize !== 'all' && totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  className="p-1 rounded hover:bg-stone-200 disabled:opacity-30 disabled:pointer-events-none transition-colors text-stone-700"
                  title="First Page"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="px-2 py-1 rounded border border-stone-300 bg-white hover:bg-stone-100 disabled:opacity-30 disabled:pointer-events-none text-xs font-semibold text-stone-700 transition-colors flex items-center gap-0.5"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>
                <span className="px-2 font-mono font-bold text-stone-800 text-xs">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="px-2 py-1 rounded border border-stone-300 bg-white hover:bg-stone-100 disabled:opacity-30 disabled:pointer-events-none text-xs font-semibold text-stone-700 transition-colors flex items-center gap-0.5"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="p-1 rounded hover:bg-stone-200 disabled:opacity-30 disabled:pointer-events-none transition-colors text-stone-700"
                  title="Last Page"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-stone-100/80 border-b border-stone-300 text-stone-700 font-bold">
                <th className="py-2.5 px-3 w-12">Sr #</th>
                <th className="py-2.5 px-3">Date & Time</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Counter / Salesperson</th>
                <th className="py-2.5 px-3">Receipt / Bill #</th>
                <th className="py-2.5 px-3">Mode</th>
                <th className="py-2.5 px-3">Particulars / Description</th>
                <th className="py-2.5 px-3 text-right">Amount (PKR)</th>
                <th className="py-2.5 px-2 text-center w-12">Verified</th>
                <th className="py-2.5 px-2 text-center w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {paginatedTableTransactions.map((t, idx) => {
                const globalIndex = pageSize === 'all' 
                  ? idx + 1 
                  : (currentPage - 1) * pageSize + idx + 1;
                return (
                  <tr 
                    key={t.id} 
                    onClick={() => setEditingTransaction(t)}
                    className={`hover:bg-amber-100/35 transition-colors cursor-pointer group ${
                      t.type === 'cash_in' ? 'bg-emerald-50/15' : 'bg-amber-50/15'
                    }`}
                    title="Click row or Edit button to edit this entry"
                  >
                    <td className="py-2 px-3 text-stone-400 font-mono">{globalIndex}</td>
                    <td className="py-2 px-3 whitespace-nowrap text-stone-600" onClick={e => e.stopPropagation()}>
                      {onUpdateTransaction ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="date"
                            value={t.date}
                            onChange={(e) => {
                              if (e.target.value) {
                                onUpdateTransaction(t.id, { date: e.target.value });
                              }
                            }}
                            className="bg-stone-50 hover:bg-white focus:bg-white border border-stone-200 hover:border-emerald-400 focus:border-emerald-600 rounded px-1.5 py-0.5 font-semibold text-stone-800 text-xs cursor-pointer outline-hidden transition-colors"
                            title="Click to change date"
                          />
                          <input
                            type="time"
                            value={t.time || ''}
                            onChange={(e) => {
                              if (onUpdateTransaction) {
                                onUpdateTransaction(t.id, { time: e.target.value });
                              }
                            }}
                            className="bg-transparent hover:bg-white border border-transparent hover:border-stone-300 rounded px-1 py-0.5 text-stone-500 hover:text-stone-900 text-[11px] cursor-pointer"
                            title="Click to change time"
                          />
                        </div>
                      ) : (
                        <>
                          <span className="font-semibold text-stone-800">{t.date}</span>
                          <span className="text-stone-400 ml-1 text-[11px]">{t.time}</span>
                        </>
                      )}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      {t.type === 'cash_in' ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {t.isInternalTransfer || isInternalTransferTransaction(t) ? (
                            <span className="bg-indigo-100 text-indigo-900 border border-indigo-300 font-bold px-2 py-0.5 rounded text-[10px] inline-flex items-center gap-1">
                              <ArrowUpRight className="w-2.5 h-2.5 text-indigo-700" /> Safe ➔ Drawer
                            </span>
                          ) : (
                            <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[11px]">
                              Cash In
                            </span>
                          )}
                          {t.isRefund && (
                            <span className="bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded text-[10px] border border-amber-200">
                              Refund
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {t.isInternalTransfer || isInternalTransferTransaction(t) ? (
                            t.transferDestination === 'individual' ||
                            (t.category && t.category.toLowerCase().includes('individual')) ||
                            (t.description && (
                              t.description.toLowerCase().includes('handover to') ||
                              t.description.toLowerCase().includes('safe cash to') ||
                              t.description.toLowerCase().includes('safe to individual')
                            )) ||
                            (t.transferSource === 'safe' && t.type === 'cash_out' && t.transferDestination !== 'bank' && t.transferDestination !== 'safe') ? (
                              <span className="bg-purple-100 text-purple-900 border border-purple-300 font-bold px-2 py-0.5 rounded text-[10px] inline-flex items-center gap-1">
                                <User className="w-2.5 h-2.5 text-purple-700" /> Safe ➔ {t.salesperson || 'Individual'}
                              </span>
                            ) : t.transferDestination === 'bank' || t.description.toLowerCase().includes('bank') ? (
                              <span className="bg-blue-100 text-blue-900 border border-blue-300 font-bold px-2 py-0.5 rounded text-[10px] inline-flex items-center gap-1">
                                <Landmark className="w-2.5 h-2.5 text-blue-700" /> Safe ➔ Bank
                              </span>
                            ) : (
                              <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold px-2 py-0.5 rounded text-[10px] inline-flex items-center gap-1">
                                <ArrowDownToLine className="w-2.5 h-2.5 text-emerald-700" /> Drawer ➔ Safe
                              </span>
                            )
                          ) : getMainCashOutCategory(t) === 'vendor_payments' ? (
                            <span className="bg-blue-100 text-blue-800 border border-blue-200 font-bold px-2 py-0.5 rounded text-[11px] inline-flex items-center gap-1">
                              <Truck className="w-3 h-3 text-blue-700" /> Vendor Payment
                            </span>
                          ) : getMainCashOutCategory(t) === 'market_payments' ? (
                            <span className="bg-purple-100 text-purple-900 border border-purple-200 font-bold px-2 py-0.5 rounded text-[11px] inline-flex items-center gap-1">
                              <Store className="w-3 h-3 text-purple-700" /> Market Creditor
                            </span>
                          ) : (
                            <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-[11px]">
                              Expense
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-3 font-semibold text-stone-900">
                      {t.type === 'cash_in' 
                        ? (t.isRefund 
                            ? `${t.salesperson || 'Staff'} (Refund)` 
                            : (t.isInternalTransfer || isInternalTransferTransaction(t))
                            ? (
                              <span className="inline-flex items-center gap-1 text-indigo-900 font-semibold">
                                <Lock className="w-3 h-3 text-indigo-600" /> Safe Vault
                              </span>
                            )
                            : (t.salesperson || 'Counter'))
                        : (t.isInternalTransfer || isInternalTransferTransaction(t))
                        ? (
                          t.transferDestination === 'individual' ||
                          (t.category && t.category.toLowerCase().includes('individual')) ||
                          (t.description && (
                            t.description.toLowerCase().includes('handover to') ||
                            t.description.toLowerCase().includes('safe cash to') ||
                            t.description.toLowerCase().includes('safe to individual')
                          )) ||
                          (t.transferSource === 'safe' && t.type === 'cash_out' && t.transferDestination !== 'bank' && t.transferDestination !== 'safe') ? (
                            <span className="inline-flex items-center gap-1 text-purple-900 font-semibold">
                              <User className="w-3 h-3 text-purple-600" /> {t.salesperson || 'Individual'}
                            </span>
                          ) : t.transferDestination === 'bank' || t.description.toLowerCase().includes('bank') ? (
                            <span className="inline-flex items-center gap-1 text-blue-900 font-semibold">
                              <Landmark className="w-3 h-3 text-blue-600" /> Safe ➔ Bank
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-900 font-semibold">
                              <Lock className="w-3 h-3 text-emerald-600" /> Drawer ➔ Safe
                            </span>
                          )
                        )
                        : getMainCashOutCategory(t) === 'vendor_payments' ? (
                          <span className="inline-flex items-center gap-1 text-blue-950 font-bold">
                            <Truck className="w-3.5 h-3.5 text-blue-600" /> {t.partyName || 'Vendor'}
                          </span>
                        ) : getMainCashOutCategory(t) === 'market_payments' ? (
                          <span className="inline-flex items-center gap-1 text-purple-950 font-bold">
                            <Store className="w-3.5 h-3.5 text-purple-600" /> {t.partyName || 'Market Creditor'}
                          </span>
                        ) : (
                          t.category?.split('(')[0] || 'Expense'
                        )}
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-stone-800">
                      {t.isRefund ? (
                        <span className="text-amber-700 font-sans font-semibold text-xs">
                          {t.billNumber ? `Ref #${t.billNumber}` : 'Cash Return'}
                        </span>
                      ) : (t.isInternalTransfer || isInternalTransferTransaction(t)) ? (
                        (t.receiptNumber || t.biltyNumber || t.billNumber) ? (
                          <span className="text-stone-900 font-mono text-[11px] font-bold">
                            Receipt #{t.receiptNumber || t.biltyNumber || t.billNumber}
                          </span>
                        ) : (
                          <span className="text-stone-400 font-sans text-[11px] font-medium">
                            Transfer Ref
                          </span>
                        )
                      ) : (t.receiptNumber || t.biltyNumber) ? (
                        `Receipt #${t.receiptNumber || t.biltyNumber}`
                      ) : t.billNumber ? (
                        `Bill #${t.billNumber}`
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      {t.transferDestination === 'bank' || (t.category?.includes('Bank') && t.transferSource === 'safe') ? (
                        <span className="text-blue-700 font-semibold text-[11px] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                          Bank Deposit
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (onUpdateTransaction) {
                              onUpdateTransaction(t.id, { paymentMode: t.paymentMode === 'online' ? 'cash' : 'online' });
                            }
                          }}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors cursor-pointer inline-flex items-center gap-1 ${
                            t.paymentMode === 'online'
                              ? 'text-rose-700 bg-rose-50 border-rose-300 hover:bg-rose-100'
                              : 'text-stone-700 bg-stone-100 border-stone-300 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300'
                          }`}
                          title="Click to toggle Cash vs Online"
                        >
                          {t.paymentMode === 'online' ? '💳 Online' : '💵 Cash'}
                        </button>
                      )}
                    </td>
                    <td className="py-2 px-3 text-stone-800 max-w-xs">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="truncate">
                          {t.isRefund ? (
                            <span className="inline-flex items-center gap-1 text-stone-900 font-medium">
                              <span className="text-amber-700 font-bold text-xs">↩</span>
                              {t.description}
                            </span>
                          ) : (t.isInternalTransfer || isInternalTransferTransaction(t)) ? (
                            <span className="inline-flex items-center gap-1 text-stone-900 font-medium">
                              <span className="text-indigo-600 font-bold text-xs">⇄</span>
                              {t.description}
                            </span>
                          ) : (
                            t.description
                          )}
                        </span>
                        <span className="opacity-0 group-hover:opacity-100 text-[10px] text-emerald-700 font-semibold shrink-0">
                          ✏️ Edit
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold">
                      <span className={t.type === 'cash_in' ? 'text-emerald-700' : 'text-amber-700'}>
                        {t.type === 'cash_in' ? '+' : '-'}{formatPKR(t.amount)}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onToggleVerified(t.id)}
                        className={`w-5 h-5 rounded-md inline-flex items-center justify-center text-xs font-bold transition-colors cursor-pointer ${
                          t.verified ? 'text-emerald-700 bg-emerald-100' : 'text-stone-300 hover:text-stone-500'
                        }`}
                        title="Click to toggle verification status"
                      >
                        {t.verified ? '✓' : '-'}
                      </button>
                    </td>
                    <td className="py-2 px-2 text-center whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          id={`btn-edit-transaction-${t.id}`}
                          onClick={() => setEditingTransaction(t)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition-colors cursor-pointer shadow-2xs"
                          title="Click to edit entry (category, party, amount, date, etc.)"
                        >
                          <Pencil className="w-3 h-3 text-emerald-700" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          id={`btn-delete-transaction-${t.id}`}
                          onClick={() => onDeleteTransaction(t.id)}
                          className="p-1 rounded-md text-stone-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                          title="Delete entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {transactions.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-stone-500">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <p className="font-semibold text-stone-700">No transactions match your search filter</p>
                      <p className="text-xs text-stone-400">Try adjusting your description, salesperson, or date range filters.</p>
                      {isFiltered && onResetFilters && (
                        <button
                          type="button"
                          onClick={onResetFilters}
                          className="mt-2 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                        >
                          Clear All Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Bottom Pagination Bar for Table View */}
          {pageSize !== 'all' && totalPages > 1 && (
            <div className="p-3 bg-stone-50/70 border-t border-stone-200 flex items-center justify-between text-xs">
              <span className="text-stone-500">
                Showing {Math.min(transactions.length, (currentPage - 1) * (pageSize as number) + 1)} to {Math.min(transactions.length, currentPage * (pageSize as number))} of {transactions.length} entries
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  className="px-2 py-1 rounded border border-stone-300 bg-white hover:bg-stone-100 disabled:opacity-30 disabled:pointer-events-none text-xs text-stone-700"
                >
                  First
                </button>
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded border border-stone-300 bg-white hover:bg-stone-100 disabled:opacity-30 disabled:pointer-events-none text-xs font-semibold text-stone-700"
                >
                  Prev
                </button>
                <span className="px-2 font-bold font-mono text-stone-800 text-xs">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1 rounded border border-stone-300 bg-white hover:bg-stone-100 disabled:opacity-30 disabled:pointer-events-none text-xs font-semibold text-stone-700"
                >
                  Next
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="px-2 py-1 rounded border border-stone-300 bg-white hover:bg-stone-100 disabled:opacity-30 disabled:pointer-events-none text-xs text-stone-700"
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Spreadsheet Footer: Daily Closing Balance */}
      <div className="p-4 bg-stone-100 border-t border-stone-300 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5 text-stone-600">
          <div className="flex items-center gap-1.5 bg-white border border-stone-200 px-3 py-1.5 rounded-lg shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <div>
              <div className="flex items-center gap-1.5">
                <span>Total Inflow:</span>
                <strong className="text-emerald-800 font-mono font-bold text-xs">{formatPKR(totalIn)}</strong>
                <span className="text-stone-400 text-[10px]">({cashInItems.length} entries)</span>
              </div>
              <div className="text-[10px] text-stone-500 flex items-center gap-2 mt-0.5">
                <span>Drawer Cash: <strong className="text-emerald-800 font-mono font-semibold">{formatPKR(totalPhysicalIn)}</strong></span>
                {totalOnline > 0 && <span>• Online: <strong className="text-rose-700 font-mono">{formatPKR(totalOnline)}</strong></span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-white border border-stone-200 px-3 py-1.5 rounded-lg shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <div>
              <div className="flex items-center gap-1.5">
                <span>Total Expenses:</span>
                <strong className="text-amber-800 font-mono font-bold text-xs">{formatPKR(totalOut)}</strong>
                <span className="text-stone-400 text-[10px]">({cashOutItems.length} vouchers)</span>
              </div>
              <div className="text-[10px] text-stone-500 flex items-center gap-2 mt-0.5 flex-wrap">
                <span>Expenses: <strong className="text-stone-800 font-mono font-semibold">{formatPKR(totalOpOut)}</strong></span>
                {totalTransferOut > 0 && (
                  <span className="text-indigo-800 font-medium">• Stored in Safe: <strong className="font-mono font-semibold">{formatPKR(totalTransferOut)}</strong> (retained in vault)</span>
                )}
                {totalOnlineOut > 0 && <span>• Bank: <strong className="text-rose-700 font-mono">{formatPKR(totalOnlineOut)}</strong></span>}
              </div>
            </div>
          </div>

          <span className="text-stone-500 text-[11px] ml-1">
            Total: <strong className="text-stone-900 font-mono">{transactions.length} entries</strong>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[11px] text-stone-600 font-medium">
              Drawer Till Net: <strong className={`font-mono font-bold ${totalPhysicalIn - totalPhysicalOut >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{totalPhysicalIn - totalPhysicalOut >= 0 ? '+' : ''}{formatPKR(totalPhysicalIn - totalPhysicalOut)}</strong>
            </div>
            <div className="text-[10px] text-stone-400">
              Total Net (All Channels)
            </div>
          </div>
          <span className={`text-base font-bold font-mono px-3 py-1 rounded-lg shadow-2xs ${
            netBalance >= 0 ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          }`}>
            {netBalance >= 0 ? '+' : ''}{formatPKR(netBalance)}
          </span>
        </div>
      </div>

      {/* Edit Transaction Modal */}
      <EditTransactionModal
        isOpen={!!editingTransaction}
        transaction={editingTransaction}
        onClose={() => setEditingTransaction(null)}
        onSave={(id, updates) => {
          if (onUpdateTransaction) {
            onUpdateTransaction(id, updates);
          }
          setEditingTransaction(null);
        }}
        staffList={staffList}
      />
    </div>
  );
};
