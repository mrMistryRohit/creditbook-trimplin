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
}

export const getTransactionsForSupplier = async (
  userId: number,
  supplierId: number
): Promise<SupplierTransaction[]> => {
  const rows = await db.getAllAsync<SupplierTransaction>(
    `SELECT id, supplier_id, user_id, business_id, type, amount, note, date
     FROM supplier_transactions
     WHERE user_id = ? AND supplier_id = ?
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
): Promise<void> => {
  await db.runAsync(
    `INSERT INTO supplier_transactions (supplier_id, user_id, business_id, type, amount, note, date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [supplierId, userId, businessId, type, amount, note, date]
  );

  const delta = type === "credit" ? amount : -amount;
  await db.runAsync(
    `UPDATE suppliers SET balance = balance + ?, last_activity = ? WHERE id = ? AND user_id = ?`,
    [delta, date, supplierId, userId]
  );
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

  await db.runAsync(
    `UPDATE supplier_transactions SET type = ?, amount = ?, note = ?, date = ? WHERE id = ? AND user_id = ?`,
    [newType, newAmount, newNote, newDate, transactionId, userId]
  );

  await db.runAsync(
    `UPDATE suppliers SET balance = balance + ?, last_activity = ? WHERE id = ? AND user_id = ?`,
    [netDelta, newDate, supplierId, userId]
  );
};

export const deleteSupplierTransaction = async (
  userId: number,
  supplierId: number,
  transactionId: number,
  type: "credit" | "debit",
  amount: number
): Promise<void> => {
  await db.runAsync(
    `DELETE FROM supplier_transactions WHERE id = ? AND user_id = ?`,
    [transactionId, userId]
  );

  const delta = type === "credit" ? -amount : amount;
  const now = new Date().toLocaleString("en-IN");
  await db.runAsync(
    `UPDATE suppliers SET balance = balance + ?, last_activity = ? WHERE id = ? AND user_id = ?`,
    [delta, now, supplierId, userId]
  );
};
