import React, { useState, useEffect } from 'react';
import { 
  Search, 
  User, 
  Calendar, 
  RotateCcw, 
  X, 
  SlidersHorizontal,
  ArrowRight,
  Filter,
  SunMedium
} from 'lucide-react';
import { PaymentMode, TransactionType } from '../types';

export interface FilterState {
  description: string;
  salesperson: string;
  startDate: string;
  endDate: string;
  type: 'all' | 'cash_in' | 'cash_out' | 'online' | 'internal_transfer' | 'safe_to_individual' | 'expenses' | 'vendor_payments' | 'market_payments';
  dateScope?: 'active_day' | 'all';
}

interface TransactionFilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  onResetFilters: () => void;
  staffList: string[];
  totalTransactionsCount: number;
  filteredTransactionsCount: number;
  selectedDate?: string;
  onOpenStartNewDay?: () => void;
}

export const TransactionFilterBar: React.FC<TransactionFilterBarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  staffList,
  totalTransactionsCount,
  filteredTransactionsCount,
  selectedDate,
  onOpenStartNewDay
}) => {
  // Local debounced description search state
  const [localDesc, setLocalDesc] = useState<string>(filters.description);

  useEffect(() => {
    setLocalDesc(filters.description);
  }, [filters.description]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localDesc !== filters.description) {
        onFilterChange({ description: localDesc });
      }
    }, 180);
    return () => clearTimeout(handler);
  }, [localDesc, filters.description, onFilterChange]);

  const hasActiveFilters = Boolean(
    filters.description.trim() ||
    (filters.salesperson && filters.salesperson !== 'all') ||
    filters.startDate ||
    filters.endDate ||
    filters.type !== 'all'
  );

  const formatLocalDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleApplyPreset = (preset: 'today' | 'yesterday' | 'last7' | 'month' | 'all') => {
    const now = new Date();
    const todayStr = formatLocalDate(now);

    if (preset === 'today') {
      onFilterChange({ startDate: todayStr, endDate: todayStr });
    } else if (preset === 'yesterday') {
      const yest = new Date(now);
      yest.setDate(now.getDate() - 1);
      const yestStr = formatLocalDate(yest);
      onFilterChange({ startDate: yestStr, endDate: yestStr });
    } else if (preset === 'last7') {
      const past7 = new Date(now);
      past7.setDate(now.getDate() - 6);
      onFilterChange({ startDate: formatLocalDate(past7), endDate: todayStr });
    } else if (preset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      onFilterChange({ startDate: formatLocalDate(firstDay), endDate: todayStr });
    } else if (preset === 'all') {
      onFilterChange({ startDate: '', endDate: '', dateScope: 'all' });
    }
  };

  return (
    <div 
      id="transaction-filter-bar" 
      className="mb-4 bg-white border border-stone-200 rounded-2xl shadow-xs overflow-hidden"
    >
      {/* Header Bar */}
      <div className="px-4 py-3 bg-stone-50/80 border-b border-stone-100 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-emerald-700" />
          <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
            Ledger Search & Filter Controls
          </h3>
          <span className="text-stone-300">|</span>
          <span className="text-xs text-stone-600 font-medium">
            Showing <strong className="text-stone-900 font-bold">{filteredTransactionsCount}</strong> of{' '}
            <span className="text-stone-500">{totalTransactionsCount}</span> transactions
          </span>
        </div>

        {/* Quick Date Presets & Scope Controls */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {/* Daily vs All History Scope Switcher */}
          <div className="flex items-center gap-1 bg-stone-200/70 p-0.5 rounded-lg text-xs mr-1">
            <button
              type="button"
              onClick={() => onFilterChange({ dateScope: 'active_day', startDate: '', endDate: '' })}
              className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition-all cursor-pointer ${
                filters.dateScope !== 'all' && !filters.startDate && !filters.endDate
                  ? 'bg-emerald-700 text-white shadow-2xs font-bold'
                  : 'text-stone-700 hover:text-stone-900'
              }`}
              title="View only entries belonging to the currently active date"
            >
              📅 Active Day ({selectedDate || 'Today'})
            </button>
            <button
              type="button"
              onClick={() => onFilterChange({ dateScope: 'all', startDate: '', endDate: '' })}
              className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition-all cursor-pointer ${
                filters.dateScope === 'all' && !filters.startDate && !filters.endDate
                  ? 'bg-stone-900 text-white shadow-2xs font-bold'
                  : 'text-stone-700 hover:text-stone-900'
              }`}
              title="View all transactions from all recorded dates in history"
            >
              📚 All History ({totalTransactionsCount})
            </button>
          </div>

          {onOpenStartNewDay && (
            <button
              type="button"
              onClick={onOpenStartNewDay}
              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-md font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors mr-1"
              title="Start a new day shift with carried-over float"
            >
              <SunMedium className="w-3 h-3 text-amber-500" />
              <span>Start New Day</span>
            </button>
          )}

          <span className="text-[11px] font-medium text-stone-500 mr-0.5 hidden md:inline">Presets:</span>
          <button
            type="button"
            onClick={() => handleApplyPreset('today')}
            className={`px-2 py-1 rounded-md font-semibold text-[11px] transition-colors cursor-pointer ${
              filters.startDate && filters.startDate === filters.endDate && filters.startDate === formatLocalDate(new Date())
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset('yesterday')}
            className="px-2 py-1 rounded-md font-semibold text-[11px] bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            Yesterday
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset('last7')}
            className="px-2 py-1 rounded-md font-semibold text-[11px] bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            7 Days
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset('month')}
            className="px-2 py-1 rounded-md font-semibold text-[11px] bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            This Month
          </button>

          {hasActiveFilters && (
            <button
              id="btn-reset-ledger-filters"
              type="button"
              onClick={onResetFilters}
              className="ml-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer flex items-center gap-1"
              title="Reset all search filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Filter Inputs Grid */}
      <div className="p-3.5 sm:p-4 grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
        {/* 1. Description Search Input */}
        <div className="md:col-span-4">
          <label 
            htmlFor="filter-input-description" 
            className="block text-[11px] font-bold text-stone-700 mb-1"
          >
            Description / Particulars
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="filter-input-description"
              type="text"
              placeholder="Search description, bill #, party, notes..."
              value={localDesc}
              onChange={e => setLocalDesc(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  onFilterChange({ description: localDesc });
                }
              }}
              className="w-full pl-8 pr-7 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs text-stone-900 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden transition-all"
            />
            {localDesc && (
              <button
                id="btn-clear-filter-description"
                type="button"
                onClick={() => {
                  setLocalDesc('');
                  onFilterChange({ description: '' });
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-0.5 rounded cursor-pointer"
                title="Clear description search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 2. Salesperson / Staff Dropdown */}
        <div className="md:col-span-3">
          <label 
            htmlFor="filter-select-salesperson" 
            className="block text-[11px] font-bold text-stone-700 mb-1"
          >
            Salesperson / Counter
          </label>
          <div className="relative">
            <User className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              id="filter-select-salesperson"
              value={filters.salesperson}
              onChange={e => onFilterChange({ salesperson: e.target.value })}
              className="w-full pl-8 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium text-stone-900 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden transition-all cursor-pointer"
            >
              <option value="all">All Salespersons ({staffList.length})</option>
              {staffList.map(name => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 3. Date Range (Start Date & End Date) */}
        <div className="md:col-span-3">
          <label className="block text-[11px] font-bold text-stone-700 mb-1">
            Date Range (From &ndash; To)
          </label>
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <input
                id="filter-date-start"
                type="date"
                value={filters.startDate}
                onChange={e => onFilterChange({ startDate: e.target.value })}
                className="w-full px-2 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium text-stone-900 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden transition-all"
                title="Start Date"
              />
            </div>
            <span className="text-stone-400 text-xs font-semibold shrink-0">&ndash;</span>
            <div className="relative flex-1">
              <input
                id="filter-date-end"
                type="date"
                value={filters.endDate}
                onChange={e => onFilterChange({ endDate: e.target.value })}
                className="w-full px-2 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium text-stone-900 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden transition-all"
                title="End Date"
              />
            </div>
            {(filters.startDate || filters.endDate) && (
              <button
                type="button"
                onClick={() => onFilterChange({ startDate: '', endDate: '' })}
                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-md transition-colors cursor-pointer shrink-0"
                title="Clear date range"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 4. Transaction Type Selector */}
        <div className="md:col-span-2">
          <label 
            htmlFor="filter-select-type" 
            className="block text-[11px] font-bold text-stone-700 mb-1"
          >
            Transaction Type
          </label>
          <div className="relative">
            <Filter className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              id="filter-select-type"
              value={filters.type}
              onChange={e => onFilterChange({ type: e.target.value as any })}
              className="w-full pl-8 pr-2 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium text-stone-900 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden transition-all cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="cash_in">Cash In (Sales)</option>
              <option value="cash_out">All Cash Out</option>
              <option value="expenses">1. Expenses (Operating)</option>
              <option value="vendor_payments">2. Vendor Payments</option>
              <option value="market_payments">3. Market Payments (Creditor)</option>
              <option value="safe_to_individual">Safe ➔ Individual Transfers</option>
              <option value="internal_transfer">All Internal Transfers</option>
              <option value="online">Online Transfers</option>
            </select>
          </div>
        </div>
      </div>

      {/* Active Filter Indicators Bar */}
      {hasActiveFilters && (
        <div className="px-4 py-2 bg-emerald-50/50 border-t border-emerald-100/70 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Active Filters:</span>
            
            {filters.description && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-emerald-300 rounded text-stone-700 text-[11px]">
                <span>Description: &ldquo;{filters.description}&rdquo;</span>
                <button
                  type="button"
                  onClick={() => onFilterChange({ description: '' })}
                  className="text-stone-400 hover:text-stone-700 ml-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {filters.salesperson && filters.salesperson !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-emerald-300 rounded text-stone-700 text-[11px]">
                <span>Staff: {filters.salesperson}</span>
                <button
                  type="button"
                  onClick={() => onFilterChange({ salesperson: 'all' })}
                  className="text-stone-400 hover:text-stone-700 ml-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {(filters.startDate || filters.endDate) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-emerald-300 rounded text-stone-700 text-[11px]">
                <Calendar className="w-3 h-3 text-emerald-600" />
                <span>
                  {filters.startDate || 'Start'} &rarr; {filters.endDate || 'End'}
                </span>
                <button
                  type="button"
                  onClick={() => onFilterChange({ startDate: '', endDate: '' })}
                  className="text-stone-400 hover:text-stone-700 ml-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {filters.type !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-emerald-300 rounded text-stone-700 text-[11px]">
                <span>
                  Type: {
                    filters.type === 'cash_in' 
                      ? 'Cash In' 
                      : filters.type === 'cash_out' 
                      ? 'Cash Out' 
                      : filters.type === 'expenses'
                      ? '1. Expenses'
                      : filters.type === 'vendor_payments'
                      ? '2. Vendor Payments'
                      : filters.type === 'market_payments'
                      ? '3. Market Payments (Creditor)' 
                      : filters.type === 'safe_to_individual'
                      ? 'Safe ➔ Individual'
                      : filters.type === 'internal_transfer'
                      ? 'Internal Transfers'
                      : 'Online Transfers'
                  }
                </span>
                <button
                  type="button"
                  onClick={() => onFilterChange({ type: 'all' })}
                  className="text-stone-400 hover:text-stone-700 ml-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onResetFilters}
            className="text-[11px] font-semibold text-stone-600 hover:text-rose-600 underline cursor-pointer"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
};
