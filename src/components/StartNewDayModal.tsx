import React, { useState, useEffect } from 'react';
import { 
  SunMedium, 
  CalendarPlus, 
  ArrowRight, 
  Check, 
  X, 
  ShieldCheck, 
  Wallet, 
  Lock, 
  Calendar,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { formatPKR } from '../utils/exportSpreadsheet';

interface StartNewDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: string;
  closingDrawerCash: number;
  safeRunningBalance: number;
  onStartNewDay: (newDate: string, newOpeningCash: number) => void;
}

export const StartNewDayModal: React.FC<StartNewDayModalProps> = ({
  isOpen,
  onClose,
  currentDate,
  closingDrawerCash,
  safeRunningBalance,
  onStartNewDay
}) => {
  // Helper to compute next day's date string
  const getNextDayString = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        const next = new Date(y, m - 1, d + 1, 12, 0, 0);
        const year = next.getFullYear();
        const month = String(next.getMonth() + 1).padStart(2, '0');
        const day = String(next.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch {
      // fallback
    }
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };

  const getTodayString = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };

  const [newDate, setNewDate] = useState<string>(() => getNextDayString(currentDate));
  const [openingOption, setOpeningOption] = useState<'carry' | 'custom' | 'zero'>('carry');
  const [customOpening, setCustomOpening] = useState<string>(String(Math.max(0, closingDrawerCash)));

  useEffect(() => {
    if (isOpen) {
      const todayStr = getTodayString();
      // If currently viewing a past day, default to today; if viewing today, default to tomorrow
      if (currentDate < todayStr) {
        setNewDate(todayStr);
      } else {
        setNewDate(getNextDayString(currentDate));
      }
      setOpeningOption('carry');
      setCustomOpening(String(Math.max(0, closingDrawerCash)));
    }
  }, [isOpen, currentDate, closingDrawerCash]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const resolvedOpeningAmount = 
    openingOption === 'carry' 
      ? Math.max(0, closingDrawerCash)
      : openingOption === 'zero'
      ? 0
      : parseFloat(customOpening) || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate) return;
    onStartNewDay(newDate, resolvedOpeningAmount);
    onClose();
  };

  return (
    <div
      id="modal-start-new-day"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="start-day-title"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden transform transition-all"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-700 to-teal-800 text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-md text-white flex items-center justify-center shrink-0 border border-white/20">
              <SunMedium className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="start-day-title" className="text-base font-bold text-white tracking-tight">
                  Start New Day Ledger
                </h3>
                <span className="text-[10px] bg-emerald-900/60 text-emerald-200 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-emerald-500/30">
                  Daily Shift Close
                </span>
              </div>
              <p className="text-xs text-emerald-100 mt-0.5">
                Rollover register drawer cash and open a clean daily cash book.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Previous Day Balance Recap */}
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 text-xs">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-2">
              Previous Closing Summary ({currentDate}):
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                <span className="text-[11px] text-stone-500 block flex items-center gap-1 font-medium">
                  <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Closing Drawer Cash:</span>
                </span>
                <strong className="text-sm font-bold font-mono text-emerald-800 block mt-0.5">
                  {formatPKR(Math.max(0, closingDrawerCash))}
                </strong>
                <span className="text-[10px] text-stone-400">Physical cash in drawer</span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                <span className="text-[11px] text-stone-500 block flex items-center gap-1 font-medium">
                  <Lock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Safe Vault Total:</span>
                </span>
                <strong className="text-sm font-bold font-mono text-indigo-900 block mt-0.5">
                  {formatPKR(safeRunningBalance)}
                </strong>
                <span className="text-[10px] text-stone-400">Secure vault balance</span>
              </div>
            </div>
          </div>

          {/* New Day Date Selection */}
          <div>
            <label htmlFor="input-new-day-date" className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                <span>New Day Date</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setNewDate(getTodayString())}
                  className="px-2 py-0.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                >
                  Set to Today
                </button>
                <span className="text-stone-300">•</span>
                <button
                  type="button"
                  onClick={() => setNewDate(getNextDayString(currentDate))}
                  className="px-2 py-0.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                >
                  Tomorrow (+1d)
                </button>
              </div>
            </label>
            <input
              id="input-new-day-date"
              type="date"
              required
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 font-bold text-sm focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 outline-hidden transition-all cursor-pointer"
            />
          </div>

          {/* Morning Opening Cash Float Options */}
          <div>
            <label className="block text-xs font-bold text-stone-800 mb-1.5">
              New Day Morning Opening Cash Float:
            </label>
            <div className="space-y-2">
              {/* Option 1: Carry over previous closing cash */}
              <label 
                className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  openingOption === 'carry'
                    ? 'bg-emerald-50/70 border-emerald-500 ring-1 ring-emerald-500/20'
                    : 'bg-white border-stone-200 hover:bg-stone-50'
                }`}
              >
                <input
                  type="radio"
                  name="opening-option"
                  checked={openingOption === 'carry'}
                  onChange={() => setOpeningOption('carry')}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="flex-1 text-xs">
                  <div className="flex items-center justify-between font-bold text-stone-900">
                    <span>Carry over previous closing register cash</span>
                    <span className="font-mono text-emerald-800 text-sm">{formatPKR(Math.max(0, closingDrawerCash))}</span>
                  </div>
                  <p className="text-stone-500 text-[11px] mt-0.5">
                    Automatically uses yesterday's drawer cash balance as this morning's starting cash float.
                  </p>
                </div>
              </label>

              {/* Option 2: Custom float amount */}
              <label 
                className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  openingOption === 'custom'
                    ? 'bg-emerald-50/70 border-emerald-500 ring-1 ring-emerald-500/20'
                    : 'bg-white border-stone-200 hover:bg-stone-50'
                }`}
              >
                <input
                  type="radio"
                  name="opening-option"
                  checked={openingOption === 'custom'}
                  onChange={() => setOpeningOption('custom')}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="flex-1 text-xs">
                  <div className="font-bold text-stone-900">Specify custom morning opening float</div>
                  <p className="text-stone-500 text-[11px] mt-0.5">
                    For example, if extra cash was deposited into safe and you leave a fixed float of Rs. 10,000 in the drawer.
                  </p>
                  {openingOption === 'custom' && (
                    <div className="mt-2 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-stone-500 text-xs">
                        Rs.
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="e.g. 15000"
                        value={customOpening}
                        onChange={e => setCustomOpening(e.target.value)}
                        className="w-full pl-10 pr-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-bold text-stone-900 focus:border-emerald-600 outline-hidden font-mono"
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              </label>

              {/* Option 3: Reset to zero float */}
              <label 
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  openingOption === 'zero'
                    ? 'bg-emerald-50/70 border-emerald-500 ring-1 ring-emerald-500/20'
                    : 'bg-white border-stone-200 hover:bg-stone-50'
                }`}
              >
                <input
                  type="radio"
                  name="opening-option"
                  checked={openingOption === 'zero'}
                  onChange={() => setOpeningOption('zero')}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="flex-1 text-xs">
                  <span className="font-semibold text-stone-800">Start with Rs. 0 float (empty drawer)</span>
                </div>
              </label>
            </div>
          </div>

          {/* Reassurance Banner */}
          <div className="p-3 bg-emerald-50/80 border border-emerald-200/90 rounded-xl flex items-start gap-2 text-xs text-stone-700">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong className="text-emerald-900 font-bold block">Previous Days' History Remains 100% Intact:</strong>
              All previous sales receipts, invoices, and expenses remain safely preserved in your ledger history. You can jump back to inspect or export any day anytime using the date picker or the 7-day trend chart.
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <CalendarPlus className="w-4 h-4" />
              <span>Start Day ({newDate})</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
