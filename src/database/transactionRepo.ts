import db from "./db";

export interface Transaction {
  id: number;
  customer_id: number;
  user_id: number;
  type: "credit" | "debit";
  amount: number;
  note?: string | null;
  date: string;
}

export const getTransactionsForCustomer = async (
  userId: number,
  customerId: number
): Promise<Transaction[]> => {
  const rows = await db.getAllAsync<Transaction>(
    `SELECT id, customer_id, user_id, type, amount, note, date
     FROM transactions
     WHERE user_id = ? AND customer_id = ?
     ORDER BY created_at DESC`,
    [userId, customerId]
  );
  return rows ?? [];
};

export const addTransactionForCustomer = async (
  userId: number,
  customerId: number,
  type: "credit" | "debit",
  amount: number,
  note: string,
  date: string
): Promise<void> => {
  await db.runAsync(
    `INSERT INTO transactions (customer_id, user_id, type, amount, note, date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [customerId, userId, type, amount, note, date]
  );

  const delta = type === "credit" ? amount : -amount;
  await db.runAsync(
    `UPDATE customers SET balance = balance + ?, last_activity = ? WHERE id = ? AND user_id = ?`,
    [delta, date, customerId, userId]
  );
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
  // Reverse old transaction impact
  const oldDelta = oldType === "credit" ? -oldAmount : oldAmount;
  // Apply new transaction impact
  const newDelta = newType === "credit" ? newAmount : -newAmount;
  const netDelta = oldDelta + newDelta;

  await db.runAsync(
    `UPDATE transactions SET type = ?, amount = ?, note = ?, date = ? WHERE id = ? AND user_id = ?`,
    [newType, newAmount, newNote, newDate, transactionId, userId]
  );

  await db.runAsync(
    `UPDATE customers SET balance = balance + ?, last_activity = ? WHERE id = ? AND user_id = ?`,
    [netDelta, newDate, customerId, userId]
  );
};

export const deleteTransaction = async (
  userId: number,
  customerId: number,
  transactionId: number,
  type: "credit" | "debit",
  amount: number
): Promise<void> => {
  await db.runAsync(`DELETE FROM transactions WHERE id = ? AND user_id = ?`, [
    transactionId,
    userId,
  ]);

  // Reverse the transaction impact
  const delta = type === "credit" ? -amount : amount;
  const now = new Date().toLocaleString("en-IN");

  await db.runAsync(
    `UPDATE customers SET balance = balance + ?, last_activity = ? WHERE id = ? AND user_id = ?`,
    [delta, now, customerId, userId]
  );
};
