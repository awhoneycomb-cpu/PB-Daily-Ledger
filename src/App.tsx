import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { StatsOverview } from './components/StatsOverview';
import { IntakeForm } from './components/IntakeForm';
import { OpeningBalanceCard } from './components/OpeningBalanceCard';
import { CashSafeManager } from './components/CashSafeManager';
import { SpreadsheetLedger } from './components/SpreadsheetLedger';
import { TransactionFilterBar, FilterState } from './components/TransactionFilterBar';
import { ClearConfirmModal } from './components/ClearConfirmModal';
import { StartNewDayModal } from './components/StartNewDayModal';
import { NotificationToast, ToastMessage } from './components/NotificationToast';
import { Transaction, VaultDeposit, isInternalTransferTransaction } from './types';
import { INITIAL_STAFF_COUNTERS } from './data/sampleLedger';
import { exportToExcel } from './utils/exportSpreadsheet';

// Helper to get local YYYY-MM-DD
const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Immediate cleanup of any previous demo data from browser storage
(() => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Remove old sample trigger keys
      localStorage.removeItem('sample_data_loaded_v3');
      localStorage.removeItem('sample_data_loaded_v2');
      localStorage.removeItem('sample_data_loaded');

      // Purge demo date if it was set to the sample date
      const savedDate = localStorage.getItem('daily_ledger_date');
      if (savedDate === '2026-09-05') {
        localStorage.removeItem('daily_ledger_date');
      }

      // Purge demo transactions if saved in localStorage
      const savedTx = localStorage.getItem('daily_ledger_transactions');
      if (savedTx) {
        try {
          const parsed: Transaction[] = JSON.parse(savedTx);
          // Keep only real user entries (tx_...) and remove any demo entries (in-*, out-*)
          // Also auto-repair any regular expense that was mistakenly given transferSource: 'drawer' or isInternalTransfer
          const realTx = parsed.filter(t => !t.id.startsWith('in-') && !t.id.startsWith('out-')).map(t => {
            if (t.type === 'cash_out') {
              const cat = (t.category || '').toLowerCase();
              const desc = (t.description || '').toLowerCase();
              const isActualTransfer = 
                cat.includes('transfer to safe') || 
                cat.includes('safe vault') || 
                cat.includes('bank deposit') || 
                cat.includes('internal transfer') ||
                t.transferDestination === 'safe' || 
                t.transferDestination === 'bank' ||
                desc.includes('drawer to safe') ||
                desc.includes('safe to bank') ||
                desc.includes('deposit to bank');

              if (!isActualTransfer && (t.isInternalTransfer || t.transferSource === 'drawer')) {
                return {
                  ...t,
                  isInternalTransfer: false,
                  transferSource: undefined,
                  transferDestination: undefined
                };
              }
            }
            if (t.description && t.description.includes('Meezan Bank')) {
              t.description = t.description.replace(/Meezan Bank/g, 'Askari Bank Ltd.');
            }
            if (t.notes && t.notes.includes('Meezan Bank')) {
              t.notes = t.notes.replace(/Meezan Bank/g, 'Askari Bank Ltd.');
            }
            return t;
          });
          localStorage.setItem('daily_ledger_transactions', JSON.stringify(realTx));
        } catch {
          localStorage.removeItem('daily_ledger_transactions');
        }
      }

      // Purge any legacy denomination storage
      localStorage.removeItem('daily_ledger_denominations');
    }
  } catch (e) {
    console.error('Storage cleanup note:', e);
  }
})();

export default function App() {
  // Current Date State (defaults to today's local date)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    try {
      const savedDate = localStorage.getItem('daily_ledger_date');
      if (savedDate && savedDate !== '2026-09-05') {
        return savedDate;
      }
      return getLocalDateString();
    } catch {
      return getLocalDateString();
    }
  });

  // Morning Opening Cash Float (defaults to 0 or user saved value)
  const [openingCash, setOpeningCash] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('daily_ledger_opening_cash');
      return saved ? parseFloat(saved) || 0 : 0;
    } catch {
      return 0;
    }
  });

  // Per-date opening cash float archive
  const [openingCashByDate, setOpeningCashByDate] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('daily_ledger_opening_cash_by_date');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error reading openingCashByDate from localStorage', e);
    }
    return {};
  });

  const [isStartNewDayOpen, setIsStartNewDayOpen] = useState<boolean>(false);

  // Real-time Transactions: Starts completely clean with NO demo data
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem('daily_ledger_transactions');
      if (saved) {
        const parsed: Transaction[] = JSON.parse(saved);
        // Only load user-created transactions, never demo transactions
        return parsed.filter(t => !t.id.startsWith('in-') && !t.id.startsWith('out-')).map(t => {
          if (t.type === 'cash_out') {
            const cat = (t.category || '').toLowerCase();
            const desc = (t.description || '').toLowerCase();
            const isActualTransfer = 
              cat.includes('transfer to safe') || 
              cat.includes('safe vault') || 
              cat.includes('bank deposit') || 
              cat.includes('internal transfer') ||
              t.transferDestination === 'safe' || 
              t.transferDestination === 'bank' ||
              desc.includes('drawer to safe') ||
              desc.includes('safe to bank') ||
              desc.includes('deposit to bank');

            if (!isActualTransfer && (t.isInternalTransfer || t.transferSource === 'drawer')) {
              return {
                ...t,
                isInternalTransfer: false,
                transferSource: undefined,
                transferDestination: undefined
              };
            }
          }
          if (t.description && t.description.includes('Meezan Bank')) {
            t.description = t.description.replace(/Meezan Bank/g, 'Askari Bank Ltd.');
          }
          if (t.notes && t.notes.includes('Meezan Bank')) {
            t.notes = t.notes.replace(/Meezan Bank/g, 'Askari Bank Ltd.');
          }
          return t;
        });
      }
    } catch (e) {
      console.error('Error reading transactions from localStorage', e);
    }
    return [];
  });

  // Staff / Counters List with persistence
  const [staffList, setStaffList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('daily_ledger_staff');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error reading staff from localStorage', e);
    }
    return INITIAL_STAFF_COUNTERS;
  });

  // Cash Safe (Vault) Balances with persistence
  const [safeRunningBalance, setSafeRunningBalance] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('daily_ledger_safe_running_balance');
      return saved ? Math.max(0, parseFloat(saved) || 0) : 0;
    } catch (e) {
      return 0;
    }
  });

  const [safeTransferAmount, setSafeTransferAmount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('daily_ledger_safe_transfer_amount');
      return saved ? Math.max(0, parseFloat(saved) || 0) : 0;
    } catch (e) {
      return 0;
    }
  });

  // Separate Direct Vault Cash Deposits (Committee, Capital, Bank Withdrawal, etc.)
  const [vaultDeposits, setVaultDeposits] = useState<VaultDeposit[]>(() => {
    try {
      const saved = localStorage.getItem('daily_ledger_vault_deposits');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error reading vault deposits from localStorage', e);
    }
    return [];
  });

  // Modal and Toast States
  const [isClearModalOpen, setIsClearModalOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ id: String(Date.now()), message, type });
  };

  // Save to LocalStorage on changes
  useEffect(() => {
    localStorage.setItem('daily_ledger_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('daily_ledger_staff', JSON.stringify(staffList));
  }, [staffList]);

  useEffect(() => {
    localStorage.setItem('daily_ledger_opening_cash', String(openingCash));
  }, [openingCash]);

  useEffect(() => {
    localStorage.setItem('daily_ledger_safe_running_balance', String(safeRunningBalance));
  }, [safeRunningBalance]);

  useEffect(() => {
    localStorage.setItem('daily_ledger_safe_transfer_amount', String(safeTransferAmount));
  }, [safeTransferAmount]);

  useEffect(() => {
    localStorage.setItem('daily_ledger_vault_deposits', JSON.stringify(vaultDeposits));
  }, [vaultDeposits]);

  useEffect(() => {
    localStorage.setItem('daily_ledger_date', selectedDate);
  }, [selectedDate]);



  useEffect(() => {
    localStorage.setItem('daily_ledger_opening_cash_by_date', JSON.stringify(openingCashByDate));
  }, [openingCashByDate]);

  const currentDayOpeningCash = openingCashByDate[selectedDate] !== undefined 
    ? openingCashByDate[selectedDate] 
    : openingCash;

  const handleSetOpeningCash = (val: number) => {
    setOpeningCash(val);
    setOpeningCashByDate(prev => ({
      ...prev,
      [selectedDate]: val
    }));
  };

  const handleStartNewDay = (newDate: string, newOpeningCash: number) => {
    setSelectedDate(newDate);
    setOpeningCash(newOpeningCash);
    setOpeningCashByDate(prev => ({
      ...prev,
      [newDate]: newOpeningCash
    }));
    setSafeTransferAmount(0);
    setFilters(prev => ({ ...prev, dateScope: 'active_day', startDate: '', endDate: '' }));
    showToast(`Started new day ledger for ${newDate} with Rs. ${newOpeningCash.toLocaleString()} morning float!`, 'success');
  };

  // ==========================================
  // SEARCH & FILTER STATE FOR SPREADSHEET LEDGER
  // ==========================================
  const [filters, setFilters] = useState<FilterState>({
    description: '',
    salesperson: 'all',
    startDate: '',
    endDate: '',
    type: 'all',
    dateScope: 'active_day'
  });

  const handleFilterChange = (updated: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...updated }));
  };

  const handleResetFilters = () => {
    setFilters({
      description: '',
      salesperson: 'all',
      startDate: '',
      endDate: '',
      type: 'all',
      dateScope: 'active_day'
    });
  };

  const hasActiveFilters = Boolean(
    filters.description.trim() ||
    (filters.salesperson && filters.salesperson !== 'all') ||
    filters.startDate ||
    filters.endDate ||
    filters.type !== 'all' ||
    filters.dateScope === 'all'
  );

  // Dynamic list of staff from registered counters and active entries
  const allStaffOptions = useMemo(() => {
    const fromTx = transactions.map(t => t.salesperson).filter(Boolean) as string[];
    return Array.from(new Set([...staffList, ...fromTx]));
  }, [staffList, transactions]);

  // Compute filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // 1. Description search (checks description, particulars, bill#, receipt#, category)
      if (filters.description.trim()) {
        const q = filters.description.trim().toLowerCase();
        const matchDesc = (t.description || '').toLowerCase().includes(q);
        const matchBill = (t.billNumber || '').toLowerCase().includes(q);
        const matchReceipt = ((t.receiptNumber || t.biltyNumber || '')).toLowerCase().includes(q);
        const matchCat = (t.category || '').toLowerCase().includes(q);
        const matchStaff = (t.salesperson || '').toLowerCase().includes(q);
        const matchAmount = String(t.amount).includes(q);
        if (!matchDesc && !matchBill && !matchReceipt && !matchCat && !matchStaff && !matchAmount) {
          return false;
        }
      }

      // 2. Salesperson filter
      if (filters.salesperson && filters.salesperson !== 'all') {
        if (t.salesperson !== filters.salesperson) {
          return false;
        }
      }

      // 3. Date Scoping & Range
      if (filters.startDate && t.date < filters.startDate) {
        return false;
      }
      if (filters.endDate && t.date > filters.endDate) {
        return false;
      }
      if (!filters.startDate && !filters.endDate && filters.dateScope !== 'all') {
        if (t.date !== selectedDate) {
          return false;
        }
      }

      // 4. Transaction Type
      if (filters.type === 'cash_in' && t.type !== 'cash_in') return false;
      if (filters.type === 'cash_out' && t.type !== 'cash_out') return false;
      if (filters.type === 'online' && (t.type !== 'cash_in' || t.paymentMode !== 'online')) return false;
      if (filters.type === 'internal_transfer' && !isInternalTransferTransaction(t)) return false;

      return true;
    });
  }, [transactions, filters, selectedDate]);

  // ==========================================
  // ==========================================
  // RECONCILIATION & ACCOUNTING MATH (MEMOIZED)
  // ==========================================
  
  const { totalPhysicalCashIn, totalPhysicalCashOut, cashInCount, cashOutCount } = useMemo(() => {
    let physicalIn = 0;
    let physicalOut = 0;
    let inCount = 0;
    let outCount = 0;

    for (let i = 0; i < transactions.length; i++) {
      const t = transactions[i];
      // Only count cash entries for the currently selected active working day
      if (t.date !== selectedDate) continue;

      if (t.type === 'cash_in') {
        inCount++;
        // Physical cash actually entering the register drawer:
        // Must be cash, and not a direct vault deposit
        if (t.paymentMode !== 'online' && t.transferDestination !== 'safe') {
          physicalIn += t.amount;
        }
      } else if (t.type === 'cash_out') {
        outCount++;
        // Physical cash actually leaving the register drawer:
        // Must be cash, and must NOT be a direct outflow from the safe vault (like safe-to-bank)
        if (t.paymentMode !== 'online' && t.transferSource !== 'safe') {
          physicalOut += t.amount;
        }
      }
    }

    return {
      totalPhysicalCashIn: physicalIn,
      totalPhysicalCashOut: physicalOut,
      cashInCount: inCount,
      cashOutCount: outCount
    };
  }, [transactions, selectedDate]);

  // 3. Theoretical Physical Cash In Drawer (The Live Cash Register Value for the active day):
  // Formula: Today Opening Float + Physical Cash Received in Drawer - Physical Cash Disbursed from Drawer - Unfinalized Pending Transfer
  const expectedPhysicalDrawer = currentDayOpeningCash + totalPhysicalCashIn - totalPhysicalCashOut - safeTransferAmount;

  // 4. Safe (Vault) Calculations & Actions
  const totalVaultDeposits = useMemo(() => vaultDeposits.reduce((acc, d) => acc + d.amount, 0), [vaultDeposits]);
  const totalSafeCash = safeRunningBalance + safeTransferAmount + totalVaultDeposits;

  // Transfer from Drawer into Safe (Day-end handover)
  const handleTransferDrawerToSafe = (amount: number, reason?: string) => {
    if (amount <= 0) return;
    
    // Credit safe running balance
    setSafeRunningBalance(prev => prev + amount);
    // Clear pending unfinalized safe transfer amount
    setSafeTransferAmount(0);

    const desc = reason?.trim() || 'Day-end cash transfer from drawer to safe';

    const newTx: Omit<Transaction, 'id' | 'createdAt'> = {
      date: selectedDate,
      time: new Date().toTimeString().slice(0, 5),
      type: 'cash_out',
      amount,
      paymentMode: 'cash',
      isInternalTransfer: true,
      transferSource: 'drawer',
      transferDestination: 'safe',
      category: 'Internal Transfer (Drawer ➔ Safe)',
      description: desc,
      salesperson: 'Drawer ➔ Safe',
      verified: true,
      notes: 'Evening cash handover from cash register drawer into safe vault.'
    };

    handleAddTransaction(newTx, true /* skipSafeAdjustment to avoid double-crediting */);
    showToast(`Transferred Rs. ${amount.toLocaleString()} to Safe! Cash register updated.`, 'success');
  };

  const handleCommitTransferToSafe = () => {
    if (safeTransferAmount > 0) {
      handleTransferDrawerToSafe(safeTransferAmount, 'Day-end cash transfer from drawer to safe');
    }
  };

  // Safe to Bank Deposit Action (Cash leaves safe vault into bank)
  // Safe to Bank Deposit Action (Cash leaves safe vault into bank)
  const handleTransferSafeToBank = (amount: number, bankName: string, notes?: string) => {
    if (amount <= 0) return;
    const totalVault = vaultDeposits.reduce((acc, d) => acc + d.amount, 0);
    const totalSafeAvailable = (safeRunningBalance || 0) + (safeTransferAmount || 0) + totalVault;

    if (amount > totalSafeAvailable) {
      showToast(`Cannot deposit Rs. ${amount.toLocaleString()}: Safe balance is only Rs. ${totalSafeAvailable.toLocaleString()}`, 'error');
      return;
    }

    // Deduct smartly across safe funds
    if (amount <= safeRunningBalance) {
      setSafeRunningBalance(prev => prev - amount);
    } else {
      const remainingAfterRunning = amount - safeRunningBalance;
      setSafeRunningBalance(0);
      if (remainingAfterRunning <= safeTransferAmount) {
        setSafeTransferAmount(prev => Math.max(0, prev - remainingAfterRunning));
      } else {
        const remainingAfterTransfer = remainingAfterRunning - safeTransferAmount;
        setSafeTransferAmount(0);
        if (remainingAfterTransfer > 0 && vaultDeposits.length > 0) {
          setVaultDeposits(prev => {
            let rem = remainingAfterTransfer;
            const updated: VaultDeposit[] = [];
            for (const d of prev) {
              if (rem <= 0) {
                updated.push(d);
              } else if (d.amount <= rem) {
                rem -= d.amount;
              } else {
                updated.push({ ...d, amount: d.amount - rem });
                rem = 0;
              }
            }
            return updated;
          });
        }
      }
    }

    const desc = `Cash Deposit from Safe Vault into ${bankName}`;

    // Record as visible transaction in ledger
    const newTx: Omit<Transaction, 'id' | 'createdAt'> = {
      date: selectedDate,
      time: new Date().toTimeString().slice(0, 5),
      type: 'cash_out',
      amount,
      paymentMode: 'online', // Marked as online so physical drawer register is untouched
      isInternalTransfer: true,
      transferSource: 'safe',
      transferDestination: 'bank',
      category: 'Internal Transfer (Safe ➔ Bank)',
      description: desc,
      salesperson: 'Safe Vault',
      receiptNumber: notes?.trim() || undefined,
      biltyNumber: notes?.trim() || undefined,
      verified: true,
      notes: notes?.trim() || `Cash deposited from Safe Vault into ${bankName}`
    };

    handleAddTransaction(newTx, true /* skipSafeAdjustment */);
    showToast(`Deposited Rs. ${amount.toLocaleString()} into ${bankName}! Recorded in ledger.`, 'success');
  };

  // Safe to Drawer Replenishment Action (Cash leaves safe vault into register drawer)
  const handleTransferSafeToDrawer = (amount: number, reason?: string) => {
    if (amount <= 0) return;
    const totalVault = vaultDeposits.reduce((acc, d) => acc + d.amount, 0);
    const totalSafeAvailable = (safeRunningBalance || 0) + (safeTransferAmount || 0) + totalVault;

    if (amount > totalSafeAvailable) {
      showToast(`Cannot transfer Rs. ${amount.toLocaleString()}: Safe balance is only Rs. ${totalSafeAvailable.toLocaleString()}`, 'error');
      return;
    }

    // Deduct smartly across safe funds
    if (amount <= safeRunningBalance) {
      setSafeRunningBalance(prev => prev - amount);
    } else {
      const remainingAfterRunning = amount - safeRunningBalance;
      setSafeRunningBalance(0);
      if (remainingAfterRunning <= safeTransferAmount) {
        setSafeTransferAmount(prev => Math.max(0, prev - remainingAfterRunning));
      } else {
        const remainingAfterTransfer = remainingAfterRunning - safeTransferAmount;
        setSafeTransferAmount(0);
        if (remainingAfterTransfer > 0 && vaultDeposits.length > 0) {
          setVaultDeposits(prev => {
            let rem = remainingAfterTransfer;
            const updated: VaultDeposit[] = [];
            for (const d of prev) {
              if (rem <= 0) {
                updated.push(d);
              } else if (d.amount <= rem) {
                rem -= d.amount;
              } else {
                updated.push({ ...d, amount: d.amount - rem });
                rem = 0;
              }
            }
            return updated;
          });
        }
      }
    }

    const desc = reason?.trim() || 'Cash Transfer from Safe to Drawer (Float Replenishment)';

    const newTx: Omit<Transaction, 'id' | 'createdAt'> = {
      date: selectedDate,
      time: new Date().toTimeString().slice(0, 5),
      type: 'cash_in',
      amount,
      paymentMode: 'cash',
      isInternalTransfer: true,
      transferSource: 'safe',
      transferDestination: 'drawer',
      category: 'Internal Transfer (Safe ➔ Drawer)',
      description: desc,
      salesperson: 'Safe Vault',
      verified: true,
      notes: 'Internal cash transfer from Safe to replenish drawer float.'
    };

    handleAddTransaction(newTx, true /* skipSafeAdjustment */);
    showToast(`Transferred Rs. ${amount.toLocaleString()} from Safe into Cash Drawer!`, 'success');
  };

  // Drawer to Bank Deposit Action (Cash leaves register drawer directly into bank)
  const handleTransferDrawerToBank = (amount: number, bankName: string, notes?: string) => {
    if (amount <= 0) return;
    if (amount > expectedPhysicalDrawer) {
      showToast(`Cannot deposit Rs. ${amount.toLocaleString()}: Drawer cash is only Rs. ${expectedPhysicalDrawer.toLocaleString()}`, 'error');
      return;
    }

    const desc = `Cash Deposit from Drawer into ${bankName}`;

    const newTx: Omit<Transaction, 'id' | 'createdAt'> = {
      date: selectedDate,
      time: new Date().toTimeString().slice(0, 5),
      type: 'cash_out',
      amount,
      paymentMode: 'cash', // Physical cash leaving the drawer
      isInternalTransfer: true,
      transferSource: 'drawer',
      transferDestination: 'bank',
      category: 'Bank Deposit (From Drawer)',
      description: desc,
      salesperson: 'Drawer ➔ Bank',
      receiptNumber: notes?.trim() || undefined,
      biltyNumber: notes?.trim() || undefined,
      verified: true,
      notes: notes?.trim() || `Cash deposited directly from cash register drawer into ${bankName}`
    };

    handleAddTransaction(newTx, true /* skipSafeAdjustment */);
    showToast(`Deposited Rs. ${amount.toLocaleString()} from Drawer into ${bankName}! Cash register updated.`, 'success');
  };

  const handleDeductFromSafe = (amount: number): boolean => {
    if (amount <= 0) return false;
    setSafeRunningBalance(prev => Math.max(0, prev - amount));
    return true;
  };

  const handleAddVaultDeposit = (deposit: Omit<VaultDeposit, 'id' | 'createdAt'>) => {
    const newDep: VaultDeposit = {
      ...deposit,
      id: 'vdep_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      createdAt: Date.now()
    };
    setVaultDeposits(prev => [newDep, ...prev]);
  };

  const handleDeleteVaultDeposit = (id: string) => {
    setVaultDeposits(prev => prev.filter(d => d.id !== id));
  };

  const handleConsolidateVaultDeposits = () => {
    setVaultDeposits([]);
    localStorage.removeItem('daily_ledger_vault_deposits');
  };

  // Ledger Handlers
  const handleAddTransaction = (newTx: Omit<Transaction, 'id' | 'createdAt'>, skipSafeAdjustment = false) => {
    const txWithMeta: Transaction = {
      ...newTx,
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      createdAt: Date.now()
    };
    setTransactions(prev => [txWithMeta, ...prev]);

    // If new staff salesperson is provided and not in staffList, add it automatically
    if (txWithMeta.salesperson && !staffList.includes(txWithMeta.salesperson) && !txWithMeta.isInternalTransfer) {
      setStaffList(prev => [...prev, txWithMeta.salesperson!]);
    }

    // If this is a drawer-to-safe transfer added via intake form without explicit handler:
    if (!skipSafeAdjustment) {
      if (txWithMeta.type === 'cash_out' && (txWithMeta.transferDestination === 'safe' || txWithMeta.category?.toLowerCase().includes('safe'))) {
        setSafeRunningBalance(prev => prev + txWithMeta.amount);
      }
    }
  };

  const handleDeleteTransaction = (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (tx && (tx.isInternalTransfer || isInternalTransferTransaction(tx))) {
      if (tx.type === 'cash_in' && (tx.transferSource === 'safe' || tx.description.toLowerCase().includes('safe'))) {
        // Safe to drawer being removed: return cash back to safe
        setSafeRunningBalance(prev => prev + tx.amount);
      } else if (tx.type === 'cash_out' && (tx.transferDestination === 'safe' || tx.category?.toLowerCase().includes('safe') || tx.description.toLowerCase().includes('safe'))) {
        // Drawer to safe being removed: take cash out of safe back to drawer
        setSafeRunningBalance(prev => Math.max(0, prev - tx.amount));
      } else if (tx.type === 'cash_out' && (tx.transferDestination === 'bank' || tx.description.toLowerCase().includes('bank')) && tx.transferSource === 'safe') {
        // Safe to bank being removed: return cash back into safe
        setSafeRunningBalance(prev => prev + tx.amount);
      }
    }
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const handleUpdateTransaction = (id: string, updates: Partial<Transaction>) => {
    setTransactions(prev =>
      prev.map(t => (t.id === id ? { ...t, ...updates } : t))
    );
    showToast('Transaction updated successfully.', 'success');
  };

  // Populate sample 7-day past transactions for instant trend visualization
  const handleLoadSampleHistory = () => {
    const today = new Date();
    const demoTx: Transaction[] = [];
    const sampleStaff = ['Abdullah', 'Ishtiaq', 'Ilyas', 'Tayab Electric'];

    for (let dayOffset = 6; dayOffset >= 1; dayOffset--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dayOffset, 12, 0, 0);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;

      const staff1 = sampleStaff[(dayOffset * 2) % sampleStaff.length];
      const staff2 = sampleStaff[(dayOffset * 2 + 1) % sampleStaff.length];
      const saleAmount1 = 15000 + (dayOffset * 3800);
      const saleAmount2 = 22000 + (dayOffset * 4500);

      demoTx.push({
        id: `tx_demo_${Date.now()}_${dayOffset}_1`,
        date: dateStr,
        time: '11:30',
        type: 'cash_in',
        amount: saleAmount1,
        salesperson: staff1,
        paymentMode: 'cash',
        billNumber: String(3000 + dayOffset * 10 + 1),
        description: `${staff1} Counter Sales`,
        createdAt: Date.now() - dayOffset * 86400000
      });

      demoTx.push({
        id: `tx_demo_${Date.now()}_${dayOffset}_2`,
        date: dateStr,
        time: '15:45',
        type: 'cash_in',
        amount: saleAmount2,
        salesperson: staff2,
        paymentMode: dayOffset % 2 === 0 ? 'online' : 'cash',
        billNumber: String(3000 + dayOffset * 10 + 2),
        description: `${staff2} Counter Sales`,
        createdAt: Date.now() - dayOffset * 86400000 + 3600000
      });

      const expAmount = 2500 + (dayOffset * 900);
      const expCategory = dayOffset % 3 === 0 ? 'Freight & Cargo' : dayOffset % 3 === 1 ? 'Office & Refreshment' : 'Fuel & Travel';
      demoTx.push({
        id: `tx_demo_${Date.now()}_${dayOffset}_3`,
        date: dateStr,
        time: '14:15',
        type: 'cash_out',
        amount: expAmount,
        category: expCategory,
        paymentMode: 'cash',
        description: `${expCategory} daily disbursement`,
        verified: true,
        createdAt: Date.now() - dayOffset * 86400000 + 7200000
      });
    }

    setTransactions(prev => [...demoTx, ...prev]);
    showToast('Loaded 7-day past transaction history! Trend chart updated.', 'success');
  };

  const handleToggleVerified = (id: string) => {
    setTransactions(prev =>
      prev.map(t => (t.id === id ? { ...t, verified: !t.verified } : t))
    );
  };

  const handleAddStaff = (name: string) => {
    if (!staffList.includes(name)) {
      setStaffList(prev => [...prev, name]);
    }
  };

  // Open modal for clear confirmation
  const handleOpenClearModal = () => {
    setIsClearModalOpen(true);
  };

  // Clear everything for a fresh real-time day / shift
  const handleClearEverything = () => {
    setTransactions([]);
    setOpeningCash(0);
    setSafeTransferAmount(0);
    setVaultDeposits([]);
    setSelectedDate(getLocalDateString());
    localStorage.removeItem('daily_ledger_transactions');
    localStorage.removeItem('daily_ledger_opening_cash');
    localStorage.removeItem('daily_ledger_safe_transfer_amount');
    localStorage.removeItem('daily_ledger_vault_deposits');
    showToast('Ledger cleared completely for a fresh shift!', 'success');
  };

  // Clear only transaction records
  const handleClearTransactionsOnly = () => {
    setTransactions([]);
    localStorage.removeItem('daily_ledger_transactions');
    showToast('All transaction records cleared.', 'success');
  };

  // Reset opening balance float
  const handleResetOpeningOnly = () => {
    setOpeningCash(0);
    localStorage.removeItem('daily_ledger_opening_cash');
    showToast('Opening balance float reset to Rs. 0.', 'success');
  };

  // Download Multi-Tab Excel Spreadsheet (.xlsx)
  const handleExportExcel = () => {
    const exportSet = hasActiveFilters ? filteredTransactions : transactions;
    exportToExcel(
      exportSet, 
      selectedDate, 
      expectedPhysicalDrawer, 
      openingCash, 
      undefined, 
      {
        safeRunningBalance,
        safeTransferAmount,
        totalSafeCash,
        vaultDepositsTotal: totalVaultDeposits,
        vaultDeposits
      }
    );
    showToast(
      hasActiveFilters
        ? `Excel (.xlsx) downloaded with ${exportSet.length} filtered entries.`
        : 'Excel workbook (.xlsx) downloaded successfully.',
      'success'
    );
  };

  // Download Permanent JSON Backup
  const handleBackupJson = () => {
    const backupData = {
      version: '3.3',
      exportedAt: new Date().toISOString(),
      date: selectedDate,
      openingCash,
      safeRunningBalance,
      safeTransferAmount,
      vaultDeposits,
      transactions,
      staffList
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ledger_Backup_${selectedDate}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
    showToast(`Ledger backup saved: Ledger_Backup_${selectedDate}.json`, 'success');
  };

  // Restore from JSON Backup
  const handleRestoreJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text);
        if (Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
          if (typeof data.openingCash === 'number') setOpeningCash(data.openingCash);
          if (typeof data.safeRunningBalance === 'number') setSafeRunningBalance(data.safeRunningBalance);
          if (typeof data.safeTransferAmount === 'number') setSafeTransferAmount(data.safeTransferAmount);
          if (Array.isArray(data.vaultDeposits)) setVaultDeposits(data.vaultDeposits);
          if (data.date) setSelectedDate(data.date);
          if (Array.isArray(data.staffList)) setStaffList(data.staffList);
          showToast(`Successfully restored ledger backup from ${file.name}! (${data.transactions.length} entries)`, 'success');
        } else {
          showToast('Invalid backup file structure.', 'error');
        }
      } catch (err: any) {
        showToast('Could not read backup file: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-stone-100/70 text-stone-900 font-sans antialiased pb-12">
      {/* Header */}
      <Header
        selectedDate={selectedDate}
        onChangeDate={setSelectedDate}
        onClearAll={handleOpenClearModal}
        onExportExcel={handleExportExcel}
        onBackupJson={handleBackupJson}
        onRestoreJson={handleRestoreJson}
        onOpenStartNewDay={() => setIsStartNewDayOpen(true)}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-5">
        {/* Real-time Summary Cards & Cash Flow Historical Trends Chart */}
        <StatsOverview
          transactions={transactions}
          openingCash={currentDayOpeningCash}
          onChangeOpeningCash={handleSetOpeningCash}
          selectedDate={selectedDate}
          totalSafeCash={totalSafeCash}
          expectedDrawerCash={expectedPhysicalDrawer}
          safeTransferAmount={safeTransferAmount}
          onChangeDate={setSelectedDate}
          onLoadSampleHistory={handleLoadSampleHistory}
        />

        {/* Top Operational Section: Intake Form + Direct Opening Balance Slot */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6">
          {/* Data Intake Form */}
          <div className="lg:col-span-8">
            <IntakeForm
              onAddTransaction={handleAddTransaction}
              staffList={staffList}
              onAddStaff={handleAddStaff}
              selectedDate={selectedDate}
              cashInCount={cashInCount}
              cashOutCount={cashOutCount}
              safeRunningBalance={safeRunningBalance}
              onDeductFromSafe={handleDeductFromSafe}
            />
          </div>

          {/* Direct Opening Balance Slot */}
          <div className="lg:col-span-4">
            <OpeningBalanceCard
              openingCash={currentDayOpeningCash}
              onChangeOpeningCash={handleSetOpeningCash}
              todayCashIn={totalPhysicalCashIn}
              todayCashOut={totalPhysicalCashOut}
              expectedDrawerCash={expectedPhysicalDrawer}
            />
          </div>
        </div>

        {/* Cash Safe & Vault Manager Area (After Closing & Direct Deposits) */}
        <CashSafeManager
          safeRunningBalance={safeRunningBalance}
          onChangeSafeRunningBalance={setSafeRunningBalance}
          safeTransferAmount={safeTransferAmount}
          onChangeSafeTransferAmount={setSafeTransferAmount}
          vaultDeposits={vaultDeposits}
          onAddVaultDeposit={handleAddVaultDeposit}
          onDeleteVaultDeposit={handleDeleteVaultDeposit}
          onConsolidateVaultDeposits={handleConsolidateVaultDeposits}
          expectedDrawerCash={expectedPhysicalDrawer}
          openingCash={currentDayOpeningCash}
          selectedDate={selectedDate}
          onCommitTransferToSafe={handleCommitTransferToSafe}
          onTransferDrawerToSafe={handleTransferDrawerToSafe}
          onTransferSafeToDrawer={handleTransferSafeToDrawer}
          onTransferSafeToBank={handleTransferSafeToBank}
          onTransferDrawerToBank={handleTransferDrawerToBank}
          transactions={transactions}
          onDeleteTransaction={handleDeleteTransaction}
          onShowToast={showToast}
        />

        {/* Search & Filter Bar above SpreadsheetLedger */}
        <TransactionFilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
          staffList={allStaffOptions}
          totalTransactionsCount={transactions.length}
          filteredTransactionsCount={filteredTransactions.length}
          selectedDate={selectedDate}
          onOpenStartNewDay={() => setIsStartNewDayOpen(true)}
        />

        {/* Core Real-Time Spreadsheet Ledger View */}
        <SpreadsheetLedger
          transactions={filteredTransactions}
          totalAllCount={transactions.length}
          isFiltered={hasActiveFilters}
          onResetFilters={handleResetFilters}
          onDeleteTransaction={handleDeleteTransaction}
          onToggleVerified={handleToggleVerified}
          onUpdateTransaction={handleUpdateTransaction}
          selectedDate={selectedDate}
          dateRangeText={
            filters.startDate && filters.endDate
              ? `${filters.startDate} to ${filters.endDate}`
              : filters.startDate
              ? `From ${filters.startDate}`
              : filters.endDate
              ? `Up to ${filters.endDate}`
              : filters.dateScope === 'all'
              ? 'All Recorded Dates'
              : undefined
          }
          onChangeDate={setSelectedDate}
          staffList={allStaffOptions}
          drawerCashInHand={expectedPhysicalDrawer}
          openingCash={currentDayOpeningCash}
        />
      </main>

      {/* Start New Day Rollover Modal */}
      <StartNewDayModal
        isOpen={isStartNewDayOpen}
        onClose={() => setIsStartNewDayOpen(false)}
        currentDate={selectedDate}
        closingDrawerCash={expectedPhysicalDrawer}
        safeRunningBalance={safeRunningBalance}
        onStartNewDay={handleStartNewDay}
      />

      {/* In-App Clear Confirmation Modal */}
      <ClearConfirmModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onClearEverything={handleClearEverything}
        onClearTransactionsOnly={handleClearTransactionsOnly}
        onResetOpeningOnly={handleResetOpeningOnly}
        transactionCount={transactions.length}
        openingCash={currentDayOpeningCash}
        onOpenStartNewDay={() => setIsStartNewDayOpen(true)}
      />

      {/* Non-blocking Notification Toast */}
      <NotificationToast
        toast={toast}
        onDismiss={() => setToast(null)}
      />
    </div>
  );
}
