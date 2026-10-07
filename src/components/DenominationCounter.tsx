import React, { useState } from 'react';
import { Banknote, RotateCcw, Calculator, Check, AlertCircle, Copy, HelpCircle, Coins, X, Info, Sparkles, Wallet } from 'lucide-react';
import { formatPKR } from '../utils/exportSpreadsheet';

interface DenominationCounterProps {
  denominations: Record<string | number, number>;
  onChangeDenomination: (note: number | 'coins', count: number) => void;
  onReset: () => void;
  expectedDrawerCash: number;
  openingCash?: number;
  onChangeOpeningCash?: (val: number) => void;
}

const NOTES = [5000, 1000, 500, 100, 50, 20, 10];

export const DenominationCounter: React.FC<DenominationCounterProps> = ({
  denominations,
  onChangeDenomination,
  onReset,
  expectedDrawerCash,
  openingCash = 0,
  onChangeOpeningCash
}) => {
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Total in hand calculation: (Sum of all notes) + coins
  const notesTotal = NOTES.reduce((acc, note) => {
    const count = denominations[note] || 0;
    return acc + (note * count);
  }, 0);

  const coinsTotal = denominations['coins'] || 0;
  const totalPhysicalInHand = notesTotal + coinsTotal;

  // Exact variance
  const variance = totalPhysicalInHand - expectedDrawerCash;
  const isExact = Math.abs(variance) === 0;

  const handleCopySummary = () => {
    const breakdown = NOTES
      .filter(note => (denominations[note] || 0) > 0)
      .map(note => `${note} x ${denominations[note]} = Rs. ${(note * (denominations[note] || 0)).toLocaleString()}`)
      .join('\n');
    const coinsLine = coinsTotal > 0 ? `\nLoose Coins: Rs. ${coinsTotal.toLocaleString()}` : '';
    const statusText = isExact
      ? 'BALANCED'
      : variance > 0
      ? `SURPLUS: +Rs. ${variance.toLocaleString()}`
      : `SHORTAGE: -Rs. ${Math.abs(variance).toLocaleString()}`;

    const text = `--- DAILY CASH SLIP ---\nOpening Balance: Rs. ${openingCash.toLocaleString()}\n${breakdown}${coinsLine}\n---------------------------\nTotal Counted in Hand: Rs. ${totalPhysicalInHand.toLocaleString()}\nExpected in Register: Rs. ${expectedDrawerCash.toLocaleString()}\nResult: ${statusText}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="denomination-counter" className="bg-white border border-stone-200 rounded-2xl p-5 md:p-6 shadow-xs mb-6 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-stone-100 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
            <Banknote className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-stone-900 tracking-tight">
                Physical Cash Count (Denomination Slip)
              </h3>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                Physical Cash
              </span>
            </div>
            <p className="text-xs text-stone-500">
              Enter physical banknote & coin quantities in the drawer to verify against ledger sales.
            </p>
          </div>
        </div>

        {/* Action buttons & How It Works */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* How It Works Explainer Toggle */}
          <button
            type="button"
            onClick={() => setShowGuide(true)}
            className="px-2.5 py-1 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-1 border border-emerald-200"
            title="Learn how cash denomination calculations work"
          >
            <HelpCircle className="w-3.5 h-3.5 text-emerald-700" />
            <span>How it Works?</span>
          </button>

          {/* Clear / Reset Denominations button */}
          <button
            id="btn-clear-denominations"
            type="button"
            onClick={onReset}
            className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            title="Clear all note and coin counts to 0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear (0)</span>
          </button>
        </div>
      </div>

      {/* Grid of Note Inputs - 4 columns in 2 rows */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
        {NOTES.map(note => {
          const count = denominations[note] || 0;
          const subtotal = note * count;
          return (
            <div
              key={note}
              className={`p-2.5 rounded-xl border transition-all ${
                count > 0 ? 'bg-emerald-50/50 border-emerald-300 shadow-2xs' : 'bg-stone-50/70 border-stone-200'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold text-stone-700 mb-1">
                <span>Rs. {note}</span>
                <span className="text-[10px] text-stone-400 font-mono">note</span>
              </div>
              
              <div className="my-1">
                <input
                  id={`note-input-${note}`}
                  type="number"
                  min="0"
                  step="1"
                  value={count === 0 ? '' : count}
                  placeholder="0"
                  onChange={e => onChangeDenomination(note, Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-2 py-1 bg-white border border-stone-300 rounded-md text-sm font-bold text-stone-900 text-center focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden"
                />
              </div>

              <div className="text-[11px] font-mono text-stone-600 text-right truncate">
                = {formatPKR(subtotal)}
              </div>
            </div>
          );
        })}

        {/* 8th Box: Coins & Loose Change */}
        <div
          className={`p-2.5 rounded-xl border transition-all ${
            coinsTotal > 0 ? 'bg-amber-50/50 border-amber-300 shadow-2xs' : 'bg-stone-50/70 border-stone-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-stone-700 mb-1">
            <span className="flex items-center gap-1">
              <Coins className="w-3 h-3 text-amber-600" />
              <span>Coins</span>
            </span>
            <span className="text-[10px] text-stone-400">Loose</span>
          </div>
          
          <div className="my-1">
            <input
              id="coins-input"
              type="number"
              min="0"
              step="any"
              value={coinsTotal === 0 ? '' : coinsTotal}
              placeholder="0"
              onChange={e => onChangeDenomination('coins', Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full px-2 py-1 bg-white border border-stone-300 rounded-md text-sm font-bold text-stone-900 text-center focus:border-amber-600 focus:ring-1 focus:ring-amber-600 outline-hidden"
              title="Enter rupee value of coins and small change"
            />
          </div>

          <div className="text-[11px] font-mono text-stone-600 text-right truncate">
            = {formatPKR(coinsTotal)}
          </div>
        </div>
      </div>

      {/* Direct Opening Balance Amount Input Under Denominations */}
      <div className="bg-stone-50/90 border border-stone-200 rounded-xl p-3 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 shrink-0">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <label htmlFor="denomination-opening-cash" className="text-xs font-bold text-stone-900 cursor-pointer">
                Opening Balance Amount
              </label>
            </div>
            <p className="text-[11px] text-stone-500">
              Cash present in drawer at start of day before sales (adds to Expected Drawer balance)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400 select-none">
              Rs.
            </span>
            <input
              id="denomination-opening-cash"
              type="number"
              min="0"
              step="any"
              value={openingCash === 0 ? '' : openingCash}
              placeholder="0"
              onChange={e => onChangeOpeningCash?.(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-32 sm:w-36 pl-8 pr-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-sm font-bold text-stone-900 text-right focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onChangeOpeningCash?.(totalPhysicalInHand)}
              disabled={totalPhysicalInHand === 0}
              className="px-2.5 py-1.5 text-xs font-semibold text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-100 disabled:opacity-40 disabled:pointer-events-none transition-colors shadow-2xs whitespace-nowrap"
              title="Set Opening Balance to equal the physical notes and coins counted above"
            >
              Use Counted
            </button>
            {openingCash > 0 && (
              <button
                id="btn-clear-opening-cash"
                type="button"
                onClick={() => onChangeOpeningCash?.(0)}
                className="px-2 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="Reset opening balance to 0"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Total & Mathematical Reconciliation Bar */}
      <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div>
            <span className="text-stone-500 block text-[11px] font-medium">Physical Cash Counted:</span>
            <strong className="text-lg font-bold text-stone-900">{formatPKR(totalPhysicalInHand)}</strong>
          </div>
          <div className="h-7 w-px bg-stone-200 hidden sm:block"></div>
          <div>
            <span className="text-stone-500 block text-[11px] font-medium">Opening Float:</span>
            <span className="text-sm font-bold text-stone-700">{formatPKR(openingCash)}</span>
          </div>
          <div className="h-7 w-px bg-stone-200 hidden sm:block"></div>
          <div>
            <span className="text-stone-500 block text-[11px] font-medium">Expected in Drawer:</span>
            <span className="text-sm font-bold text-stone-700">{formatPKR(expectedDrawerCash)}</span>
          </div>
          <div className="h-7 w-px bg-stone-200 hidden sm:block"></div>
          <div>
            <span className="text-stone-500 block text-[11px] font-medium">Variance:</span>
            {isExact ? (
              <span className="text-xs font-bold text-emerald-700 inline-flex items-center gap-1 bg-emerald-100 px-2 py-0.5 rounded">
                <Check className="w-3.5 h-3.5" /> Balanced (Rs. 0)
              </span>
            ) : variance > 0 ? (
              <span className="text-xs font-bold text-blue-800 inline-flex items-center gap-1 bg-blue-100 px-2 py-0.5 rounded">
                +{formatPKR(variance)} (Excess)
              </span>
            ) : (
              <span className="text-xs font-bold text-rose-700 inline-flex items-center gap-1 bg-rose-100 px-2 py-0.5 rounded">
                <AlertCircle className="w-3.5 h-3.5" /> -{formatPKR(Math.abs(variance))} (Shortage)
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopySummary}
            className="px-3 py-1.5 text-xs font-semibold text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-100 transition-colors flex items-center gap-1.5 shrink-0 shadow-2xs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-stone-500" />}
            <span>{copied ? 'Copied Slip!' : 'Copy Cash Slip'}</span>
          </button>
        </div>
      </div>

      {/* HOW CASH DENOMINATION CALCULATOR WORKS MODAL / GUIDE */}
      {showGuide && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-stone-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-stone-900 text-base">How Cash Denomination Calculator Works</h4>
                  <p className="text-xs text-stone-500">How physical notes and drawer cash reconcile</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs text-stone-700 max-h-[75vh] overflow-y-auto leading-relaxed">
              <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-start gap-2.5">
                <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-emerald-900 block font-semibold mb-0.5">Purpose:</strong>
                  In daily wholesale & retail shops (like electronics, hardware, general stores), cashiers tally the physical notes in the cash drawer at the end of every shift or day. This calculator eliminates manual paper slips and verifies that no cash is missing.
                </div>
              </div>

              {/* Step by Step Breakdown */}
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-stone-900 text-white font-bold flex items-center justify-center text-xs shrink-0">1</div>
                  <div>
                    <h5 className="font-bold text-stone-900 text-sm">Note-by-Note Multiplication</h5>
                    <p className="text-stone-600 mt-0.5">
                      You enter the count of banknotes for each Pakistani Rupee denomination (Rs. 5,000, 1,000, 500, 100, 50, 20, 10) plus loose coins.
                      The system automatically computes each row's subtotal:
                    </p>
                    <code className="block bg-stone-100 p-2 rounded-lg font-mono text-stone-800 mt-1.5">
                      Note Value × Quantity = Subtotal (e.g. 70 notes of Rs. 100 = Rs. 7,000)
                    </code>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-stone-900 text-white font-bold flex items-center justify-center text-xs shrink-0">2</div>
                  <div>
                    <h5 className="font-bold text-stone-900 text-sm">Theoretical Drawer Cash (The Ledger Math)</h5>
                    <p className="text-stone-600 mt-0.5">
                      The ledger tracks all recorded receipts and expenses throughout the day:
                    </p>
                    <code className="block bg-stone-100 p-2 rounded-lg font-mono text-stone-800 mt-1.5">
                      Expected Drawer Cash = Opening Float + Physical Cash Sales In - Physical Cash Expenses Out
                    </code>
                    <p className="text-stone-500 text-[11px] mt-1">
                      <em>Note:</em> Online bank transfers (Askari Bank, Raast, Nayapay) are excluded from the physical drawer calculation because that money goes directly into the bank account, not the physical cash register.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-stone-900 text-white font-bold flex items-center justify-center text-xs shrink-0">3</div>
                  <div>
                    <h5 className="font-bold text-stone-900 text-sm">Variance & Reconciliation</h5>
                    <p className="text-stone-600 mt-0.5">
                      The calculator compares the counted notes in hand against the expected drawer balance:
                    </p>
                    <code className="block bg-stone-100 p-2 rounded-lg font-mono text-stone-800 mt-1.5">
                      Variance = Counted Cash in Hand - Expected Drawer Cash
                    </code>
                    <ul className="mt-2 space-y-1">
                      <li className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                        <Check className="w-3.5 h-3.5" /> <strong>Variance = 0:</strong> Perfectly Balanced (Exact Match).
                      </li>
                      <li className="flex items-center gap-1.5 text-blue-800 font-semibold">
                        <Sparkles className="w-3.5 h-3.5" /> <strong>Variance &gt; 0:</strong> Surplus (Cash Excess).
                      </li>
                      <li className="flex items-center gap-1.5 text-rose-700 font-semibold">
                        <AlertCircle className="w-3.5 h-3.5" /> <strong>Variance &lt; 0:</strong> Shortage (Cash Deficit).
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Guide modal footer */}
              <div className="pt-2 border-t border-stone-200 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setShowGuide(false)}
                  className="px-5 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-stone-800 transition-colors cursor-pointer"
                >
                  Got It!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

