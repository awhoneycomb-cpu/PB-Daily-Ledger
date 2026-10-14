import React, { useState } from 'react';
import { Wallet, Plus, RotateCcw, ArrowRight, DollarSign, Check } from 'lucide-react';
import { formatPKR } from '../utils/exportSpreadsheet';

interface OpeningBalanceCardProps {
  openingCash: number;
  onChangeOpeningCash: (val: number) => void;
  todayCashIn: number;
  todayCashOut: number;
  expectedDrawerCash: number;
}

export const OpeningBalanceCard: React.FC<OpeningBalanceCardProps> = ({
  openingCash,
  onChangeOpeningCash,
  todayCashIn,
  todayCashOut,
  expectedDrawerCash
}) => {
  const [inputValue, setInputValue] = useState<string>(openingCash > 0 ? String(openingCash) : '');
  const [isSavedRecently, setIsSavedRecently] = useState<boolean>(false);

  // Sync if prop changes externally (e.g. from restore or reset)
  React.useEffect(() => {
    setInputValue(openingCash > 0 ? String(openingCash) : '');
  }, [openingCash]);

  const handleInputChange = (val: string) => {
    setInputValue(val);
    const parsed = Math.max(0, parseFloat(val) || 0);
    onChangeOpeningCash(parsed);
    triggerSavedFeedback();
  };

  const handleQuickAdd = (addAmount: number) => {
    const nextVal = (openingCash || 0) + addAmount;
    setInputValue(String(nextVal));
    onChangeOpeningCash(nextVal);
    triggerSavedFeedback();
  };

  const handleClear = () => {
    setInputValue('');
    onChangeOpeningCash(0);
    triggerSavedFeedback();
  };

  const triggerSavedFeedback = () => {
    setIsSavedRecently(true);
    setTimeout(() => setIsSavedRecently(false), 1500);
  };

  const netPhysicalFlow = todayCashIn - todayCashOut;

  return (
    <div 
      id="opening-balance-card" 
      className="bg-white border border-stone-200 rounded-2xl p-5 md:p-6 shadow-xs h-full flex flex-col justify-between"
    >
      <div>
        {/* Header */}
        <div className="flex items-start justify-between pb-3.5 border-b border-stone-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-stone-900 tracking-tight">
                  Opening Balance
                </h3>
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                  Morning Float
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Starting drawer cash before today&apos;s sales.
              </p>
            </div>
          </div>

          {openingCash > 0 && (
            <button
              id="btn-clear-opening-balance"
              type="button"
              onClick={handleClear}
              className="text-xs font-semibold text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1"
              title="Reset opening balance to 0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Direct Input Slot */}
        <div className="mb-4">
          <label 
            htmlFor="input-opening-balance-direct" 
            className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5"
          >
            Direct Opening Balance Amount (PKR)
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-stone-400 select-none">
              Rs.
            </span>
            <input
              id="input-opening-balance-direct"
              type="number"
              min="0"
              step="any"
              value={inputValue}
              placeholder="0"
              onChange={e => handleInputChange(e.target.value)}
              className="w-full pl-11 pr-12 py-3 bg-stone-50 border border-stone-300 rounded-xl text-xl font-bold font-mono text-stone-900 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden transition-all shadow-2xs"
            />
            {isSavedRecently && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-emerald-600 flex items-center gap-0.5 bg-emerald-50 px-2 py-0.5 rounded">
                <Check className="w-3.5 h-3.5" />
                <span>Saved</span>
              </span>
            )}
          </div>
        </div>

        {/* Quick Add Presets */}
        <div className="mb-5">
          <span className="text-[11px] font-semibold text-stone-500 block mb-1.5">
            Quick Add / Adjust:
          </span>
          <div className="grid grid-cols-4 gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => handleQuickAdd(1000)}
              className="px-2 py-1.5 bg-stone-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-stone-200 rounded-lg font-bold text-stone-700 transition-colors cursor-pointer text-center"
            >
              +1,000
            </button>
            <button
              type="button"
              onClick={() => handleQuickAdd(5000)}
              className="px-2 py-1.5 bg-stone-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-stone-200 rounded-lg font-bold text-stone-700 transition-colors cursor-pointer text-center"
            >
              +5,000
            </button>
            <button
              type="button"
              onClick={() => handleQuickAdd(10000)}
              className="px-2 py-1.5 bg-stone-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-stone-200 rounded-lg font-bold text-stone-700 transition-colors cursor-pointer text-center"
            >
              +10,000
            </button>
            <button
              type="button"
              onClick={() => handleQuickAdd(20000)}
              className="px-2 py-1.5 bg-stone-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-stone-200 rounded-lg font-bold text-stone-700 transition-colors cursor-pointer text-center"
            >
              +20,000
            </button>
          </div>
        </div>
      </div>

      {/* Live Balance Summary Calculation */}
      <div className="p-3.5 bg-emerald-50/60 border border-emerald-200/80 rounded-xl text-xs space-y-1.5">
        <div className="flex items-center justify-between text-stone-600">
          <span>Starting Float:</span>
          <strong className="font-mono text-stone-900">{formatPKR(openingCash)}</strong>
        </div>
        <div className="flex items-center justify-between text-stone-600">
          <span className="flex items-center gap-1 text-[11px]">
            <span className="text-emerald-700 font-bold">+</span>
            <span>Drawer Cash In (Sales & Injections):</span>
          </span>
          <strong className="font-mono text-emerald-700">+{formatPKR(todayCashIn)}</strong>
        </div>
        <div className="flex items-center justify-between text-stone-600">
          <span className="flex items-center gap-1 text-[11px]">
            <span className="text-amber-700 font-bold">-</span>
            <span>Drawer Cash Out (Expenses & Transfers):</span>
          </span>
          <strong className="font-mono text-amber-800">-{formatPKR(todayCashOut)}</strong>
        </div>
        <div className="flex items-center justify-between text-stone-600 pt-1 border-t border-emerald-200/60 text-[11px]">
          <span>Net Drawer Flow:</span>
          <strong className={`font-mono ${netPhysicalFlow >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
            {netPhysicalFlow >= 0 ? '+' : ''}{formatPKR(netPhysicalFlow)}
          </strong>
        </div>
        <div className="pt-2 border-t border-emerald-200 flex items-center justify-between font-bold text-stone-900">
          <div>
            <span className="block text-xs">Expected Register Cash:</span>
            <span className="block text-[10px] text-stone-500 font-normal">Float + In - Out</span>
          </div>
          <span className="font-mono text-sm text-emerald-800 bg-white px-2.5 py-1 rounded-lg border border-emerald-300 shadow-2xs font-bold">
            {formatPKR(expectedDrawerCash)}
          </span>
        </div>
        <p className="text-[10px] text-stone-500 italic pt-1 border-t border-emerald-100">
          💡 <strong>Register Till Note:</strong> Only physical cash paid from the drawer is deducted here. Online bank transfers and Safe vault disbursements do not deplete the cash drawer.
        </p>
      </div>
    </div>
  );
};
