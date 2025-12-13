import db from "./db";

export interface Customer {
  id: number;
  user_id: number;
  name: string;
  phone?: string | null;
  balance: number;
  last_activity?: string | null;
}

export const getCustomersByUser = async (
  userId: number
): Promise<Customer[]> => {
  const rows = await db.getAllAsync<Customer>(
    "SELECT id, user_id, name, phone, balance, last_activity FROM customers WHERE user_id = ? ORDER BY created_at DESC",
    [userId]
  );
  return rows ?? [];
};

export const addCustomer = async (
  userId: number,
  name: string,
  phone?: string
): Promise<void> => {
  const now = "Today";
  await db.runAsync(
    "INSERT INTO customers (user_id, name, phone, balance, last_activity) VALUES (?, ?, ?, ?, ?)",
    [userId, name, phone || "", 0, now]
  );
};
