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
  // Insert transaction
  await db.runAsync(
    `INSERT INTO transactions (customer_id, user_id, type, amount, note, date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [customerId, userId, type, amount, note, date]
  );

  // Update customer balance
  // credit = customer owes you more -> balance +amount
  // debit  = customer paid you      -> balance -amount
  const delta = type === "credit" ? amount : -amount;

  await db.runAsync(
    `UPDATE customers
     SET balance = balance + ?, last_activity = ?
     WHERE id = ? AND user_id = ?`,
    [delta, date, customerId, userId]
  );
};
