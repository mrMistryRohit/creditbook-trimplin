// src/database/transactionRepo.ts
import SyncService from "../services/SyncService"; // ✅ ADD THIS
import db from "./db";

export interface Transaction {
  id: number;
  customer_id: number;
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

export const getTransactionsForCustomer = async (
  userId: number,
  customerId: number
): Promise<Transaction[]> => {
  // ✅ FIX: Select ALL fields including sync fields
  const rows = await db.getAllAsync<Transaction>(
    `SELECT id, customer_id, user_id, business_id, type, amount, note, date, 
            firestore_id, sync_status, created_at, updated_at
     FROM transactions
     WHERE user_id = ? AND customer_id = ?
     ORDER BY date DESC, created_at DESC`,
    [userId, customerId]
  );

  // ✅ FIX: Deduplicate by firestore_id
  if (!rows || rows.length === 0) return [];

  const seen = new Map<string, Transaction>();

  for (const row of rows) {
    // Create a unique key: use firestore_id if available, otherwise use all fields
    const key =
      row.firestore_id ||
      `${row.customer_id}-${row.amount}-${row.type}-${row.date}-${
        row.note || "null"
      }`;

    // If we've seen this key before, skip it
    if (seen.has(key)) {
      console.warn(`⚠️ Skipping duplicate transaction: ${key}`);
      continue;
    }

    seen.set(key, row);
  }

  const uniqueTransactions = Array.from(seen.values());

  console.log(
    `📊 Transactions: ${rows.length} total → ${uniqueTransactions.length} unique`
  );

  return uniqueTransactions;
};

export const addTransactionForCustomer = async (
  userId: number,
  businessId: number,
  customerId: number,
  type: "credit" | "debit",
  amount: number,
  note: string,
  date: string
): Promise<number> => {
  // ✅ CHANGED: Return number (transaction ID)
  // ✅ UPDATED: Add sync fields
  const result = await db.runAsync(
    `INSERT INTO transactions (customer_id, user_id, business_id, type, amount, note, date, sync_status, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    [
      customerId,
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

  // Update customer balance
  const delta = type === "credit" ? amount : -amount;
  await db.runAsync(
    `UPDATE customers 
     SET balance = balance + ?, last_activity = ?, sync_status = 'pending', updated_at = ? 
     WHERE id = ? AND user_id = ?`,
    [delta, date, new Date().toISOString(), customerId, userId]
  );

  // ✅ ADD: Queue both for sync
  await SyncService.queueForSync("transactions", transactionId);
  await SyncService.queueForSync("customers", customerId);

  return transactionId; // ✅ ADD: Return the ID
};

export const updateTransaction = async (
  userId: number,
  customerId: number,
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
    `UPDATE transactions 
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

  // Update customer balance
  await db.runAsync(
    `UPDATE customers 
     SET balance = balance + ?, last_activity = ?, sync_status = 'pending', updated_at = ? 
     WHERE id = ? AND user_id = ?`,
    [netDelta, newDate, new Date().toISOString(), customerId, userId]
  );

  // ✅ ADD: Queue both for sync
  await SyncService.queueForSync("transactions", transactionId);
  await SyncService.queueForSync("customers", customerId);
};

export const deleteTransaction = async (
  userId: number,
  customerId: number,
  transactionId: number,
  type: "credit" | "debit",
  amount: number
): Promise<void> => {
  // Delete the transaction
  await db.runAsync(`DELETE FROM transactions WHERE id = ? AND user_id = ?`, [
    transactionId,
    userId,
  ]);

  // Revert customer balance
  const delta = type === "credit" ? -amount : amount;
  const now = new Date().toLocaleString("en-IN");

  await db.runAsync(
    `UPDATE customers 
     SET balance = balance + ?, last_activity = ?, sync_status = 'pending', updated_at = ? 
     WHERE id = ? AND user_id = ?`,
    [delta, now, new Date().toISOString(), customerId, userId]
  );

  // ✅ ADD: Queue customer for sync (transaction is deleted, so only customer needs sync)
  await SyncService.queueForSync("customers", customerId);

  // ⚠️ NOTE: Transaction deletion is not synced to Firestore
  // If you need to sync deletions, use a "deleted" flag instead:
  // await db.runAsync(
  //   `UPDATE transactions SET deleted = 1, sync_status = 'pending', updated_at = ? WHERE id = ? AND user_id = ?`,
  //   [new Date().toISOString(), transactionId, userId]
  // );
  // await SyncService.queueForSync("transactions", transactionId);
};
