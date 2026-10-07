import React, { useEffect } from 'react';
import { Trash2, AlertTriangle, X, RefreshCw, RotateCcw, Check, SunMedium } from 'lucide-react';
import { formatPKR } from '../utils/exportSpreadsheet';

interface ClearConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClearEverything: () => void;
  onClearTransactionsOnly: () => void;
  onResetOpeningOnly: () => void;
  transactionCount: number;
  openingCash: number;
  onOpenStartNewDay?: () => void;
}

export const ClearConfirmModal: React.FC<ClearConfirmModalProps> = ({
  isOpen,
  onClose,
  onClearEverything,
  onClearTransactionsOnly,
  onResetOpeningOnly,
  transactionCount,
  openingCash,
  onOpenStartNewDay
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      id="modal-clear-confirm"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="clear-modal-title"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden transform transition-all"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div className="p-5 bg-rose-50/70 border-b border-rose-100 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 id="clear-modal-title" className="text-base font-bold text-stone-900">
                Clear Ledger / Data Reset
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Permanently erase local records or perform a factory reset
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 p-1 rounded-lg hover:bg-white/80 transition-colors cursor-pointer"
            title="Cancel and close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current State Summary */}
        <div className="p-5 space-y-3.5">
          {/* Helpful Reassurance & Start New Day Suggestion */}
          {onOpenStartNewDay && (
            <div className="p-3 bg-emerald-50 border border-emerald-200/90 rounded-xl flex items-start gap-2.5 text-xs">
              <SunMedium className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-emerald-950 block">Want to start a new business day?</span>
                <p className="text-[11px] text-emerald-900 leading-relaxed mt-0.5">
                  You <strong>do not</strong> need to clear your ledger! Use <strong>"Start New Day"</strong> to close today's shift, roll over your cash drawer float, and open a clean page while keeping all previous days safely archived.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenStartNewDay();
                  }}
                  className="mt-2 px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                >
                  <SunMedium className="w-3 h-3 text-amber-300" />
                  <span>Open "Start New Day" Dialog Instead</span>
                </button>
              </div>
            </div>
          )}

          <div className="bg-stone-50 rounded-xl p-3 border border-stone-200 text-xs">
            <span className="font-semibold text-stone-500 block mb-1.5 uppercase text-[10px] tracking-wider">
              Current Active Records in Browser:
            </span>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-white p-2 rounded-lg border border-stone-200/80">
                <span className="text-[10px] text-stone-400 block font-medium">Transactions</span>
                <strong className="text-stone-800 text-sm font-bold font-mono">{transactionCount}</strong>
              </div>
              <div className="bg-white p-2 rounded-lg border border-stone-200/80">
                <span className="text-[10px] text-stone-400 block font-medium">Opening Float</span>
                <strong className="text-stone-800 text-sm font-bold font-mono">{formatPKR(openingCash)}</strong>
              </div>
            </div>
          </div>

          <p className="text-xs text-stone-600 leading-relaxed">
            If you truly want to delete data permanently, choose an option below:
          </p>

          {/* Action Options */}
          <div className="space-y-2">
            {/* 1. Clear All (Primary) */}
            <button
              id="btn-confirm-clear-everything"
              type="button"
              onClick={() => {
                onClearEverything();
                onClose();
              }}
              className="w-full p-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-between shadow-xs transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2.5 text-left">
                <Trash2 className="w-4 h-4 text-rose-200 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="font-bold">Factory Reset (Wipe All Data)</div>
                  <div className="text-[11px] font-normal text-rose-100">
                    Permanently deletes all transactions & sets opening float to 0
                  </div>
                </div>
              </div>
              <span className="text-[10px] bg-rose-700 px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
                Wipe All
              </span>
            </button>

            {/* 2. Clear Transactions Only */}
            {transactionCount > 0 && (
              <button
                id="btn-confirm-clear-transactions-only"
                type="button"
                onClick={() => {
                  onClearTransactionsOnly();
                  onClose();
                }}
                className="w-full p-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-3.5 h-3.5 text-stone-600" />
                  <span>Clear Transactions Log Only ({transactionCount} entries)</span>
                </div>
                <span className="text-[10px] text-stone-500 font-normal">Keep float</span>
              </button>
            )}

            {/* 3. Reset Opening Balance Only */}
            {openingCash > 0 && (
              <button
                id="btn-confirm-reset-cash-counts-only"
                type="button"
                onClick={() => {
                  onResetOpeningOnly();
                  onClose();
                }}
                className="w-full p-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 text-stone-600" />
                  <span>Reset Opening Balance Float to Rs. 0</span>
                </div>
                <span className="text-[10px] text-stone-500 font-normal">Keep log</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-stone-50 border-t border-stone-200 flex justify-end">
          <button
            id="btn-cancel-clear-modal"
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
