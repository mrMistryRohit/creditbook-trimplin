import db from "./db";

export interface Customer {
  created_at: string | undefined;
  id: number;
  user_id: number;
  business_id: number | null;
  name: string;
  phone?: string | null;
  balance: number;
  last_activity?: string | null;
  archived?: number;
  due_date?: string | null;
}

export const getCustomersByUser = async (
  userId: number,
  businessId: number,
  includeArchived = false
): Promise<Customer[]> => {
  const baseSelect =
    "SELECT id, user_id, business_id, name, phone, balance, last_activity, archived, due_date FROM customers";

  const query = includeArchived
    ? `${baseSelect} WHERE user_id = ? AND business_id = ? ORDER BY created_at DESC`
    : `${baseSelect} WHERE user_id = ? AND business_id = ? AND (archived = 0 OR archived IS NULL) ORDER BY created_at DESC`;

  const rows = await db.getAllAsync<Customer>(query, [userId, businessId]);
  return rows ?? [];
};

export const getCustomerById = async (
  customerId: number
): Promise<Customer | null> => {
  return await db.getFirstAsync<Customer>(
    `SELECT * FROM customers WHERE id = ?`,
    [customerId]
  );
};

export const addCustomer = async (
  userId: number,
  businessId: number,
  name: string,
  phone?: string
): Promise<void> => {
  const now = "Today";
  await db.runAsync(
    "INSERT INTO customers (user_id, business_id, name, phone, balance, last_activity, archived, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [userId, businessId, name, phone || "", 0, now, 0, null] // due_date null initially
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

export const unarchiveCustomer = async (
  userId: number,
  customerId: number
): Promise<void> => {
  await db.runAsync(
    "UPDATE customers SET archived = 0 WHERE id = ? AND user_id = ?",
    [customerId, userId]
  );
};

export const deleteCustomer = async (
  userId: number,
  customerId: number
): Promise<void> => {
  await db.runAsync(
    "DELETE FROM transactions WHERE customer_id = ? AND user_id = ?",
    [customerId, userId]
  );
  await db.runAsync("DELETE FROM customers WHERE id = ? AND user_id = ?", [
    customerId,
    userId,
  ]);
};

export const updateCustomerDueDate = async (
  userId: number,
  customerId: number,
  dueDate: string | null
): Promise<void> => {
  await db.runAsync(
    "UPDATE customers SET due_date = ? WHERE id = ? AND user_id = ?",
    [dueDate, customerId, userId]
  );
};
