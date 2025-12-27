import db from "./db";

export interface Customer {
  id: number;
  user_id: number;
  business_id: number | null;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  photo_uri?: string | null;
  balance: number;
  last_activity?: string | null;
  archived?: number;
  due_date?: string | null;
  sms_enabled?: number;
  created_at?: string;
}

export const getCustomersByUser = async (
  userId: number,
  businessId: number,
  includeArchived = false
): Promise<Customer[]> => {
  const baseSelect =
    "SELECT id, user_id, business_id, name, phone, email, address, photo_uri, balance, last_activity, archived, due_date, sms_enabled FROM customers";
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
    "INSERT INTO customers (user_id, business_id, name, phone, balance, last_activity, archived, due_date, sms_enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [userId, businessId, name, phone || "", 0, now, 0, null, 1] // sms_enabled default 1
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

/**
 * Update customer with all enhanced fields
 */
export const updateCustomerFull = async (
  userId: number,
  customerId: number,
  data: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    photo_uri?: string;
    sms_enabled?: number;
  }
): Promise<void> => {
  await db.runAsync(
    `UPDATE customers SET 
      name = ?, 
      phone = ?, 
      email = ?, 
      address = ?,
      photo_uri = ?,
      sms_enabled = ?
    WHERE id = ? AND user_id = ?`,
    [
      data.name,
      data.phone || null,
      data.email || null,
      data.address || null,
      data.photo_uri || null,
      data.sms_enabled !== undefined ? data.sms_enabled : 1,
      customerId,
      userId,
    ]
  );
};

/**
 * Update only customer photo
 */
export const updateCustomerPhoto = async (
  userId: number,
  customerId: number,
  photoUri: string | null
): Promise<void> => {
  await db.runAsync(
    "UPDATE customers SET photo_uri = ? WHERE id = ? AND user_id = ?",
    [photoUri, customerId, userId]
  );
};

/**
 * Update customer SMS settings
 */
export const updateCustomerSMSSettings = async (
  userId: number,
  customerId: number,
  smsEnabled: number
): Promise<void> => {
  await db.runAsync(
    "UPDATE customers SET sms_enabled = ? WHERE id = ? AND user_id = ?",
    [smsEnabled, customerId, userId]
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
