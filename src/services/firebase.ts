import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  onSnapshot, 
  getDocFromServer,
  writeBatch
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Transaction, VaultDeposit } from '../types';

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with the provisioned database ID
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

// Validate connection on boot
export async function testFirebaseConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase connection note (offline):', error.message);
    }
    return false;
  }
}

// -------------------------------------------------------------
// Real-time Cloud Listeners & Subscriptions
// -------------------------------------------------------------

export function subscribeToTransactions(onUpdate: (transactions: Transaction[]) => void, onError?: (err: any) => void) {
  const colRef = collection(db, 'transactions');
  return onSnapshot(colRef, (snapshot) => {
    const txList: Transaction[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data() as Transaction;
      txList.push({
        ...data,
        id: docSnap.id
      });
    });
    // Sort transactions by date and time descending
    txList.sort((a, b) => {
      const dtA = `${a.date} ${a.time || '00:00'}`;
      const dtB = `${b.date} ${b.time || '00:00'}`;
      return dtB.localeCompare(dtA);
    });
    onUpdate(txList);
  }, (error) => {
    console.error('Error listening to transactions:', error);
    if (onError) onError(error);
  });
}

export function subscribeToVaultDeposits(onUpdate: (deposits: VaultDeposit[]) => void, onError?: (err: any) => void) {
  const colRef = collection(db, 'vault_deposits');
  return onSnapshot(colRef, (snapshot) => {
    const list: VaultDeposit[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data() as VaultDeposit;
      list.push({
        ...data,
        id: docSnap.id
      });
    });
    list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    onUpdate(list);
  }, (error) => {
    console.error('Error listening to vault deposits:', error);
    if (onError) onError(error);
  });
}

export interface AppGlobalSettings {
  safeRunningBalance?: number;
  safeRunningBalanceDate?: string;
  safeRunningBalanceTime?: string;
  safeTransferAmount?: number;
  openingCashByDate?: Record<string, number>;
  staffList?: string[];
  bankName?: string;
  dailyDrawerHandovers?: Record<string, number>;
}

export function subscribeToSettings(onUpdate: (settings: AppGlobalSettings) => void, onError?: (err: any) => void) {
  const docRef = doc(db, 'settings', 'global');
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      onUpdate(snapshot.data() as AppGlobalSettings);
    }
  }, (error) => {
    console.error('Error listening to settings:', error);
    if (onError) onError(error);
  });
}

// Helper to strip undefined values which Firestore rejects
export function cleanForFirestore<T extends Record<string, any>>(obj: T): T {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        cleaned[key] = cleanForFirestore(value);
      } else {
        cleaned[key] = value;
      }
    }
  }
  return cleaned as T;
}

// -------------------------------------------------------------
// Cloud Write / Update Helpers
// -------------------------------------------------------------

export async function saveTransactionToCloud(tx: Transaction) {
  try {
    const docRef = doc(db, 'transactions', tx.id);
    await setDoc(docRef, cleanForFirestore(tx), { merge: true });
  } catch (error) {
    console.error('Error saving transaction to cloud:', error);
  }
}

export async function deleteTransactionFromCloud(id: string) {
  try {
    const docRef = doc(db, 'transactions', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting transaction from cloud:', error);
  }
}

export async function updateTransactionInCloud(id: string, updates: Partial<Transaction>) {
  try {
    const docRef = doc(db, 'transactions', id);
    await updateDoc(docRef, cleanForFirestore(updates as any));
  } catch (error) {
    console.error('Error updating transaction in cloud:', error);
  }
}

export async function saveVaultDepositToCloud(deposit: VaultDeposit) {
  try {
    const docRef = doc(db, 'vault_deposits', deposit.id);
    await setDoc(docRef, cleanForFirestore(deposit), { merge: true });
  } catch (error) {
    console.error('Error saving vault deposit to cloud:', error);
  }
}

export async function deleteVaultDepositFromCloud(id: string) {
  try {
    const docRef = doc(db, 'vault_deposits', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting vault deposit from cloud:', error);
  }
}

export async function saveSettingsToCloud(settings: Partial<AppGlobalSettings>) {
  try {
    const docRef = doc(db, 'settings', 'global');
    await setDoc(docRef, cleanForFirestore(settings), { merge: true });
  } catch (error) {
    console.error('Error saving settings to cloud:', error);
  }
}

// Batch upload all local items to cloud (for initial sync from phone or local)
export async function uploadLocalDataToCloud(
  transactions: Transaction[],
  vaultDeposits: VaultDeposit[],
  settings: AppGlobalSettings
) {
  try {
    // 1. Settings
    const cleanSettings = cleanForFirestore(settings);
    await setDoc(doc(db, 'settings', 'global'), cleanSettings, { merge: true });

    // 2. Chunk transactions into max 300 per batch
    const allOps: Array<() => void> = [];
    
    // Batch commit helper for chunks
    const chunkSize = 250;
    const txChunks: Transaction[][] = [];
    for (let i = 0; i < transactions.length; i += chunkSize) {
      txChunks.push(transactions.slice(i, i + chunkSize));
    }

    for (const chunk of txChunks) {
      const batch = writeBatch(db);
      for (const tx of chunk) {
        batch.set(doc(db, 'transactions', tx.id), cleanForFirestore(tx), { merge: true });
      }
      await batch.commit();
    }

    // 3. Vault deposits
    if (vaultDeposits.length > 0) {
      const depBatch = writeBatch(db);
      for (const dep of vaultDeposits) {
        depBatch.set(doc(db, 'vault_deposits', dep.id), cleanForFirestore(dep), { merge: true });
      }
      await depBatch.commit();
    }

    return true;
  } catch (error) {
    console.error('Error uploading local data batch to cloud:', error);
    throw error;
  }
}
