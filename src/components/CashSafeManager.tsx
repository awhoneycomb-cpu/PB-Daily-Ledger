import React, { useState, useId } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  ArrowDownToLine, 
  ArrowUpRight,
  Check, 
  RotateCcw, 
  Wallet, 
  AlertCircle,
  Plus,
  Trash2,
  Coins,
  Landmark,
  Briefcase,
  Handshake,
  FileText,
  Layers,
  Sparkles,
  History,
  ArrowRight,
  User,
  UserCheck
} from 'lucide-react';
import { VaultDeposit, VaultDepositCategory, Transaction } from '../types';
import { formatPKR } from '../utils/exportSpreadsheet';

interface CashSafeManagerProps {
  safeRunningBalance: number;
  onChangeSafeRunningBalance: (val: number, date?: string, time?: string) => void;
  safeRunningBalanceDate?: string;
  safeRunningBalanceTime?: string;
  onChangeSafeRunningBalanceDate?: (date: string) => void;
  safeTransferAmount: number;
  onChangeSafeTransferAmount: (val: number) => void;
  vaultDeposits: VaultDeposit[];
  onAddVaultDeposit: (deposit: Omit<VaultDeposit, 'id' | 'createdAt'>) => void;
  onDeleteVaultDeposit: (id: string) => void;
  onConsolidateVaultDeposits?: () => void;
  expectedDrawerCash: number;
  openingCash: number;
  selectedDate: string;
  onCommitTransferToSafe?: () => void;
  onTransferSafeToDrawer?: (amount: number, reason: string) => void;
  onTransferDrawerToSafe?: (amount: number, reason?: string) => void;
  onTransferSafeToBank?: (amount: number, bankName: string, notes?: string) => void;
  onTransferDrawerToBank?: (amount: number, bankName: string, notes?: string) => void;
  onTransferSafeToIndividual?: (amount: number, recipient: string, reason: string, receiptNumber?: string, notes?: string) => void;
  staffList?: string[];
  transactions?: Transaction[];
  dailyDrawerHandovers?: Record<string, number>;
  onDeleteTransaction?: (id: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

const VAULT_CATEGORIES: Array<{
  category: VaultDepositCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  colorClass: string;
  badgeClass: string;
}> = [
  {
    category: 'committee',
    label: 'Committee (Kameti)',
    icon: Handshake,
    description: 'Chit-fund / Kameti payout or monthly collection',
    colorClass: 'text-amber-700 bg-amber-50 border-amber-200 hover:border-amber-400',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200'
  },
  {
    category: 'capital',
    label: 'Owner Capital / Equity',
    icon: Briefcase,
    description: 'Personal owner savings or cash injection into business',
    colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:border-emerald-400',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200'
  },
  {
    category: 'bank_withdrawal',
    label: 'Bank Cash Withdrawal',
    icon: Landmark,
    description: 'Cash brought from company/personal bank account',
    colorClass: 'text-blue-700 bg-blue-50 border-blue-200 hover:border-blue-400',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  {
    category: 'bank_deposit',
    label: 'Deposit Safe Cash to Bank',
    icon: Landmark,
    description: 'Cash taken out of safe vault and deposited in bank account',
    colorClass: 'text-indigo-700 bg-indigo-50 border-indigo-200 hover:border-indigo-400',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200'
  },
  {
    category: 'drawer_handover',
    label: 'Drawer Closing Handover',
    icon: ArrowDownToLine,
    description: 'Closing day-end cash handed over from drawer to safe',
    colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:border-emerald-400',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200'
  },
  {
    category: 'advance_security',
    label: 'Customer Advance / Security',
    icon: ShieldCheck,
    description: 'Holding deposit, guarantee, or advance cash',
    colorClass: 'text-purple-700 bg-purple-50 border-purple-200 hover:border-purple-400',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200'
  },
  {
    category: 'other',
    label: 'Other Direct Deposit',
    icon: Coins,
    description: 'Supplier refund, asset sale, or miscellaneous cash',
    colorClass: 'text-stone-700 bg-stone-100 border-stone-200 hover:border-stone-400',
    badgeClass: 'bg-stone-200 text-stone-800 border-stone-300'
  }
];

export const CashSafeManager: React.FC<CashSafeManagerProps> = ({
  safeRunningBalance,
  onChangeSafeRunningBalance,
  safeRunningBalanceDate,
  safeRunningBalanceTime,
  onChangeSafeRunningBalanceDate,
  safeTransferAmount,
  onChangeSafeTransferAmount,
  vaultDeposits,
  onAddVaultDeposit,
  onDeleteVaultDeposit,
  onConsolidateVaultDeposits,
  expectedDrawerCash,
  openingCash,
  selectedDate,
  onCommitTransferToSafe,
  onTransferSafeToDrawer,
  onTransferDrawerToSafe,
  onTransferSafeToBank,
  onTransferDrawerToBank,
  onTransferSafeToIndividual,
  staffList = [],
  transactions = [],
  dailyDrawerHandovers = {},
  onDeleteTransaction,
  onShowToast
}) => {
  const depositAmountInputId = useId();
  const [runningInput, setRunningInput] = useState<string>(
    safeRunningBalance > 0 ? String(safeRunningBalance) : ''
  );
  const [transferInput, setTransferInput] = useState<string>(
    safeTransferAmount > 0 ? String(safeTransferAmount) : ''
  );
  const [isSavedRecently, setIsSavedRecently] = useState<boolean>(false);

  // Date and Time when Safe Running Balance was added / effective
  const [balanceDateInput, setBalanceDateInput] = useState<string>(() => {
    return safeRunningBalanceDate || selectedDate || new Date().toISOString().split('T')[0];
  });

  React.useEffect(() => {
    if (safeRunningBalanceDate) {
      setBalanceDateInput(safeRunningBalanceDate);
    }
  }, [safeRunningBalanceDate]);

  // Search filter for safe audit trail (can search amounts like 2195000, 2262000, dates, or notes)
  const [safeSearchQuery, setSafeSearchQuery] = useState<string>('');

  // Transfer Direction in Container 2: Drawer -> Safe vs Safe -> Drawer vs Safe -> Bank vs Safe -> Individual
  const [activeTransferDirection, setActiveTransferDirection] = useState<'drawer_to_safe' | 'safe_to_drawer' | 'safe_to_bank' | 'safe_to_person'>('drawer_to_safe');
  
  // Drawer to Safe state
  const [drawerToSafeReason, setDrawerToSafeReason] = useState<string>('Day-End Cash Handover to Safe');

  // Safe to Drawer state
  const [safeToDrawerInput, setSafeToDrawerInput] = useState<string>('');
  const [safeToDrawerReason, setSafeToDrawerReason] = useState<string>('Morning Float Replenishment');

  // Safe to Individual (Person) state
  const [safeToPersonAmount, setSafeToPersonAmount] = useState<string>('');
  const [safeToPersonRecipient, setSafeToPersonRecipient] = useState<string>('');
  const [safeToPersonReason, setSafeToPersonReason] = useState<string>('Partner / Owner Drawing');
  const [safeToPersonReceipt, setSafeToPersonReceipt] = useState<string>('');
  const [safeToPersonNotes, setSafeToPersonNotes] = useState<string>('');

  // Bank Deposit state: choose source (Safe vs Drawer)
  const [bankDepositSource, setBankDepositSource] = useState<'safe' | 'drawer'>('safe');
  const [safeToBankAmount, setSafeToBankAmount] = useState<string>('');
  const [safeToBankName, setSafeToBankName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('daily_ledger_bank_name');
      if (saved && saved !== 'Meezan Bank') return saved;
      return 'Askari Bank Ltd.';
    } catch {
      return 'Askari Bank Ltd.';
    }
  });
  const [safeToBankNotes, setSafeToBankNotes] = useState<string>('');
  const [showInsufficientHelp, setShowInsufficientHelp] = useState<boolean>(false);

  React.useEffect(() => {
    try {
      localStorage.setItem('daily_ledger_bank_name', safeToBankName);
    } catch (e) {
      console.error(e);
    }
  }, [safeToBankName]);

  // New Deposit Form State with explicit Date field
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [depositCategory, setDepositCategory] = useState<VaultDepositCategory>('committee');
  const [depositNotes, setDepositNotes] = useState<string>('');
  const [depositDate, setDepositDate] = useState<string>(() => {
    return selectedDate || new Date().toISOString().split('T')[0];
  });
  const [depositTime, setDepositTime] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [isDepositFormOpen, setIsDepositFormOpen] = useState<boolean>(false);

  React.useEffect(() => {
    if (selectedDate) {
      setDepositDate(selectedDate);
    }
  }, [selectedDate]);

  // Calculations
  const activeVaultDeposits = vaultDeposits.filter(d => !d.isConsolidated);
  const totalVaultDeposits = activeVaultDeposits.reduce((acc, d) => acc + d.amount, 0);
  const totalSafeCash = (safeRunningBalance || 0) + (safeTransferAmount || 0) + totalVaultDeposits;
  const remainingDrawerCash = expectedDrawerCash;

  // Synchronize inputs if props change externally (e.g. backup restore or reset)
  React.useEffect(() => {
    setRunningInput(safeRunningBalance > 0 ? String(safeRunningBalance) : '');
  }, [safeRunningBalance]);

  React.useEffect(() => {
    setTransferInput(safeTransferAmount > 0 ? String(safeTransferAmount) : '');
  }, [safeTransferAmount]);

  const triggerSaved = () => {
    setIsSavedRecently(true);
    setTimeout(() => setIsSavedRecently(false), 1500);
  };

  // Safe Running Balance Handlers
  const handleRunningChange = (val: string) => {
    setRunningInput(val);
    const parsed = Math.max(0, parseFloat(val) || 0);
    const nowTime = new Date().toTimeString().slice(0, 5);
    onChangeSafeRunningBalance(parsed, balanceDateInput || selectedDate, nowTime);
    triggerSaved();
  };

  const handleBalanceDateChange = (newDate: string) => {
    setBalanceDateInput(newDate);
    if (onChangeSafeRunningBalanceDate) {
      onChangeSafeRunningBalanceDate(newDate);
    }
    onChangeSafeRunningBalance(safeRunningBalance, newDate);
    triggerSaved();
    onShowToast(`Vault baseline date set to ${newDate}`, 'info');
  };

  const handleQuickAddRunning = (add: number) => {
    const nextVal = (safeRunningBalance || 0) + add;
    setRunningInput(String(nextVal));
    const nowTime = new Date().toTimeString().slice(0, 5);
    onChangeSafeRunningBalance(nextVal, balanceDateInput || selectedDate, nowTime);
    triggerSaved();
  };

  const handleClearRunning = () => {
    setRunningInput('');
    onChangeSafeRunningBalance(0, balanceDateInput || selectedDate);
    triggerSaved();
  };

  // Cash Transferred to Safe Handlers
  const handleTransferChange = (val: string) => {
    setTransferInput(val);
    const parsed = Math.max(0, parseFloat(val) || 0);
    onChangeSafeTransferAmount(parsed);
    triggerSaved();
  };

  const handleTransferAllDrawer = () => {
    const amount = Math.max(0, expectedDrawerCash);
    setTransferInput(String(amount));
    onChangeSafeTransferAmount(amount);
    triggerSaved();
    onShowToast(`Filled full drawer cash amount: ${formatPKR(amount)}`, 'info');
  };

  const handleTransferKeepFloat = () => {
    const amount = Math.max(0, expectedDrawerCash - openingCash);
    setTransferInput(String(amount));
    onChangeSafeTransferAmount(amount);
    triggerSaved();
    onShowToast(`Transferring takings (${formatPKR(amount)}), leaving float (${formatPKR(openingCash)}) in drawer.`, 'info');
  };

  const handleClearTransfer = () => {
    setTransferInput('');
    onChangeSafeTransferAmount(0);
    triggerSaved();
  };

  // Execute Drawer to Safe Transfer directly
  const handleExecuteDrawerToSafe = () => {
    const amountNum = parseFloat(transferInput) || safeTransferAmount || 0;
    if (amountNum <= 0) {
      onShowToast('Please enter an amount to transfer from drawer to safe.', 'error');
      const inputEl = document.getElementById('input-transfer-to-safe-amount') as HTMLInputElement | null;
      inputEl?.focus();
      return;
    }

    if (onTransferDrawerToSafe) {
      onTransferDrawerToSafe(amountNum, drawerToSafeReason);
    } else if (onCommitTransferToSafe) {
      onCommitTransferToSafe();
    } else {
      const newRunning = (safeRunningBalance || 0) + amountNum;
      onChangeSafeRunningBalance(newRunning);
      setRunningInput(String(newRunning));
    }

    setTransferInput('');
    onChangeSafeTransferAmount(0);
    triggerSaved();
  };

  // Safe to Drawer Replenishment Handler
  const handleExecuteSafeToDrawer = () => {
    const amountNum = parseFloat(safeToDrawerInput) || 0;
    if (amountNum <= 0) {
      onShowToast('Please enter an amount to transfer into the drawer.', 'error');
      const inputEl = document.getElementById('input-safe-to-drawer-amount') as HTMLInputElement | null;
      inputEl?.focus();
      return;
    }
    if (totalSafeCash <= 0) {
      onShowToast('Safe Vault is currently empty (Rs. 0). Add cash to the safe before replenishing drawer.', 'error');
      return;
    }
    if (amountNum > totalSafeCash) {
      onShowToast(`Safe only has ${formatPKR(totalSafeCash)} available. Cannot transfer ${formatPKR(amountNum)}.`, 'error');
      return;
    }

    if (onTransferSafeToDrawer) {
      onTransferSafeToDrawer(amountNum, safeToDrawerReason);
    } else {
      onChangeSafeRunningBalance(Math.max(0, safeRunningBalance - amountNum));
    }

    setSafeToDrawerInput('');
    triggerSaved();
  };

  const handleQuickAddSafeToDrawer = (val: number) => {
    const current = parseFloat(safeToDrawerInput) || 0;
    setSafeToDrawerInput(String(current + val));
  };

  // Safe to Bank Deposit Handler
  const handleExecuteSafeToBank = () => {
    const amountNum = parseFloat(safeToBankAmount) || 0;
    if (amountNum <= 0) {
      onShowToast('Please enter an amount to deposit into the bank.', 'error');
      const inputEl = document.getElementById('input-safe-to-bank-amount') as HTMLInputElement | null;
      inputEl?.focus();
      return;
    }

    // If depositing from Cash Register Drawer
    if (bankDepositSource === 'drawer') {
      if (remainingDrawerCash <= 0) {
        onShowToast('Cash Drawer is currently empty (Rs. 0). Cannot deposit from drawer.', 'error');
        return;
      }
      if (amountNum > remainingDrawerCash) {
        onShowToast(`Cash Drawer only has ${formatPKR(remainingDrawerCash)}. Cannot deposit ${formatPKR(amountNum)}.`, 'error');
        return;
      }

      if (onTransferDrawerToBank) {
        onTransferDrawerToBank(amountNum, safeToBankName, safeToBankNotes);
      }
      setSafeToBankAmount('');
      setSafeToBankNotes('');
      setShowInsufficientHelp(false);
      triggerSaved();
      return;
    }

    // If depositing from Safe Vault
    if (amountNum > totalSafeCash) {
      setShowInsufficientHelp(true);
      onShowToast(`Safe only has ${formatPKR(totalSafeCash)}. Cannot deposit ${formatPKR(amountNum)}. See options below.`, 'error');
      return;
    }

    if (onTransferSafeToBank) {
      onTransferSafeToBank(amountNum, safeToBankName, safeToBankNotes);
    } else {
      onChangeSafeRunningBalance(Math.max(0, safeRunningBalance - amountNum));
    }

    setSafeToBankAmount('');
    setSafeToBankNotes('');
    setShowInsufficientHelp(false);
    triggerSaved();
  };

  // Helper 1: Deposit from Drawer when safe doesn't have enough
  const handleDepositFromDrawerDirectly = () => {
    const amountNum = parseFloat(safeToBankAmount) || 0;
    if (amountNum <= 0) {
      onShowToast('Please enter an amount to deposit.', 'error');
      return;
    }
    if (amountNum > remainingDrawerCash) {
      onShowToast(`Cash Drawer only has ${formatPKR(remainingDrawerCash)}. Cannot deposit ${formatPKR(amountNum)}.`, 'error');
      return;
    }
    if (onTransferDrawerToBank) {
      onTransferDrawerToBank(amountNum, safeToBankName, safeToBankNotes);
    }
    setSafeToBankAmount('');
    setSafeToBankNotes('');
    setShowInsufficientHelp(false);
    triggerSaved();
  };

  // Helper 2: Set Safe Vault Balance to the entered amount and deposit immediately
  const handleUpdateSafeBalanceAndDeposit = () => {
    const amountNum = parseFloat(safeToBankAmount) || 0;
    if (amountNum <= 0) return;

    // Update safe running balance
    onChangeSafeRunningBalance(amountNum);
    setRunningInput(String(amountNum));

    if (onTransferSafeToBank) {
      onTransferSafeToBank(amountNum, safeToBankName, safeToBankNotes);
    } else {
      onChangeSafeRunningBalance(0);
    }
    setSafeToBankAmount('');
    setSafeToBankNotes('');
    setShowInsufficientHelp(false);
    triggerSaved();
  };

  const handleQuickAddSafeToBank = (val: number) => {
    const current = parseFloat(safeToBankAmount) || 0;
    setSafeToBankAmount(String(current + val));
  };

  // Safe to Individual Handler
  const handleExecuteSafeToIndividual = () => {
    const amountNum = parseFloat(safeToPersonAmount) || 0;
    if (amountNum <= 0) {
      onShowToast('Please enter an amount to transfer to the individual.', 'error');
      const inputEl = document.getElementById('input-safe-to-person-amount') as HTMLInputElement | null;
      inputEl?.focus();
      return;
    }

    const recipientTrimmed = safeToPersonRecipient.trim();
    if (!recipientTrimmed) {
      onShowToast('Please specify the recipient individual or entity name.', 'error');
      const inputEl = document.getElementById('input-safe-to-person-recipient') as HTMLInputElement | null;
      inputEl?.focus();
      return;
    }

    if (amountNum > totalSafeCash) {
      onShowToast(`Safe Vault only has ${formatPKR(totalSafeCash)}. Cannot transfer ${formatPKR(amountNum)}.`, 'error');
      return;
    }

    if (onTransferSafeToIndividual) {
      onTransferSafeToIndividual(
        amountNum,
        recipientTrimmed,
        safeToPersonReason.trim() || 'Safe Cash Handover',
        safeToPersonReceipt.trim() || undefined,
        safeToPersonNotes.trim() || undefined
      );
    } else {
      onChangeSafeRunningBalance(Math.max(0, safeRunningBalance - amountNum));
      onShowToast(`Transferred ${formatPKR(amountNum)} from Safe to ${recipientTrimmed}!`, 'success');
    }

    setSafeToPersonAmount('');
    setSafeToPersonRecipient('');
    setSafeToPersonReceipt('');
    setSafeToPersonNotes('');
    triggerSaved();
  };

  const handleQuickAddSafeToPerson = (val: number) => {
    const current = parseFloat(safeToPersonAmount) || 0;
    setSafeToPersonAmount(String(current + val));
  };

  // Submit Separate Vault Deposit
  const handleSaveDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(depositAmount);
    if (!amountNum || amountNum <= 0) {
      onShowToast('Please enter a valid deposit amount.', 'error');
      return;
    }

    const categoryDef = VAULT_CATEGORIES.find(c => c.category === depositCategory) || VAULT_CATEGORIES[0];

    onAddVaultDeposit({
      amount: amountNum,
      category: depositCategory,
      categoryLabel: categoryDef.label,
      notes: depositNotes.trim() || undefined,
      date: depositDate || selectedDate || new Date().toISOString().split('T')[0],
      time: depositTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    onShowToast(`Added ${formatPKR(amountNum)} (${categoryDef.label}) into the vault for ${depositDate || selectedDate}!`, 'success');

    // Reset deposit form
    setDepositAmount('');
    setDepositNotes('');
  };

  const handleQuickAddDepositAmount = (val: number) => {
    const current = parseFloat(depositAmount) || 0;
    setDepositAmount(String(current + val));
  };

  // Filter all transfers in/out of the safe for the activity log, with search support
  const safeActivities = React.useMemo(() => {
    let list = (transactions || []).filter(t => 
      t.isInternalTransfer ||
      t.transferSource === 'safe' ||
      t.transferDestination === 'safe' ||
      t.transferDestination === 'individual' ||
      t.transferDestination === 'bank' ||
      (t.category && (
        t.category.toLowerCase().includes('safe') || 
        t.category.toLowerCase().includes('internal transfer') ||
        t.category.toLowerCase().includes('individual')
      )) ||
      (t.description && (
        t.description.toLowerCase().includes('handover to') ||
        t.description.toLowerCase().includes('safe cash to') ||
        t.description.toLowerCase().includes('safe to individual') ||
        t.description.toLowerCase().includes('safe ➔')
      ))
    );

    // Also include daily drawer handovers from settings (which are safely kept out of Cash Out / Expenses)
    if (dailyDrawerHandovers) {
      Object.entries(dailyDrawerHandovers).forEach(([date, amt]) => {
        if (amt > 0) {
          const alreadyPresent = list.some(t => t.date === date && t.amount === amt && t.transferDestination === 'safe');
          if (!alreadyPresent) {
            list.push({
              id: `handover_${date}`,
              date,
              time: '20:00',
              type: 'cash_in',
              amount: amt,
              description: 'Day-End Cash Handover to Safe',
              category: 'Internal Transfer (Drawer ➔ Safe)',
              isInternalTransfer: true,
              transferSource: 'drawer',
              transferDestination: 'safe',
              salesperson: 'Drawer ➔ Safe',
              createdAt: new Date(date).getTime() || 0,
              verified: true,
              notes: 'Evening cash handover into safe vault (Stored in Vault; not an expense).'
            });
          }
        }
      });
    }

    list.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.time || '').localeCompare(a.time || ''));

    if (safeSearchQuery.trim()) {
      const q = safeSearchQuery.trim().toLowerCase().replace(/,/g, '');
      list = list.filter(t => {
        const amtStr = String(t.amount).replace(/,/g, '');
        return amtStr.includes(q) ||
          (t.date && t.date.toLowerCase().includes(q)) ||
          (t.time && t.time.toLowerCase().includes(q)) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.notes && t.notes.toLowerCase().includes(q)) ||
          (t.salesperson && t.salesperson.toLowerCase().includes(q)) ||
          (t.category && t.category.toLowerCase().includes(q));
      });
    }

    return list;
  }, [transactions, dailyDrawerHandovers, safeSearchQuery]);

  // Finalize / Commit transfer into safe balance
  const handleFinalizeTransfer = () => {
    const amountNum = safeTransferAmount > 0 ? safeTransferAmount : (parseFloat(transferInput) || 0);
    if (amountNum <= 0) {
      onShowToast('Enter a transfer amount to finalize into the safe.', 'info');
      return;
    }

    if (onTransferDrawerToSafe) {
      onTransferDrawerToSafe(amountNum, drawerToSafeReason);
    } else if (onCommitTransferToSafe) {
      onCommitTransferToSafe();
    } else {
      const newRunning = (safeRunningBalance || 0) + amountNum;
      onChangeSafeRunningBalance(newRunning);
      setRunningInput(String(newRunning));
    }

    setTransferInput('');
    onChangeSafeTransferAmount(0);
    triggerSaved();
  };

  // Consolidate both transfer and separate deposits into permanent running balance
  const handleConsolidateAllIntoVault = () => {
    const grandTotal = totalSafeCash;
    onChangeSafeRunningBalance(grandTotal);
    onChangeSafeTransferAmount(0);
    setRunningInput(String(grandTotal));
    setTransferInput('');
    
    if (onConsolidateVaultDeposits) {
      onConsolidateVaultDeposits();
    }

    onShowToast(
      `Vault consolidated! All drawer transfers & separate deposits merged into Safe Running Balance: ${formatPKR(grandTotal)}`,
      'success'
    );
  };

  return (
    <div 
      id="cash-safe-manager" 
      className="bg-white border border-stone-200 rounded-2xl p-5 md:p-6 shadow-xs mb-6 relative overflow-hidden"
    >
      {/* Decorative top accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-amber-500 to-emerald-500" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100/80 shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-stone-900 tracking-tight">
                Cash Safe & Vault Manager
              </h3>
              <span className="text-[11px] font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                End-of-Day & Direct Deposits
              </span>
              {vaultDeposits.length > 0 && (
                <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Handshake className="w-3 h-3 text-amber-600" />
                  <span>{vaultDeposits.length} External Deposit{vaultDeposits.length > 1 ? 's' : ''}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Manage vault running balance, record evening drawer transfers, and separately add Committee, Capital, or Bank cash into the safe.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {isSavedRecently && (
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1 animate-in fade-in">
              <Check className="w-3.5 h-3.5" />
              <span>Saved</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsDepositFormOpen(prev => !prev)}
            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Separately deposit Committee, Capital, or other cash directly into vault"
          >
            <Plus className="w-3.5 h-3.5 text-amber-700" />
            <span>{isDepositFormOpen ? 'Close Deposit Form' : '+ Add Vault Cash (Committee / Other)'}</span>
          </button>
        </div>
      </div>

      {/* Main 3-Column Core Vault Cards */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4.5 mb-5">
        
        {/* CONTAINER 1: Safe Running Balance (Vault Baseline) */}
        <div className="md:col-span-4 bg-stone-50/80 border border-stone-200/90 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label 
                htmlFor="input-safe-running-balance"
                className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>Safe Running Balance</span>
              </label>
              {safeRunningBalance > 0 && (
                <button
                  type="button"
                  onClick={handleClearRunning}
                  className="text-[11px] text-stone-400 hover:text-rose-600 transition-colors flex items-center gap-0.5 cursor-pointer"
                  title="Clear safe running balance"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            <p className="text-[11px] text-stone-500 mb-2.5 leading-relaxed">
              Baseline cash stored in the vault before today&apos;s drawer transfer or new deposits.
            </p>

            {/* Reconciliation breakdown if separate deposits exist */}
            {totalVaultDeposits > 0 && (
              <div className="bg-amber-50/90 border border-amber-300 rounded-lg p-2.5 mb-2.5 text-xs text-amber-950 flex items-center justify-between gap-2 shadow-2xs">
                <div>
                  <span className="font-bold flex items-center gap-1 text-amber-900">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                    Total Vault Cash: {formatPKR(totalSafeCash)}
                  </span>
                  <span className="text-[10px] text-amber-800 block mt-0.5">
                    Base: {formatPKR(safeRunningBalance)} + Injections: {formatPKR(totalVaultDeposits)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleConsolidateAllIntoVault}
                  className="px-2 py-1 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded text-[10px] font-bold shrink-0 transition-colors cursor-pointer shadow-2xs"
                  title={`Merge separate injections into Safe Base so both match ${formatPKR(totalSafeCash)}`}
                >
                  Merge to {formatPKR(totalSafeCash)}
                </button>
              </div>
            )}

            {/* Direct Input */}
            <div className="relative mb-2.5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400 select-none">
                Rs.
              </span>
              <input
                id="input-safe-running-balance"
                type="number"
                min="0"
                step="any"
                value={runningInput}
                placeholder="0"
                onChange={e => handleRunningChange(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-stone-300 rounded-lg text-base font-bold font-mono text-stone-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-hidden transition-all shadow-2xs"
              />
            </div>

            {/* Added / Effective Date for this Vault Cash */}
            <div className="bg-white border border-stone-200/90 rounded-lg p-2 mb-2.5 text-xs">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1">
                  <span>📅 Date Added / Effective:</span>
                </span>
                {balanceDateInput !== selectedDate && (
                  <button
                    type="button"
                    onClick={() => handleBalanceDateChange(selectedDate)}
                    className="text-[10px] text-indigo-600 hover:underline cursor-pointer font-semibold"
                    title={`Set to active date (${selectedDate})`}
                  >
                    Set to {selectedDate}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={balanceDateInput}
                  onChange={e => handleBalanceDateChange(e.target.value)}
                  className="w-full px-2 py-1 bg-stone-50 border border-stone-300 rounded text-xs font-mono font-bold text-stone-800 outline-hidden focus:bg-white focus:border-indigo-600"
                />
                {safeRunningBalanceTime && (
                  <span className="text-[10px] font-mono text-stone-400 shrink-0">
                    🕒 {safeRunningBalanceTime}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Adjustment Chips */}
            <div>
              <span className="text-[10px] text-stone-400 font-semibold block mb-1">
                Quick Add / Set Balance:
              </span>
              <div className="grid grid-cols-4 gap-1 text-[11px]">
                {safeRunningBalance !== totalSafeCash && totalSafeCash > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setRunningInput(String(totalSafeCash));
                      handleRunningChange(String(totalSafeCash));
                    }}
                    className="py-1 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded font-bold text-amber-900 transition-colors cursor-pointer text-center truncate"
                    title={`Set directly to Total Safe Cash (${formatPKR(totalSafeCash)})`}
                  >
                    Set {totalSafeCash >= 1000 ? `${Math.round(totalSafeCash/1000)}k` : totalSafeCash}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleQuickAddRunning(10000)}
                  className="py-1 bg-white hover:bg-indigo-50 hover:text-indigo-800 border border-stone-200 rounded font-bold text-stone-700 transition-colors cursor-pointer text-center"
                >
                  +10k
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAddRunning(50000)}
                  className="py-1 bg-white hover:bg-indigo-50 hover:text-indigo-800 border border-stone-200 rounded font-bold text-stone-700 transition-colors cursor-pointer text-center"
                >
                  +50k
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAddRunning(100000)}
                  className="py-1 bg-white hover:bg-indigo-50 hover:text-indigo-800 border border-stone-200 rounded font-bold text-stone-700 transition-colors cursor-pointer text-center"
                >
                  +100k
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-stone-200/70 text-[11px] text-stone-500 flex items-center justify-between">
            <div>
              <span>Vault Base:</span>
              <span className="text-[10px] text-stone-400 font-mono block">
                Added: {balanceDateInput || safeRunningBalanceDate || selectedDate}
              </span>
            </div>
            <div className="text-right">
              <strong className="font-mono text-stone-800 font-bold text-sm block">{formatPKR(safeRunningBalance)}</strong>
              {totalVaultDeposits > 0 && (
                <span className="text-[10px] text-amber-800 font-mono font-bold block">
                  Total w/ Deposits: {formatPKR(totalSafeCash)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* CONTAINER 2: Drawer <-> Safe Bidirectional Transfer & Safe -> Bank */}
        <div className="md:col-span-4 bg-stone-50/80 border border-stone-200/90 rounded-xl p-4 flex flex-col justify-between">
          <div>
            {/* Direction Selector Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-0.5 bg-stone-200/70 rounded-lg mb-2.5">
              <button
                type="button"
                id="btn-tab-drawer-to-safe"
                onClick={() => setActiveTransferDirection('drawer_to_safe')}
                className={`py-1 px-1 rounded-md text-[10px] sm:text-[11px] font-bold transition-all text-center flex items-center justify-center gap-1 cursor-pointer truncate ${
                  activeTransferDirection === 'drawer_to_safe'
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="Move closing cash takings from drawer into safe"
              >
                <ArrowDownToLine className="w-3 h-3 text-emerald-600 shrink-0" />
                <span className="truncate">Drawer ➔ Safe</span>
              </button>
              <button
                type="button"
                id="btn-tab-safe-to-drawer"
                onClick={() => setActiveTransferDirection('safe_to_drawer')}
                className={`py-1 px-1 rounded-md text-[10px] sm:text-[11px] font-bold transition-all text-center flex items-center justify-center gap-1 cursor-pointer truncate ${
                  activeTransferDirection === 'safe_to_drawer'
                    ? 'bg-white text-indigo-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="Transfer float replenishment cash from safe to drawer"
              >
                <ArrowUpRight className="w-3 h-3 text-indigo-600 shrink-0" />
                <span className="truncate">Safe ➔ Drawer</span>
              </button>
              <button
                type="button"
                id="btn-tab-safe-to-bank"
                onClick={() => setActiveTransferDirection('safe_to_bank')}
                className={`py-1 px-1 rounded-md text-[10px] sm:text-[11px] font-bold transition-all text-center flex items-center justify-center gap-1 cursor-pointer truncate ${
                  activeTransferDirection === 'safe_to_bank'
                    ? 'bg-white text-blue-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="Deposit cash from safe vault into bank account"
              >
                <Landmark className="w-3 h-3 text-blue-600 shrink-0" />
                <span className="truncate">Safe ➔ Bank</span>
              </button>
              <button
                type="button"
                id="btn-tab-safe-to-person"
                onClick={() => setActiveTransferDirection('safe_to_person')}
                className={`py-1 px-1 rounded-md text-[10px] sm:text-[11px] font-bold transition-all text-center flex items-center justify-center gap-1 cursor-pointer truncate ${
                  activeTransferDirection === 'safe_to_person'
                    ? 'bg-white text-purple-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="Transfer cash from safe vault to any individual person"
              >
                <User className="w-3 h-3 text-purple-600 shrink-0" />
                <span className="truncate">Safe ➔ Individual</span>
              </button>
            </div>

            {activeTransferDirection === 'drawer_to_safe' ? (
              /* DRAWER TO SAFE (Evening Handover) */
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Drawer Handover to Safe</span>
                  </span>
                  {(transferInput || safeTransferAmount > 0) && (
                    <button
                      type="button"
                      onClick={handleClearTransfer}
                      className="text-[11px] text-stone-400 hover:text-rose-600 transition-colors flex items-center gap-0.5 cursor-pointer"
                      title="Clear transfer amount"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Clear</span>
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-stone-500 mb-2 leading-relaxed">
                  Move evening sales takings from drawer into safe. Updates cash register and adds ledger entry.
                </p>

                {/* Direct Input */}
                <div className="relative mb-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400 select-none">
                    Rs.
                  </span>
                  <input
                    id="input-safe-transfer-amount"
                    type="number"
                    min="0"
                    step="any"
                    value={transferInput}
                    placeholder="0"
                    onChange={e => handleTransferChange(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-stone-300 rounded-lg text-base font-bold font-mono text-stone-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden transition-all shadow-2xs"
                  />
                </div>

                {/* One-Click Shortcut Presets */}
                <div className="mb-2">
                  <div className="grid grid-cols-2 gap-1 text-[11px] mb-1">
                    <button
                      type="button"
                      onClick={handleTransferAllDrawer}
                      disabled={expectedDrawerCash <= 0}
                      className="px-2 py-1 bg-white hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-stone-200 rounded font-bold text-stone-700 transition-colors cursor-pointer text-center truncate disabled:opacity-50 disabled:cursor-not-allowed"
                      title={`Transfer all expected drawer cash (${formatPKR(expectedDrawerCash)})`}
                    >
                      All Drawer ({formatPKR(expectedDrawerCash)})
                    </button>
                    <button
                      type="button"
                      onClick={handleTransferKeepFloat}
                      disabled={expectedDrawerCash <= openingCash}
                      className="px-2 py-1 bg-white hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-stone-200 rounded font-bold text-stone-700 transition-colors cursor-pointer text-center truncate disabled:opacity-50 disabled:cursor-not-allowed"
                      title={`Transfer takings leaving opening float (${formatPKR(openingCash)}) in drawer`}
                    >
                      Keep Float ({formatPKR(openingCash)})
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[10px]">
                    {[10000, 20000, 50000].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          const curr = parseFloat(transferInput) || 0;
                          const next = curr + amt;
                          setTransferInput(String(next));
                          onChangeSafeTransferAmount(next);
                        }}
                        className="py-0.5 bg-white hover:bg-emerald-50 hover:text-emerald-800 border border-stone-200 rounded font-bold text-stone-700 transition-colors cursor-pointer text-center"
                      >
                        +{amt / 1000}k
                      </button>
                    ))}
                  </div>
                </div>

                {/* Handover Reason Note */}
                <div className="mb-2.5">
                  <select
                    value={drawerToSafeReason}
                    onChange={e => setDrawerToSafeReason(e.target.value)}
                    className="w-full py-1 px-2 text-[11px] bg-white border border-stone-200 rounded-lg text-stone-700 font-medium outline-hidden"
                  >
                    <option value="Day-End Cash Handover to Safe">Day-End Cash Handover to Safe</option>
                    <option value="Evening Sales Transfer to Safe">Evening Sales Transfer to Safe</option>
                    <option value="Mid-day Excess Cash Drop to Safe">Mid-day Excess Cash Drop to Safe</option>
                    <option value="Safe Handover Before Shift Change">Safe Handover Before Shift Change</option>
                  </select>
                </div>

                {/* Direct Action Button */}
                <button
                  type="button"
                  id="btn-confirm-drawer-to-safe"
                  onClick={handleExecuteDrawerToSafe}
                  className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  <span>Transfer to Safe Now {transferInput && parseFloat(transferInput) > 0 ? `(${formatPKR(parseFloat(transferInput) || 0)})` : ''}</span>
                </button>

                <p className="mt-2 text-[10px] text-emerald-800 bg-emerald-50/80 border border-emerald-200/80 rounded-lg p-2 leading-relaxed">
                  🛡️ <strong>Safe Vault Notice:</strong> Evening drawer handovers are stored directly in your Vault balance. They are kept strictly separate from Cash Out / Operating Expenses so your business expenses stay accurate and never cause a negative balance.
                </p>
              </div>
            ) : activeTransferDirection === 'safe_to_drawer' ? (
              /* SAFE TO DRAWER (Replenish Float / Change) */
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ArrowUpRight className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Replenish Drawer Float</span>
                  </span>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                    Safe Total: {formatPKR(totalSafeCash)}
                  </span>
                </div>

                <p className="text-[11px] text-stone-500 mb-2 leading-relaxed">
                  Take cash out of the safe and inject into the cash drawer.
                </p>

                {/* Amount Input */}
                <div className="relative mb-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400 select-none">
                    Rs.
                  </span>
                  <input
                    id="input-safe-to-drawer-amount"
                    type="number"
                    min="1"
                    step="any"
                    value={safeToDrawerInput}
                    placeholder="e.g. 10000"
                    onChange={e => setSafeToDrawerInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleExecuteSafeToDrawer();
                      }
                    }}
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-stone-300 rounded-lg text-base font-bold font-mono text-stone-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-hidden transition-all shadow-2xs"
                  />
                </div>

                {/* Quick Add Presets */}
                <div className="flex items-center gap-1 mb-2">
                  {[5000, 10000, 20000, 50000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handleQuickAddSafeToDrawer(amt)}
                      className="flex-1 py-0.5 bg-white hover:bg-indigo-50 hover:text-indigo-800 border border-stone-200 rounded text-[10px] font-bold text-stone-700 transition-colors cursor-pointer text-center"
                    >
                      +{amt >= 1000 ? `${amt / 1000}k` : amt}
                    </button>
                  ))}
                  {totalSafeCash > 0 && (
                    <button
                      type="button"
                      onClick={() => setSafeToDrawerInput(String(totalSafeCash))}
                      className="py-0.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded text-[10px] font-bold transition-colors cursor-pointer"
                      title="Set full safe vault balance"
                    >
                      All Safe
                    </button>
                  )}
                </div>

                {/* Reason Selector */}
                <div className="mb-2.5">
                  <select
                    value={safeToDrawerReason}
                    onChange={e => setSafeToDrawerReason(e.target.value)}
                    className="w-full py-1 px-2 text-[11px] bg-white border border-stone-200 rounded-lg text-stone-700 font-medium outline-hidden"
                  >
                    <option value="Morning Float Replenishment">Morning Float Replenishment</option>
                    <option value="Change for Register (500/1000 notes)">Change for Register</option>
                    <option value="Emergency Cash Payout Support">Emergency Cash Support</option>
                    <option value="Safe Withdrawal to Drawer">Safe Withdrawal to Drawer</option>
                  </select>
                </div>

                {/* Confirm Button */}
                <button
                  type="button"
                  id="btn-confirm-safe-to-drawer"
                  onClick={handleExecuteSafeToDrawer}
                  className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Transfer to Drawer {safeToDrawerInput && parseFloat(safeToDrawerInput) > 0 ? `(${formatPKR(parseFloat(safeToDrawerInput) || 0)})` : ''}</span>
                </button>
              </div>
            ) : activeTransferDirection === 'safe_to_bank' ? (
              /* BANK DEPOSIT (From Safe Vault or Cash Drawer) */
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5 text-blue-600" />
                    <span>Bank Deposit</span>
                  </span>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                    {bankDepositSource === 'safe' 
                      ? `Safe: ${formatPKR(totalSafeCash)}` 
                      : `Drawer: ${formatPKR(remainingDrawerCash)}`}
                  </span>
                </div>

                {/* Source Selection: From Safe vs From Drawer */}
                <div className="grid grid-cols-2 gap-1 p-0.5 bg-stone-200/80 rounded-lg mb-2 text-xs">
                  <button
                    type="button"
                    onClick={() => { setBankDepositSource('safe'); setShowInsufficientHelp(false); }}
                    className={`py-1 px-1.5 rounded-md font-bold transition-all text-center flex items-center justify-center gap-1 cursor-pointer truncate ${
                      bankDepositSource === 'safe'
                        ? 'bg-white text-blue-900 shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <Lock className="w-3 h-3 text-blue-600 shrink-0" />
                    <span className="truncate">From Safe ({formatPKR(totalSafeCash)})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setBankDepositSource('drawer'); setShowInsufficientHelp(false); }}
                    className={`py-1 px-1.5 rounded-md font-bold transition-all text-center flex items-center justify-center gap-1 cursor-pointer truncate ${
                      bankDepositSource === 'drawer'
                        ? 'bg-white text-emerald-900 shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <ArrowDownToLine className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span className="truncate">From Drawer ({formatPKR(remainingDrawerCash)})</span>
                  </button>
                </div>

                <p className="text-[11px] text-stone-500 mb-2 leading-relaxed">
                  {bankDepositSource === 'safe'
                    ? 'Deposit cash from the safe vault directly into your business bank account.'
                    : 'Deposit cash from the counter cash drawer directly into your business bank account.'}
                </p>

                {/* Amount Input */}
                <div className="relative mb-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400 select-none">
                    Rs.
                  </span>
                  <input
                    id="input-safe-to-bank-amount"
                    type="number"
                    min="1"
                    step="any"
                    value={safeToBankAmount}
                    placeholder="e.g. 100000"
                    onChange={e => {
                      setSafeToBankAmount(e.target.value);
                      setShowInsufficientHelp(false);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleExecuteSafeToBank();
                      }
                    }}
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-stone-300 rounded-lg text-base font-bold font-mono text-stone-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-hidden transition-all shadow-2xs"
                  />
                </div>

                {/* Quick Add Presets */}
                <div className="flex items-center gap-1 mb-2">
                  {[25000, 50000, 100000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handleQuickAddSafeToBank(amt)}
                      className="flex-1 py-0.5 bg-white hover:bg-blue-50 hover:text-blue-800 border border-stone-200 rounded text-[10px] font-bold text-stone-700 transition-colors cursor-pointer text-center"
                    >
                      +{amt / 1000}k
                    </button>
                  ))}
                  {(bankDepositSource === 'safe' ? totalSafeCash : remainingDrawerCash) > 0 && (
                    <button
                      type="button"
                      onClick={() => setSafeToBankAmount(String(bankDepositSource === 'safe' ? totalSafeCash : remainingDrawerCash))}
                      className="py-0.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded text-[10px] font-bold transition-colors cursor-pointer truncate"
                      title="Set full available balance"
                    >
                      All Available ({formatPKR(bankDepositSource === 'safe' ? totalSafeCash : remainingDrawerCash)})
                    </button>
                  )}
                </div>

                {/* Bank Account Selector & Notes */}
                <div className="grid grid-cols-2 gap-1.5 mb-2.5">
                  <select
                    value={safeToBankName}
                    onChange={e => setSafeToBankName(e.target.value)}
                    className="w-full py-1 px-2 text-[11px] bg-white border border-stone-200 rounded-lg text-stone-700 font-medium outline-hidden"
                  >
                    <option value="Askari Bank Ltd.">Askari Bank Ltd.</option>
                    <option value="Habib Bank Limited (HBL)">HBL</option>
                    <option value="Bank Alfalah">Bank Alfalah</option>
                    <option value="MCB Bank">MCB Bank</option>
                    <option value="Allied Bank (ABL)">Allied Bank</option>
                    <option value="Meezan Bank">Meezan Bank</option>
                    <option value="Faysal Bank">Faysal Bank</option>
                    <option value="United Bank Limited (UBL)">UBL</option>
                    <option value="National Bank of Pakistan (NBP)">NBP</option>
                    <option value="Other Bank">Other Bank</option>
                  </select>
                  <input
                    type="text"
                    value={safeToBankNotes}
                    onChange={e => setSafeToBankNotes(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleExecuteSafeToBank();
                      }
                    }}
                    placeholder="Slip / Receipt # (Opt)"
                    className="w-full py-1 px-2 text-[11px] bg-white border border-stone-200 rounded-lg text-stone-700 font-medium outline-hidden"
                  />
                </div>

                {/* Confirm Button */}
                <button
                  type="button"
                  id="btn-confirm-safe-to-bank"
                  onClick={handleExecuteSafeToBank}
                  className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Landmark className="w-3.5 h-3.5" />
                  <span>
                    Deposit into Bank from {bankDepositSource === 'drawer' ? 'Drawer' : 'Safe'} {safeToBankAmount && parseFloat(safeToBankAmount) > 0 ? `(${formatPKR(parseFloat(safeToBankAmount) || 0)})` : ''}
                  </span>
                </button>

                {/* Assistive Resolution Panel when Safe cash is insufficient */}
                {showInsufficientHelp && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold text-amber-950">
                          Safe Vault only has {formatPKR(totalSafeCash)}
                        </div>
                        <div className="text-[11px] text-amber-900 leading-snug">
                          You entered {formatPKR(parseFloat(safeToBankAmount) || 0)}. Where is this cash located?
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1.5 border-t border-amber-200">
                      {/* Option 1: Deposit from Drawer */}
                      <button
                        type="button"
                        onClick={handleDepositFromDrawerDirectly}
                        className="w-full text-left p-2.5 rounded-lg bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-950 transition-colors cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <span className="text-xs font-bold flex items-center gap-1.5 text-emerald-800">
                            <ArrowDownToLine className="w-3.5 h-3.5" />
                            1. Deposit from Cash Drawer instead
                          </span>
                          <span className="text-[10px] text-stone-500 block mt-0.5">
                            Your cash drawer has {formatPKR(remainingDrawerCash)} in register cash.
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-emerald-700 shrink-0" />
                      </button>

                      {/* Option 2: Update Safe Balance */}
                      <button
                        type="button"
                        onClick={handleUpdateSafeBalanceAndDeposit}
                        className="w-full text-left p-2.5 rounded-lg bg-white border border-blue-300 hover:bg-blue-50 text-blue-950 transition-colors cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <span className="text-xs font-bold flex items-center gap-1.5 text-blue-800">
                            <Lock className="w-3.5 h-3.5" />
                            2. Set Safe Vault Balance & Deposit Now
                          </span>
                          <span className="text-[10px] text-stone-500 block mt-0.5">
                            Set your Safe Vault balance to {formatPKR(parseFloat(safeToBankAmount) || 0)} and complete the bank deposit.
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-blue-700 shrink-0" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* SAFE TO INDIVIDUAL / PERSON (Partner Drawing, Advance, Vendor, Loan) */
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-purple-600" />
                    <span>Safe Cash to Individual</span>
                  </span>
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">
                    Safe Total: {formatPKR(totalSafeCash)}
                  </span>
                </div>

                <p className="text-[11px] text-stone-500 mb-2 leading-relaxed">
                  Disburse cash directly from the safe vault to an owner, partner, staff member, or vendor without altering register drawer cash.
                </p>

                {/* Amount Input */}
                <div className="relative mb-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400 select-none">
                    Rs.
                  </span>
                  <input
                    id="input-safe-to-person-amount"
                    type="number"
                    min="1"
                    step="any"
                    value={safeToPersonAmount}
                    placeholder="e.g. 25000"
                    onChange={e => setSafeToPersonAmount(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleExecuteSafeToIndividual();
                      }
                    }}
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-stone-300 rounded-lg text-base font-bold font-mono text-stone-900 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 outline-hidden transition-all shadow-2xs"
                  />
                </div>

                {/* Quick Add Presets */}
                <div className="flex items-center gap-1 mb-2">
                  {[5000, 10000, 25000, 50000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handleQuickAddSafeToPerson(amt)}
                      className="flex-1 py-0.5 bg-white hover:bg-purple-50 hover:text-purple-800 border border-stone-200 rounded text-[10px] font-bold text-stone-700 transition-colors cursor-pointer text-center"
                    >
                      +{amt >= 1000 ? `${amt / 1000}k` : amt}
                    </button>
                  ))}
                  {totalSafeCash > 0 && (
                    <button
                      type="button"
                      onClick={() => setSafeToPersonAmount(String(totalSafeCash))}
                      className="py-0.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded text-[10px] font-bold transition-colors cursor-pointer truncate"
                      title="Set full safe vault balance"
                    >
                      All Safe
                    </button>
                  )}
                </div>

                {/* Recipient Selection & Input */}
                <div className="mb-2">
                  <label 
                    htmlFor="input-safe-to-person-recipient"
                    className="text-[10px] font-bold text-stone-700 block mb-1 uppercase tracking-wider"
                  >
                    Recipient Individual / Entity:
                  </label>
                  <div className="relative mb-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400">
                      <User className="w-3.5 h-3.5" />
                    </span>
                    <input
                      id="input-safe-to-person-recipient"
                      type="text"
                      value={safeToPersonRecipient}
                      onChange={e => setSafeToPersonRecipient(e.target.value)}
                      placeholder="e.g. Partner / Owner, Staff Name, Vendor..."
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-semibold text-stone-900 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 outline-hidden"
                    />
                  </div>

                  {/* Quick Recipient Suggestions */}
                  <div className="flex items-center gap-1 flex-wrap text-[10px]">
                    <span className="text-stone-400">Quick:</span>
                    {['Owner Drawing', ...(staffList || []).slice(0, 3)].map(rec => (
                      <button
                        key={rec}
                        type="button"
                        onClick={() => setSafeToPersonRecipient(rec)}
                        className={`px-1.5 py-0.5 rounded border transition-colors cursor-pointer font-medium ${
                          safeToPersonRecipient === rec
                            ? 'bg-purple-100 border-purple-300 text-purple-900 font-bold'
                            : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'
                        }`}
                      >
                        {rec}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Purpose / Reason & Voucher No */}
                <div className="grid grid-cols-2 gap-1.5 mb-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-stone-600 block mb-0.5">
                      Purpose / Category:
                    </label>
                    <select
                      value={safeToPersonReason}
                      onChange={e => setSafeToPersonReason(e.target.value)}
                      className="w-full py-1 px-2 text-[11px] bg-white border border-stone-200 rounded-lg text-stone-700 font-medium outline-hidden"
                    >
                      <option value="Partner / Owner Drawing">Partner / Owner Drawing</option>
                      <option value="Advance Salary to Staff">Advance Salary to Staff</option>
                      <option value="Loan / Borrowing Handover">Loan / Borrowing Handover</option>
                      <option value="Supplier / Vendor Settlement">Vendor / Supplier Payment</option>
                      <option value="Contractor / Labor Handover">Contractor / Labor Payment</option>
                      <option value="Committee (Kameti) Payout">Committee (Kameti) Payout</option>
                      <option value="Emergency Cash Handover">Emergency Cash Handover</option>
                      <option value="Personal Cash Withdrawal">Personal Cash Withdrawal</option>
                      <option value="Other Cash Handover">Other Cash Handover</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-stone-600 block mb-0.5">
                      Voucher / Slip # (Opt):
                    </label>
                    <input
                      type="text"
                      value={safeToPersonReceipt}
                      onChange={e => setSafeToPersonReceipt(e.target.value)}
                      placeholder="e.g. VCH-102"
                      className="w-full py-1 px-2 text-[11px] bg-white border border-stone-200 rounded-lg text-stone-700 font-medium outline-hidden"
                    />
                  </div>
                </div>

                {/* Optional Detailed Notes */}
                <div className="mb-2.5">
                  <label className="text-[10px] font-bold text-stone-600 block mb-0.5">
                    Particulars / Reason Details (Opt):
                  </label>
                  <input
                    type="text"
                    value={safeToPersonNotes}
                    onChange={e => setSafeToPersonNotes(e.target.value)}
                    placeholder="e.g. Month 6 Kameti collection, advance drawing for purchase, etc."
                    className="w-full py-1 px-2 text-[11px] bg-white border border-stone-200 rounded-lg text-stone-700 font-medium outline-hidden"
                  />
                </div>

                {/* Confirm Button */}
                <button
                  type="button"
                  id="btn-confirm-safe-to-person"
                  onClick={handleExecuteSafeToIndividual}
                  className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>
                    Transfer Cash to Individual {safeToPersonAmount && parseFloat(safeToPersonAmount) > 0 ? `(${formatPKR(parseFloat(safeToPersonAmount) || 0)})` : ''}
                  </span>
                </button>
              </div>
            )}
          </div>

          <div className="mt-3 pt-2.5 border-t border-stone-200/70 text-[11px] text-stone-500 flex items-center justify-between">
            <span>
              {activeTransferDirection === 'drawer_to_safe' 
                ? 'Drawer Transfer (to Safe):' 
                : activeTransferDirection === 'safe_to_drawer'
                ? 'Safe to Drawer (Replenish):'
                : activeTransferDirection === 'safe_to_bank'
                ? 'Safe to Bank (Deposit):'
                : 'Safe to Individual (Payout):'}
            </span>
            <strong className="font-mono text-emerald-700 font-bold">
              {activeTransferDirection === 'drawer_to_safe'
                ? `+${formatPKR(transferInput ? parseFloat(transferInput) || 0 : safeTransferAmount)}`
                : activeTransferDirection === 'safe_to_drawer'
                ? (safeToDrawerInput ? `+${formatPKR(parseFloat(safeToDrawerInput) || 0)}` : 'Rs. 0')
                : activeTransferDirection === 'safe_to_bank'
                ? (safeToBankAmount ? `-${formatPKR(parseFloat(safeToBankAmount) || 0)}` : 'Rs. 0')
                : (safeToPersonAmount ? `-${formatPKR(parseFloat(safeToPersonAmount) || 0)}` : 'Rs. 0')}
            </strong>
          </div>
        </div>

        {/* CONTAINER 3: Total Safe Cash & Grand Vault Total */}
        <div className="md:col-span-4 bg-gradient-to-br from-indigo-950 via-stone-900 to-stone-950 text-white rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-300 flex items-center gap-1">
                <Lock className="w-3 h-3 text-indigo-300" />
                <span>Total Safe Cash</span>
              </span>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-1.5 py-0.5 rounded font-mono">
                Grand Vault Total
              </span>
            </div>

            {/* Prominent Big Number */}
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white tracking-tight my-1">
              {formatPKR(totalSafeCash)}
            </div>

            {/* Formula Math Breakdown */}
            <div className="mt-2.5 pt-2.5 border-t border-stone-800/80 space-y-1.5 text-xs text-stone-300">
              <div className="flex items-center justify-between text-stone-400">
                <div>
                  <span>Safe Running Base:</span>
                  <span className="text-[10px] text-stone-400 block font-mono">
                    (Effective: {balanceDateInput || safeRunningBalanceDate || selectedDate})
                  </span>
                </div>
                <span className="font-mono font-medium text-stone-200">{formatPKR(safeRunningBalance)}</span>
              </div>
              <div className="flex items-center justify-between text-emerald-400">
                <span>(+) Drawer Closing Transfer:</span>
                <span className="font-mono font-bold">+{formatPKR(safeTransferAmount)}</span>
              </div>
              {totalVaultDeposits > 0 && (
                <div className="flex items-center justify-between text-amber-400">
                  <span className="flex items-center gap-1">
                    <span>(+) Committee & Other Deposits:</span>
                    <span className="text-[10px] bg-amber-500/20 px-1 rounded text-amber-300">
                      {vaultDeposits.length}
                    </span>
                  </span>
                  <span className="font-mono font-bold">+{formatPKR(totalVaultDeposits)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-stone-400 pt-1 border-t border-stone-800/60">
                <span>Remaining in Register Drawer:</span>
                <span className={`font-mono font-bold ${remainingDrawerCash >= 0 ? 'text-stone-200' : 'text-rose-400'}`}>
                  {formatPKR(remainingDrawerCash)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-3.5 pt-2.5 border-t border-stone-800/80 space-y-2">
            {safeTransferAmount > 0 && (
              <button
                type="button"
                onClick={handleFinalizeTransfer}
                className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                title="Secure drawer transfer into running safe balance"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Finalize Drawer Transfer</span>
              </button>
            )}
            
            {(safeTransferAmount > 0 || totalVaultDeposits > 0) && (
              <button
                type="button"
                onClick={handleConsolidateAllIntoVault}
                className="w-full py-1.5 px-3 bg-indigo-900/60 hover:bg-indigo-800/80 border border-indigo-700/50 text-indigo-200 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Merge all pending drawer transfers and separate deposits into Safe Running Balance"
              >
                <Layers className="w-3 h-3 text-indigo-400" />
                <span>Consolidate All into Running Balance</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* LIVE SAFE TRANSFERS & ACTIVITY AUDIT TRAIL */}
      <div className="mb-5 bg-stone-50/80 border border-stone-200/90 rounded-xl p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pb-2.5 border-b border-stone-200/80 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
              <History className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                  Safe In/Out Transfer Activity Log
                </h4>
                <span className="text-[10px] font-mono font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                  {safeActivities.length} {safeActivities.length === 1 ? 'record' : 'records'}
                </span>
              </div>
              <p className="text-[11px] text-stone-500">
                Audit trail of transfers between Register Drawer, Safe Vault, and Bank Accounts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs flex-wrap">
            <div className="relative">
              <input
                type="text"
                placeholder="Search audit (e.g. 2195000)..."
                value={safeSearchQuery}
                onChange={e => setSafeSearchQuery(e.target.value)}
                className="pl-2.5 pr-6 py-1 bg-white border border-stone-300 rounded-lg text-xs text-stone-800 placeholder-stone-400 outline-hidden w-44 sm:w-52 font-mono shadow-2xs focus:border-indigo-600"
              />
              {safeSearchQuery && (
                <button
                  type="button"
                  onClick={() => setSafeSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
            <span className="text-stone-500 text-[11px]">Vault Status:</span>
            <span className="font-mono font-bold text-stone-800 bg-white px-2 py-1 rounded border border-stone-200 text-xs shadow-2xs">
              Base: {formatPKR(safeRunningBalance)}
            </span>
          </div>
        </div>

        {/* Highlight matching Vault Baseline if searched */}
        {safeSearchQuery && String(safeRunningBalance).includes(safeSearchQuery.replace(/,/g, '')) && (
          <div className="bg-amber-50/90 border border-amber-300 rounded-xl p-3 flex items-center justify-between gap-3 shadow-2xs mb-2.5 animate-in fade-in">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-lg bg-amber-200 text-amber-900 shrink-0">
                <ShieldCheck className="w-4 h-4 text-amber-800" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200/90 text-amber-950 border border-amber-300">
                    Vault Running Base
                  </span>
                  <span className="text-[11px] font-mono text-amber-950 font-bold bg-white/80 border border-amber-200 px-2 py-0.5 rounded">
                    📅 Added / Effective: {balanceDateInput || safeRunningBalanceDate || selectedDate} {safeRunningBalanceTime ? `at ${safeRunningBalanceTime}` : ''}
                  </span>
                </div>
                <p className="text-xs text-stone-800 mt-0.5 font-medium">
                  Stored baseline cash balance in the safe vault matching your search.
                </p>
              </div>
            </div>
            <span className="text-base font-extrabold font-mono text-amber-950 shrink-0">
              {formatPKR(safeRunningBalance)}
            </span>
          </div>
        )}

        {safeActivities.length > 0 ? (
          <div className="space-y-2">
            {safeActivities.map(item => {
              const isDrawerToSafe = item.transferDestination === 'safe' || item.type === 'cash_out' && item.category?.includes('Safe') && item.transferDestination !== 'bank' && item.transferDestination !== 'individual';
              const isSafeToDrawer = item.transferSource === 'safe' && item.type === 'cash_in';
              const isSafeToBank = item.transferDestination === 'bank' || item.category?.includes('Bank') && item.transferSource === 'safe';
              const isSafeToPerson = item.transferDestination === 'individual' || (item.transferSource === 'safe' && (item.category?.includes('Individual') || item.description?.toLowerCase().includes('handover to') || item.description?.toLowerCase().includes('safe cash to')));

              let badgeStyle = 'bg-stone-100 text-stone-800 border-stone-200';
              let badgeLabel = 'Transfer';
              let IconComp = Lock;
              let directionText = 'Safe Movement';
              let amountColor = 'text-stone-900';
              let sign = '';

              if (isDrawerToSafe) {
                badgeStyle = 'bg-emerald-100 text-emerald-900 border-emerald-300';
                badgeLabel = 'Drawer ➔ Safe Handover';
                IconComp = ArrowDownToLine;
                directionText = 'Inflow to Safe (Debited from Drawer Register)';
                amountColor = 'text-emerald-700';
                sign = '+';
              } else if (isSafeToDrawer) {
                badgeStyle = 'bg-indigo-100 text-indigo-900 border-indigo-300';
                badgeLabel = 'Safe ➔ Drawer Replenish';
                IconComp = ArrowUpRight;
                directionText = 'Outflow from Safe (Credited into Drawer Register)';
                amountColor = 'text-indigo-700';
                sign = '-';
              } else if (isSafeToBank) {
                badgeStyle = 'bg-blue-100 text-blue-900 border-blue-300';
                badgeLabel = 'Safe ➔ Bank Deposit';
                IconComp = Landmark;
                directionText = 'Outflow from Safe (Deposited into Bank Account)';
                amountColor = 'text-blue-700';
                sign = '-';
              } else if (isSafeToPerson) {
                badgeStyle = 'bg-purple-100 text-purple-900 border-purple-300';
                badgeLabel = `Safe ➔ ${item.salesperson || 'Individual'}`;
                IconComp = User;
                directionText = `Outflow from Safe (Handed over to ${item.salesperson || 'Individual'})`;
                amountColor = 'text-purple-700';
                sign = '-';
              }

              return (
                <div 
                  key={item.id}
                  className="bg-white border border-stone-200 rounded-lg p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs hover:border-stone-300 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                    <div className="p-1.5 rounded-md bg-stone-50 border border-stone-200 shrink-0 mt-0.5 sm:mt-0">
                      <IconComp className="w-3.5 h-3.5 text-stone-700" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badgeStyle}`}>
                          {badgeLabel}
                        </span>
                        <span className="text-[11px] font-mono text-stone-400">
                          {item.date} • {item.time}
                        </span>
                        {(item.receiptNumber || item.biltyNumber) && (
                          <span className="text-[10px] bg-stone-100 text-stone-700 px-1 rounded font-mono font-semibold">
                            Receipt #{item.receiptNumber || item.biltyNumber}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-stone-800 truncate mt-0.5">
                        {item.description}
                      </p>
                      <p className="text-[10px] text-stone-400">
                        {directionText}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                    <div className="text-right">
                      <span className={`text-sm font-extrabold font-mono ${amountColor}`}>
                        {sign}{formatPKR(item.amount)}
                      </span>
                    </div>
                    {onDeleteTransaction && (
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteTransaction(item.id);
                          onShowToast(`Reversed transfer of ${formatPKR(item.amount)} and restored balances.`, 'info');
                        }}
                        className="text-stone-400 hover:text-rose-600 p-1.5 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete and reverse this transfer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-3 bg-white/80 border border-dashed border-stone-200 rounded-lg text-center text-xs text-stone-500">
            <span>No transfers in or out of the safe recorded yet today. Use the transfer tabs in Container 2 above to move cash between Drawer, Safe, and Bank.</span>
          </div>
        )}
      </div>

      {/* SEPARATE VAULT CASH DEPOSITS SECTION (Committee, Capital, Bank Withdrawal, etc.) */}
      <div className="border border-amber-200/80 bg-amber-50/40 rounded-xl p-4 transition-all">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-200/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
              <Handshake className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-stone-900">
                  Separate Direct Vault Deposits (Committee, Capital, External Cash)
                </h4>
                <span className="text-[10px] bg-amber-200/80 text-amber-900 font-bold px-1.5 py-0.5 rounded">
                  Does Not Affect Drawer Sales
                </span>
              </div>
              <p className="text-[11px] text-stone-600 mt-0.5">
                Deposit cash directly into the safe (e.g. monthly Kameti payout, personal capital, or bank withdrawal) separate from register sales.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-semibold">
                Separate Deposits Total
              </span>
              <span className="text-sm font-extrabold font-mono text-amber-900">
                {formatPKR(totalVaultDeposits)}
              </span>
            </div>
            {!isDepositFormOpen && (
              <button
                type="button"
                onClick={() => setIsDepositFormOpen(true)}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Deposit</span>
              </button>
            )}
          </div>
        </div>

        {/* Deposit Entry Form */}
        {isDepositFormOpen && (
          <form 
            onSubmit={handleSaveDeposit} 
            className="mt-4 p-4 bg-white border border-amber-200 rounded-xl shadow-xs animate-in fade-in slide-in-from-top-2 duration-200"
          >
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <h5 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                  New Direct Cash Deposit to Safe
                </h5>
              </div>
              <button
                type="button"
                onClick={() => setIsDepositFormOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {/* Category Selector Buttons */}
            <div className="mb-3.5">
              <label className="text-[11px] font-bold text-stone-700 block mb-1.5 uppercase tracking-wider">
                Select Deposit Type / Purpose:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {VAULT_CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  const isSelected = depositCategory === cat.category;
                  return (
                    <button
                      key={cat.category}
                      type="button"
                      onClick={() => setDepositCategory(cat.category)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected 
                          ? 'border-amber-600 bg-amber-50/90 ring-1 ring-amber-600 shadow-2xs' 
                          : 'border-stone-200 bg-stone-50 hover:bg-white hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`p-1 rounded-md ${isSelected ? 'bg-amber-600 text-white' : 'bg-stone-200 text-stone-700'}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className={`text-xs font-bold ${isSelected ? 'text-amber-950' : 'text-stone-800'}`}>
                          {cat.label}
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-500 line-clamp-1 leading-tight">
                        {cat.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount, Particulars, and Action Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              
              {/* Amount */}
              <div className="md:col-span-4">
                <label 
                  htmlFor={depositAmountInputId}
                  className="text-[11px] font-bold text-stone-700 block mb-1 uppercase tracking-wider"
                >
                  Deposit Amount (PKR) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400 select-none">
                    Rs.
                  </span>
                  <input
                    id={depositAmountInputId}
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={depositAmount}
                    onChange={e => setDepositAmount(e.target.value)}
                    placeholder="e.g. 50,000"
                    className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-base font-bold font-mono text-stone-900 focus:bg-white focus:border-amber-600 focus:ring-1 focus:ring-amber-600 outline-hidden transition-all"
                  />
                </div>
                {/* Quick Add Presets */}
                <div className="flex items-center gap-1 mt-1 text-[10px]">
                  <span className="text-stone-400 font-semibold">Quick:</span>
                  {[10000, 25000, 50000, 100000].map(add => (
                    <button
                      key={add}
                      type="button"
                      onClick={() => handleQuickAddDepositAmount(add)}
                      className="px-1.5 py-0.5 bg-stone-100 hover:bg-amber-100 hover:text-amber-900 rounded border border-stone-200 font-bold text-stone-600 cursor-pointer"
                    >
                      +{add >= 1000 ? `${add / 1000}k` : add}
                    </button>
                  ))}
                  {depositAmount && (
                    <button
                      type="button"
                      onClick={() => setDepositAmount('')}
                      className="text-stone-400 hover:text-rose-600 ml-auto cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Particulars / Remarks */}
              <div className="md:col-span-4">
                <label className="text-[11px] font-bold text-stone-700 block mb-1 uppercase tracking-wider">
                  Particulars / Description <span className="text-stone-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
                    <FileText className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    value={depositNotes}
                    onChange={e => setDepositNotes(e.target.value)}
                    placeholder="e.g. 5th Kameti payout, emergency capital, etc."
                    className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium text-stone-900 focus:bg-white focus:border-amber-600 focus:ring-1 focus:ring-amber-600 outline-hidden transition-all"
                  />
                </div>
                <span className="text-[10px] text-stone-400 block mt-1">
                  Recorded in daily vault ledger & Excel export
                </span>
              </div>

              {/* Date, Time and Submit */}
              <div className="md:col-span-4 flex items-center gap-2">
                <div className="flex-1 min-w-[110px]">
                  <label className="text-[10px] font-bold text-stone-500 block mb-1 uppercase">
                    Date
                  </label>
                  <input
                    type="date"
                    value={depositDate}
                    onChange={e => setDepositDate(e.target.value)}
                    className="w-full px-2 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono font-bold text-stone-800"
                  />
                </div>
                <div className="w-20 shrink-0">
                  <label className="text-[10px] font-bold text-stone-500 block mb-1 uppercase">
                    Time
                  </label>
                  <input
                    type="time"
                    value={depositTime}
                    onChange={e => setDepositTime(e.target.value)}
                    className="w-full px-2 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono text-stone-800"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs h-[38px] mt-auto shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add</span>
                </button>
              </div>

            </div>
          </form>
        )}

        {/* List of Recorded Separate Deposits */}
        {vaultDeposits.length > 0 ? (
          <div className="mt-3.5">
            <div className="flex items-center justify-between text-xs font-bold text-stone-700 mb-2 px-1">
              <span>Recorded Vault Injections ({vaultDeposits.length} entries):</span>
              <span className="text-amber-900 font-mono font-bold">
                Subtotal: {formatPKR(totalVaultDeposits)}
              </span>
            </div>

            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {vaultDeposits.map(dep => {
                const catDef = VAULT_CATEGORIES.find(c => c.category === dep.category) || VAULT_CATEGORIES[0];
                const Icon = catDef.icon;

                return (
                  <div 
                    key={dep.id}
                    className="bg-white border border-stone-200/90 rounded-lg p-2.5 flex items-center justify-between gap-3 shadow-2xs hover:border-amber-300 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-1.5 rounded-md shrink-0 ${catDef.badgeClass}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded border ${catDef.badgeClass}`}>
                            {dep.categoryLabel}
                          </span>
                          <span className="text-[11px] font-bold text-amber-900 bg-amber-100/90 border border-amber-300 px-1.5 py-0.5 rounded font-mono flex items-center gap-1">
                            📅 {dep.date || selectedDate}
                          </span>
                          <span className="text-[11px] text-stone-500 font-mono">
                            🕒 {dep.time}
                          </span>
                          {dep.isConsolidated && (
                            <span className="text-[10px] font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                              Merged into Vault Base
                            </span>
                          )}
                        </div>
                        {dep.notes && (
                          <p className="text-xs font-medium text-stone-800 truncate mt-0.5">
                            {dep.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-sm font-extrabold font-mono ${dep.isConsolidated ? 'text-stone-500 line-through' : dep.amount < 0 ? 'text-blue-700' : 'text-emerald-700'}`}>
                        {dep.amount < 0 ? '-' : '+'}{formatPKR(Math.abs(dep.amount))}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteVaultDeposit(dep.id);
                          onShowToast(`Removed ${dep.categoryLabel} deposit (${formatPKR(dep.amount)})`, 'info');
                        }}
                        className="text-stone-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete this vault deposit entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          !isDepositFormOpen && (
            <div className="mt-2 p-3 bg-white/70 border border-dashed border-amber-200/90 rounded-lg text-center text-xs text-stone-500">
              <span>No separate vault deposits recorded yet today. Click </span>
              <button
                type="button"
                onClick={() => setIsDepositFormOpen(true)}
                className="font-bold text-amber-800 hover:underline cursor-pointer"
              >
                + Add Vault Cash
              </button>
              <span> to log Committee, Capital, or Bank withdrawals into the safe.</span>
            </div>
          )
        )}

      </div>

      {/* Warning note if transfer exceeds drawer cash */}
      {safeTransferAmount > expectedDrawerCash && expectedDrawerCash > 0 && (
        <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Note: Cash transferred from drawer ({formatPKR(safeTransferAmount)}) exceeds current expected drawer balance ({formatPKR(expectedDrawerCash)}). Ensure any outside funds or discrepancy are reconciled.
          </span>
        </div>
      )}
    </div>
  );
};
