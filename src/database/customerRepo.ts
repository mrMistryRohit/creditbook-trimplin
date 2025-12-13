import db from "./db";

export interface Customer {
  id: number;
  user_id: number;
  name: string;
  phone?: string | null;
  balance: number;
  last_activity?: string | null;
  archived?: number; // 0 = active, 1 = archived
}

export const getCustomersByUser = async (
  userId: number,
  includeArchived = false
): Promise<Customer[]> => {
  const query = includeArchived
    ? `SELECT id, user_id, name, phone, balance, last_activity, archived FROM customers WHERE user_id = ? ORDER BY created_at DESC`
    : `SELECT id, user_id, name, phone, balance, last_activity, archived FROM customers WHERE user_id = ? AND (archived = 0 OR archived IS NULL) ORDER BY created_at DESC`;

  const rows = await db.getAllAsync<Customer>(query, [userId]);
  return rows ?? [];
};

export const addCustomer = async (
  userId: number,
  name: string,
  phone?: string
): Promise<void> => {
  const now = "Today";
  await db.runAsync(
    "INSERT INTO customers (user_id, name, phone, balance, last_activity, archived) VALUES (?, ?, ?, ?, ?, ?)",
    [userId, name, phone || "", 0, now, 0]
  );
};

export const updateCustomer = async (
  userId: number,
  customerId: number,
  name: string,
  phone?: string
): Promise<void> => {
  await db.runAsync(
    "UPDATE customers SET name = ?, phone = ? WHERE id = ? AND user_id = ?",
    [name, phone || "", customerId, userId]
  );
};

export const archiveCustomer = async (
  userId: number,
  customerId: number
): Promise<void> => {
  await db.runAsync(
    "UPDATE customers SET archived = 1 WHERE id = ? AND user_id = ?",
    [customerId, userId]
  );
};

export const deleteCustomer = async (
  userId: number,
  customerId: number
): Promise<void> => {
  // Delete all transactions first
  await db.runAsync(
    "DELETE FROM transactions WHERE customer_id = ? AND user_id = ?",
    [customerId, userId]
  );

  // Delete customer
  await db.runAsync("DELETE FROM customers WHERE id = ? AND user_id = ?", [
    customerId,
    userId,
  ]);
};
