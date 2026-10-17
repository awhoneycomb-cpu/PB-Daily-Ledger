import * as XLSX from 'xlsx';
import { Transaction, getMainCashOutCategory, isDrawerToSafeTransfer } from '../types';

export function formatPKR(val: number): string {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0
  }).format(val).replace('PKR', 'Rs.');
}

export function exportToExcel(
  transactions: Transaction[], 
  selectedDate: string, 
  drawerCashInHand: number,
  openingCash: number = 0,
  denominations?: Record<string | number, number>,
  safeData?: {
    safeRunningBalance: number;
    safeTransferAmount: number;
    totalSafeCash: number;
    vaultDepositsTotal?: number;
    vaultDeposits?: Array<{
      date: string;
      time: string;
      categoryLabel: string;
      amount: number;
      notes?: string;
    }>;
  }
) {
  // Create workbook
  const wb = XLSX.utils.book_new();

  // Tab 1: Detailed All Transactions
  const flatData = transactions.map((t, idx) => ({
    'Sr #': idx + 1,
    'Date': t.date,
    'Time': t.time || '',
    'Type': t.type === 'cash_in'
      ? (t.isRefund ? 'Cash In (Refund)' : (t.transferSource === 'safe' ? 'Safe ➔ Drawer Replenish' : 'Cash In'))
      : (t.transferDestination === 'individual' ? 'Safe ➔ Individual Payout' : t.transferDestination === 'bank' ? 'Safe ➔ Bank Deposit' : t.transferDestination === 'safe' ? 'Drawer ➔ Safe Handover' : 'Cash Out'),
    'Main Category': t.type === 'cash_in'
      ? (t.isRefund ? 'Expense Refund' : 'Sales Revenue')
      : (getMainCashOutCategory(t) === 'vendor_payments'
          ? 'Vendor Payments'
          : getMainCashOutCategory(t) === 'market_payments'
          ? 'Market Payments (Creditor)'
          : getMainCashOutCategory(t) === 'internal_transfer'
          ? 'Internal Transfer'
          : 'Expenses'),
    'Party / Vendor / Creditor': t.partyName || (t.transferDestination === 'individual' ? t.salesperson : '') || '-',
    'Amount (PKR)': t.amount,
    'Payment Mode': t.transferDestination === 'individual'
      ? 'Safe Vault Outflow'
      : t.transferSource === 'safe'
      ? 'Safe Vault Transfer'
      : t.paymentMode === 'online'
      ? 'Online Transfer'
      : 'Cash (Physical)',
    'Salesperson / Counter': t.salesperson || '-',
    'Bill #': t.billNumber || '-',
    'Category / Subcategory': t.category || (t.type === 'cash_in' ? (t.isRefund ? 'Expense Refund' : 'Sales Revenue') : 'Expense'),
    'Description / Particulars': t.description || '',
    'Receipt / Voucher #': t.receiptNumber || t.biltyNumber || '',
    'Verified (✓)': t.verified ? 'Yes (✓)' : 'No'
  }));

  const wsFlat = XLSX.utils.json_to_sheet(flatData.length > 0 ? flatData : [{ 'Status': 'No transactions recorded yet' }]);
  XLSX.utils.book_append_sheet(wb, wsFlat, 'Transaction Log');

  // Tab 2: Two-Page Ledger Format (Like the physical book)
  const cashInList = transactions.filter(t => t.type === 'cash_in');
  // Day-end safe vault handovers are internal movements into vault, NEVER cash out / expenses
  const cashOutList = transactions.filter(t => t.type === 'cash_out' && !isDrawerToSafeTransfer(t));

  const maxRows = Math.max(cashInList.length, cashOutList.length);
  const ledgerRows = [];

  for (let i = 0; i < maxRows; i++) {
    const outItem = cashOutList[i];
    const inItem = cashInList[i];

    ledgerRows.push({
      // Cash Out side (Left)
      'OUT_Sr': outItem ? i + 1 : '',
      'OUT_Verified': outItem ? (outItem.verified ? '(✓)' : '') : '',
      'OUT_Amount': outItem ? outItem.amount : '',
      'OUT_Mode': outItem 
        ? (outItem.transferDestination === 'individual' 
            ? 'SAFE➔INDIVIDUAL' 
            : outItem.transferDestination === 'bank' 
            ? 'SAFE➔BANK' 
            : outItem.transferDestination === 'safe' 
            ? 'DRAWER➔SAFE' 
            : outItem.paymentMode === 'online' 
            ? 'ONLINE' 
            : 'CASH') 
        : '',
      'OUT_Description': outItem ? `${outItem.description} ${(outItem.receiptNumber || outItem.biltyNumber) ? `[Receipt #${outItem.receiptNumber || outItem.biltyNumber}]` : ''}` : '',
      
      '': '||', // Separator column

      // Cash In side (Right)
      'IN_Sr': inItem ? i + 1 : '',
      'IN_Staff': inItem ? (inItem.isRefund ? `${inItem.salesperson || 'Staff'} (Refund)` : inItem.salesperson) : '',
      'IN_Bill_No': inItem ? (inItem.isRefund ? (inItem.billNumber ? `Ref #${inItem.billNumber}` : 'Return') : inItem.billNumber) : '',
      'IN_Mode': inItem ? (inItem.paymentMode === 'online' ? 'ONLINE' : 'CASH') : '',
      'IN_Amount': inItem ? inItem.amount : ''
    });
  }

  // Calculate totals (excluding safe handovers from expenses)
  const totalCashIn = transactions.filter(t => t.type === 'cash_in').reduce((sum, t) => sum + t.amount, 0);
  const totalOnlineIn = transactions.filter(t => t.type === 'cash_in' && t.paymentMode === 'online').reduce((sum, t) => sum + t.amount, 0);
  const totalPhysicalCashIn = totalCashIn - totalOnlineIn;

  const totalCashOut = transactions.filter(t => t.type === 'cash_out' && !isDrawerToSafeTransfer(t)).reduce((sum, t) => sum + t.amount, 0);
  const totalPhysicalCashOut = transactions.filter(t => t.type === 'cash_out' && !isDrawerToSafeTransfer(t) && t.paymentMode !== 'online').reduce((sum, t) => sum + t.amount, 0);
  const totalOnlineCashOut = totalCashOut - totalPhysicalCashOut;

  const netPhysicalDrawer = openingCash + totalPhysicalCashIn - totalPhysicalCashOut;

  // Append Summary Row
  ledgerRows.push({
    'OUT_Sr': 'TOTAL OUT',
    'OUT_Verified': '',
    'OUT_Amount': totalCashOut,
    'OUT_Mode': `Cash: ${totalPhysicalCashOut} | Online: ${totalOnlineCashOut}`,
    'OUT_Description': `Total Disbursements: Rs. ${totalCashOut.toLocaleString()}`,
    '': '||',
    'IN_Sr': 'TOTAL IN',
    'IN_Staff': 'All Sales',
    'IN_Bill_No': '',
    'IN_Mode': `Cash: ${totalPhysicalCashIn.toLocaleString()} | Online: ${totalOnlineIn.toLocaleString()}`,
    'IN_Amount': totalCashIn
  });

  const wsLedger = XLSX.utils.json_to_sheet(ledgerRows.length > 0 ? ledgerRows : [{ 'Status': 'No entries for ledger' }]);
  XLSX.utils.book_append_sheet(wb, wsLedger, 'Two-Page Ledger View');

  // Tab 3: Daily Summary & Balance
  const variance = drawerCashInHand - netPhysicalDrawer;
  const summaryData = [
    { Metric: 'Ledger Date', Value: selectedDate || new Date().toISOString().split('T')[0] },
    { Metric: 'Opening Cash Balance / Float', Value: `Rs. ${openingCash.toLocaleString()}` },
    { Metric: 'Total Gross Sales (Cash + Online)', Value: `Rs. ${totalCashIn.toLocaleString()}` },
    { Metric: '  - Physical Cash Sales In', Value: `Rs. ${totalPhysicalCashIn.toLocaleString()}` },
    { Metric: '  - Online Sales In', Value: `Rs. ${totalOnlineIn.toLocaleString()}` },
    { Metric: 'Total Expenses / Disbursements', Value: `Rs. ${totalCashOut.toLocaleString()}` },
    { Metric: '  - Physical Cash Paid Out', Value: `Rs. ${totalPhysicalCashOut.toLocaleString()}` },
    { Metric: '  - Online / Bank Paid Out', Value: `Rs. ${totalOnlineCashOut.toLocaleString()}` },
    { Metric: 'Theoretical Physical Cash in Drawer', Value: `Rs. ${netPhysicalDrawer.toLocaleString()}` },
    { Metric: 'Closing Cash in Drawer', Value: `Rs. ${drawerCashInHand.toLocaleString()}` },
    { Metric: 'Safe Previous Running Balance', Value: `Rs. ${(safeData?.safeRunningBalance || 0).toLocaleString()}` },
    { Metric: 'Cash Transferred to Safe (Today)', Value: `Rs. ${(safeData?.safeTransferAmount || 0).toLocaleString()}` },
    { Metric: 'Separate Vault Direct Deposits (Committee / Other)', Value: `Rs. ${(safeData?.vaultDepositsTotal || 0).toLocaleString()}` },
    { Metric: 'Total Safe Cash (Vault Total)', Value: `Rs. ${(safeData?.totalSafeCash || 0).toLocaleString()}` },
    { Metric: 'Remaining Drawer Cash (Tomorrow Float)', Value: `Rs. ${(drawerCashInHand - (safeData?.safeTransferAmount || 0)).toLocaleString()}` }
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Daily Closing Summary');

  // Tab 4: Separate Vault Direct Deposits (Committee, Capital, etc.)
  if (safeData?.vaultDeposits && safeData.vaultDeposits.length > 0) {
    const vaultRows = safeData.vaultDeposits.map((d, i) => ({
      'Sr #': i + 1,
      'Date': d.date,
      'Time': d.time,
      'Category': d.categoryLabel,
      'Amount (PKR)': d.amount,
      'Particulars / Notes': d.notes || '-'
    }));
    const wsVault = XLSX.utils.json_to_sheet(vaultRows);
    XLSX.utils.book_append_sheet(wb, wsVault, 'Vault Separate Deposits');
  }

  // Tab 4: Physical Denomination Count Slip
  if (denominations) {
    const noteKeys = [5000, 1000, 500, 100, 50, 20, 10];
    const denomRows: Array<{ 'Banknote': string; 'Quantity': number | string; 'Subtotal': number }> = noteKeys.map(note => {
      const count = denominations[note] || 0;
      return {
        'Banknote': `Rs. ${note}`,
        'Quantity': count,
        'Subtotal': count * note
      };
    });
    denomRows.push({
      'Banknote': 'Loose Coins / Change',
      'Quantity': 1,
      'Subtotal': denominations['coins'] || 0
    });
    denomRows.push({
      'Banknote': 'TOTAL PHYSICAL CASH IN HAND',
      'Quantity': '',
      'Subtotal': drawerCashInHand
    });
    const wsDenom = XLSX.utils.json_to_sheet(denomRows);
    XLSX.utils.book_append_sheet(wb, wsDenom, 'Denomination Slip');
  }

  // File name
  const fileName = `Daily_Sales_Ledger_${selectedDate || 'today'}.xlsx`;
  
  try {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 200);
  } catch (e) {
    console.warn('Blob download fallback to XLSX.writeFile:', e);
    XLSX.writeFile(wb, fileName);
  }
}

export function exportToCSV(transactions: Transaction[], selectedDate: string) {
  const headers = ['ID', 'Date', 'Time', 'Type', 'Main_Category', 'Party_Name', 'Amount_PKR', 'Payment_Mode', 'Salesperson', 'Bill_No', 'Category', 'Description', 'Receipt_No', 'Verified'];
  const rows = transactions.map((t, idx) => {
    const mainCat = t.type === 'cash_in'
      ? (t.isRefund ? 'Expense Refund' : 'Sales Revenue')
      : (getMainCashOutCategory(t) === 'vendor_payments'
          ? 'Vendor Payments'
          : getMainCashOutCategory(t) === 'market_payments'
          ? 'Market Payments (Creditor)'
          : getMainCashOutCategory(t) === 'internal_transfer'
          ? 'Internal Transfer'
          : 'Expenses');

    return [
      t.id || `TX-${idx + 1}`,
      t.date || selectedDate,
      t.time || '',
      t.type,
      `"${mainCat}"`,
      `"${(t.partyName || (t.transferDestination === 'individual' ? t.salesperson : '') || '').replace(/"/g, '""')}"`,
      t.amount,
      t.paymentMode || 'cash',
      `"${(t.salesperson || '').replace(/"/g, '""')}"`,
      `"${(t.billNumber || '').replace(/"/g, '""')}"`,
      `"${(t.category || '').replace(/"/g, '""')}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${(t.receiptNumber || t.biltyNumber || '').replace(/"/g, '""')}"`,
      t.verified ? 'YES' : 'NO'
    ];
  });

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Sales_Ledger_${selectedDate || 'records'}.csv`);
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 200);
}

