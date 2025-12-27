// src/database/supplierTransactionRepo.ts
import SyncService from "../services/SyncService"; // ✅ ADD THIS
import db from "./db";

export interface SupplierTransaction {
  id: number;
  supplier_id: number;
  user_id: number;
  business_id: number | null;
  type: "credit" | "debit";
  amount: number;
  note?: string | null;
  date: string;
  firestore_id?: string; // ✅ ADD THIS
  sync_status?: string; // ✅ ADD THIS
  updated_at?: string; // ✅ ADD THIS
}

export const getTransactionsForSupplier = async (
  userId: number,
  supplierId: number
): Promise<SupplierTransaction[]> => {
  // ✅ ADD: Deduplicate by firestore_id or unique combination
  const rows = await db.getAllAsync<SupplierTransaction>(
    `SELECT DISTINCT id, supplier_id, user_id, business_id, type, amount, note, date
     FROM supplier_transactions
     WHERE user_id = ? AND supplier_id = ?
     GROUP BY COALESCE(firestore_id, id)  
     ORDER BY created_at DESC`,
    [userId, supplierId]
  );
  return rows ?? [];
};

export const addSupplierTransaction = async (
  userId: number,
  businessId: number,
  supplierId: number,
  type: "credit" | "debit",
  amount: number,
  note: string,
  date: string
): Promise<number> => {
  // ✅ CHANGED: Return number (transaction ID)
  // ✅ UPDATED: Add sync fields
  const result = await db.runAsync(
    `INSERT INTO supplier_transactions (supplier_id, user_id, business_id, type, amount, note, date, sync_status, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    [
      supplierId,
      userId,
      businessId,
      type,
      amount,
      note,
      date,
      new Date().toISOString(),
    ]
  );

  const transactionId = result.lastInsertRowId;

  // Update supplier balance
  const delta = type === "credit" ? amount : -amount;
  await db.runAsync(
    `UPDATE suppliers 
     SET balance = balance + ?, last_activity = ?, sync_status = 'pending', updated_at = ? 
     WHERE id = ? AND user_id = ?`,
    [delta, date, new Date().toISOString(), supplierId, userId]
  );

  // ✅ ADD: Queue both for sync
  await SyncService.queueForSync("supplier_transactions", transactionId);
  await SyncService.queueForSync("suppliers", supplierId);

  return transactionId; // ✅ ADD: Return the ID
};

export const updateSupplierTransaction = async (
  userId: number,
  supplierId: number,
  transactionId: number,
  oldType: "credit" | "debit",
  oldAmount: number,
  newType: "credit" | "debit",
  newAmount: number,
  newNote: string,
  newDate: string
): Promise<void> => {
  const oldDelta = oldType === "credit" ? -oldAmount : oldAmount;
  const newDelta = newType === "credit" ? newAmount : -newAmount;
  const netDelta = oldDelta + newDelta;

  // ✅ UPDATED: Add sync fields
  await db.runAsync(
    `UPDATE supplier_transactions 
     SET type = ?, amount = ?, note = ?, date = ?, sync_status = 'pending', updated_at = ? 
     WHERE id = ? AND user_id = ?`,
    [
      newType,
      newAmount,
      newNote,
      newDate,
      new Date().toISOString(),
      transactionId,
      userId,
    ]
  );

  // Update supplier balance
  await db.runAsync(
    `UPDATE suppliers 
     SET balance = balance + ?, last_activity = ?, sync_status = 'pending', updated_at = ? 
     WHERE id = ? AND user_id = ?`,
    [netDelta, newDate, new Date().toISOString(), supplierId, userId]
  );

  // ✅ ADD: Queue both for sync
  await SyncService.queueForSync("supplier_transactions", transactionId);
  await SyncService.queueForSync("suppliers", supplierId);
};

export const deleteSupplierTransaction = async (
  userId: number,
  supplierId: number,
  transactionId: number,
  type: "credit" | "debit",
  amount: number
): Promise<void> => {
  // Delete the supplier transaction
  await db.runAsync(
    `DELETE FROM supplier_transactions WHERE id = ? AND user_id = ?`,
    [transactionId, userId]
  );

  // Revert supplier balance
  const delta = type === "credit" ? -amount : amount;
  const now = new Date().toLocaleString("en-IN");
  await db.runAsync(
    `UPDATE suppliers 
     SET balance = balance + ?, last_activity = ?, sync_status = 'pending', updated_at = ? 
     WHERE id = ? AND user_id = ?`,
    [delta, now, new Date().toISOString(), supplierId, userId]
  );

  // ✅ ADD: Queue supplier for sync (transaction is deleted, so only supplier needs sync)
  await SyncService.queueForSync("suppliers", supplierId);

  // ⚠️ NOTE: Transaction deletion is not synced to Firestore
  // If you need to sync deletions, use a "deleted" flag instead:
  // await db.runAsync(
  //   `UPDATE supplier_transactions SET deleted = 1, sync_status = 'pending', updated_at = ? WHERE id = ? AND user_id = ?`,
  //   [new Date().toISOString(), transactionId, userId]
  // );
  // await SyncService.queueForSync("supplier_transactions", transactionId);
};
