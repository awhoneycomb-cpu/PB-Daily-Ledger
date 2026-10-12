import React, { useState, useEffect } from 'react';
import { 
  Database, 
  RefreshCw, 
  Download, 
  Upload, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  HardDrive, 
  Cloud, 
  X,
  FileText,
  RotateCcw,
  ExternalLink
} from 'lucide-react';
import { Transaction, VaultDeposit } from '../types';
import { formatPKR } from '../utils/exportSpreadsheet';

interface DataRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  vaultDeposits: VaultDeposit[];
  safeRunningBalance: number;
  safeTransferAmount: number;
  openingCash: number;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onViewAllDates: () => void;
  onRestoreTransactions: (txs: Transaction[]) => void;
  onRestoreFullBackup: (data: any) => void;
  onManualSyncToCloud: () => void;
  isCloudSynced: boolean;
  isSyncing: boolean;
}

export const DataRecoveryModal: React.FC<DataRecoveryModalProps> = ({
  isOpen,
  onClose,
  transactions,
  vaultDeposits,
  safeRunningBalance,
  safeTransferAmount,
  openingCash,
  selectedDate,
  onSelectDate,
  onViewAllDates,
  onRestoreTransactions,
  onRestoreFullBackup,
  onManualSyncToCloud,
  isCloudSynced,
  isSyncing
}) => {
  const [pasteContent, setPasteContent] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [pasteSuccess, setPasteSuccess] = useState<string | null>(null);

  // Storage inspection state
  const [storageInfo, setStorageInfo] = useState<{
    txKeyCount: number;
    backupSnapshotCount: number;
    rawSnapshotData: Transaction[] | null;
    storageUsedKb: number;
  }>({
    txKeyCount: 0,
    backupSnapshotCount: 0,
    rawSnapshotData: null,
    storageUsedKb: 0
  });

  useEffect(() => {
    if (!isOpen) return;
    try {
      let totalBytes = 0;
      for (const key in localStorage) {
        if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
          totalBytes += (localStorage[key].length + key.length) * 2;
        }
      }

      const txRaw = localStorage.getItem('daily_ledger_transactions');
      let txCount = 0;
      if (txRaw) {
        try {
          const parsed = JSON.parse(txRaw);
          if (Array.isArray(parsed)) txCount = parsed.length;
        } catch { /* ignore */ }
      }

      const snapRaw = localStorage.getItem('daily_ledger_backup_snapshot') || localStorage.getItem('daily_ledger_transactions_safe_backup');
      let snapCount = 0;
      let snapData: Transaction[] | null = null;
      if (snapRaw) {
        try {
          const parsed = JSON.parse(snapRaw);
          if (Array.isArray(parsed)) {
            snapCount = parsed.length;
            snapData = parsed;
          }
        } catch { /* ignore */ }
      }

      setStorageInfo({
        txKeyCount: txCount,
        backupSnapshotCount: snapCount,
        rawSnapshotData: snapData,
        storageUsedKb: Math.round(totalBytes / 1024)
      });
    } catch (e) {
      console.error(e);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Group transactions by date
  const dateCounts: Record<string, number> = {};
  transactions.forEach(t => {
    const d = t.date || 'Unknown Date';
    dateCounts[d] = (dateCounts[d] || 0) + 1;
  });
  const sortedDates = Object.entries(dateCounts).sort((a, b) => b[0].localeCompare(a[0]));

  const handleApplySnapshot = () => {
    if (storageInfo.rawSnapshotData && storageInfo.rawSnapshotData.length > 0) {
      onRestoreTransactions(storageInfo.rawSnapshotData);
      setPasteSuccess(`Restored ${storageInfo.rawSnapshotData.length} records from local device snapshot!`);
    }
  };

  const handleParsePastedJson = () => {
    setPasteError(null);
    setPasteSuccess(null);
    if (!pasteContent.trim()) {
      setPasteError('Please paste JSON data first.');
      return;
    }

    try {
      const parsed = JSON.parse(pasteContent.trim());
      if (Array.isArray(parsed)) {
        // Raw array of transactions
        onRestoreTransactions(parsed);
        setPasteSuccess(`Successfully recovered ${parsed.length} transaction entries!`);
        setPasteContent('');
      } else if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.transactions)) {
          onRestoreFullBackup(parsed);
          setPasteSuccess(`Successfully restored full backup with ${parsed.transactions.length} transactions!`);
          setPasteContent('');
        } else {
          setPasteError('JSON does not contain a recognized transactions array.');
        }
      } else {
        setPasteError('Unrecognized JSON structure.');
      }
    } catch (err: any) {
      setPasteError('Invalid JSON format: ' + err.message);
    }
  };

  const handleDownloadEmergencyJson = () => {
    const backupData = {
      version: '3.4',
      exportedAt: new Date().toISOString(),
      currentDate: selectedDate,
      totalTransactions: transactions.length,
      openingCash,
      safeRunningBalance,
      safeTransferAmount,
      vaultDeposits,
      transactions
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Emergency_Ledger_Data_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-stone-900 via-stone-800 to-emerald-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Data Recovery & Diagnostics Center
              </h2>
              <p className="text-xs text-stone-300">
                Inspect local storage, recover dates, and sync between Phone & PC
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-stone-800 text-xs">
          {/* Quick Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
              <div className="flex items-center justify-between text-stone-500 mb-1">
                <span className="font-semibold text-[11px] uppercase tracking-wider">Active Memory</span>
                <HardDrive className="w-4 h-4 text-stone-400" />
              </div>
              <div className="text-lg font-bold text-stone-900">
                {transactions.length} records
              </div>
              <p className="text-[10px] text-stone-500 mt-0.5">
                {vaultDeposits.length} vault deposits • Safe: {formatPKR(safeRunningBalance)}
              </p>
            </div>

            <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl">
              <div className="flex items-center justify-between text-teal-700 mb-1">
                <span className="font-semibold text-[11px] uppercase tracking-wider">Cloud Firestore</span>
                <Cloud className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-lg font-bold text-teal-900 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isCloudSynced ? 'bg-teal-500' : 'bg-amber-400'}`}></span>
                {isCloudSynced ? 'Connected' : 'Connecting...'}
              </div>
              <p className="text-[10px] text-teal-700 mt-0.5">
                Cross-device sync across Phone & PC
              </p>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
              <div className="flex items-center justify-between text-amber-700 mb-1">
                <span className="font-semibold text-[11px] uppercase tracking-wider">Device Storage</span>
                <Database className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-lg font-bold text-amber-900">
                {storageInfo.txKeyCount} in localStorage
              </div>
              <p className="text-[10px] text-amber-700 mt-0.5">
                Snapshot copy: {storageInfo.backupSnapshotCount} entries
              </p>
            </div>
          </div>

          {/* Section 1: Dates Recorded in Memory */}
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-stone-900 flex items-center gap-1.5 text-xs">
                <Calendar className="w-4 h-4 text-emerald-700" />
                <span>Recorded Dates Found in System ({sortedDates.length})</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  onViewAllDates();
                  onClose();
                }}
                className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
              >
                Show All Dates (Full History)
              </button>
            </div>

            {sortedDates.length === 0 ? (
              <div className="p-3 bg-white border border-stone-200 rounded-lg text-stone-500 text-center">
                No transactions currently in memory. Check device backup snapshot or paste a backup below.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                {sortedDates.map(([date, count]) => {
                  const isCurrent = date === selectedDate;
                  return (
                    <div 
                      key={date}
                      className={`p-2.5 rounded-lg border flex items-center justify-between transition-colors ${
                        isCurrent 
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
                          : 'bg-white border-stone-200 hover:border-stone-300 text-stone-800'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs flex items-center gap-1.5">
                          <span>{date}</span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.2 bg-emerald-600 text-white text-[9px] rounded-full font-bold">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-stone-500">
                          {count} transaction{count === 1 ? '' : 's'}
                        </div>
                      </div>
                      {!isCurrent && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectDate(date);
                            onClose();
                          }}
                          className="px-2.5 py-1 bg-stone-100 hover:bg-emerald-700 hover:text-white text-stone-700 rounded-md font-bold text-[10px] transition-colors cursor-pointer"
                        >
                          Switch Date
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Local Storage Device Snapshot Restore */}
          {storageInfo.backupSnapshotCount > 0 && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Found Saved Device Snapshot ({storageInfo.backupSnapshotCount} items)</span>
                </h4>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  A preserved backup was saved on this device. You can restore it immediately.
                </p>
              </div>
              <button
                type="button"
                onClick={handleApplySnapshot}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer shrink-0"
              >
                Restore Snapshot Data
              </button>
            </div>
          )}

          {/* Section 3: Cloud Synchronization Push */}
          <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-teal-900 flex items-center gap-1.5">
                <Cloud className="w-4 h-4 text-teal-600" />
                <span>Force Cloud & Cross-Device Sync</span>
              </h4>
              <p className="text-[11px] text-teal-700 mt-0.5">
                Uploads all current local records to Firestore so they are immediately visible on your phone and PC.
              </p>
            </div>
            <button
              type="button"
              disabled={isSyncing}
              onClick={onManualSyncToCloud}
              className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Push to Cloud'}</span>
            </button>
          </div>

          {/* Section 4: Paste or Emergency Import */}
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-2.5">
            <h4 className="font-bold text-stone-900 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-stone-600" />
              <span>Emergency Data Import & Recovery</span>
            </h4>
            <p className="text-[11px] text-stone-600">
              Paste exported JSON text below to immediately recover all ledger records, safe balances, and cash history.
            </p>

            <textarea
              rows={3}
              value={pasteContent}
              onChange={e => setPasteContent(e.target.value)}
              placeholder='Paste JSON here (e.g. {"transactions": [...]} or [{...}])'
              className="w-full p-2.5 bg-white border border-stone-300 rounded-lg font-mono text-[11px] text-stone-800 focus:outline-hidden focus:border-emerald-500"
            />

            {pasteError && (
              <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-[11px] font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{pasteError}</span>
              </div>
            )}

            {pasteSuccess && (
              <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[11px] font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{pasteSuccess}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleDownloadEmergencyJson}
                className="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Emergency Backup</span>
              </button>

              <button
                type="button"
                onClick={handleParsePastedJson}
                className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Recover from Pasted Text</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-stone-100 border-t border-stone-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};
