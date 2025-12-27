// src/database/customerRepo.ts
import SyncService from "../services/SyncService"; // ✅ ADD THIS
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
  firestore_id?: string; // ✅ ADD THIS
  sync_status?: string; // ✅ ADD THIS
  updated_at?: string; // ✅ ADD THIS
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
): Promise<number> => {
  // ✅ CHANGED: Return number (customer ID)
  const now = "Today";

  // ✅ UPDATED: Add sync fields
  const result = await db.runAsync(
    `INSERT INTO customers (user_id, business_id, name, phone, balance, last_activity, archived, due_date, sms_enabled, sync_status, updated_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    [
      userId,
      businessId,
      name,
      phone || "",
      0,
      now,
      0,
      null,
      1,
      new Date().toISOString(),
    ]
  );

  // ✅ ADD: Queue for sync
  const customerId = result.lastInsertRowId;
  await SyncService.queueForSync("customers", customerId);

  return customerId; // ✅ ADD: Return the ID
};

export const updateCustomer = async (
  userId: number,
  customerId: number,
  name: string,
  phone?: string
): Promise<void> => {
  // ✅ UPDATED: Add sync fields
  await db.runAsync(
    `UPDATE customers 
     SET name = ?, phone = ?, sync_status = 'pending', updated_at = ? 
     WHERE id = ? AND user_id = ?`,
    [name, phone || "", new Date().toISOString(), customerId, userId]
  );

  // ✅ ADD: Queue for sync
  await SyncService.queueForSync("customers", customerId);
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
  // ✅ UPDATED: Add sync fields
  await db.runAsync(
    `UPDATE customers SET 
      name = ?, 
      phone = ?, 
      email = ?, 
      address = ?,
      photo_uri = ?,
      sms_enabled = ?,
      sync_status = 'pending',
      updated_at = ?
    WHERE id = ? AND user_id = ?`,
    [
      data.name,
      data.phone || null,
      data.email || null,
      data.address || null,
      data.photo_uri || null,
      data.sms_enabled !== undefined ? data.sms_enabled : 1,
      new Date().toISOString(), // ✅ ADD THIS
      customerId,
      userId,
    ]
  );

  // ✅ ADD: Queue for sync
  await SyncService.queueForSync("customers", customerId);
};

/**
 * Update only customer photo
 */
export const updateCustomerPhoto = async (
  userId: number,
  customerId: number,
  photoUri: string | null
): Promise<void> => {
  // ✅ UPDATED: Add sync fields
  await db.runAsync(
    `UPDATE customers 
     SET photo_uri = ?, sync_status = 'pending', updated_at = ? 
     WHERE id = ? AND user_id = ?`,
    [photoUri, new Date().toISOString(), customerId, userId]
  );

  // ✅ ADD: Queue for sync
  await SyncService.queueForSync("customers", customerId);
};

/**
 * Update customer SMS settings
 */
export const updateCustomerSMSSettings = async (
  userId: number,
  customerId: number,
  smsEnabled: number
): Promise<void> => {
  // ✅ UPDATED: Add sync fields
  await db.runAsync(
    `UPDATE customers 
     SET sms_enabled = ?, sync_status = 'pending', updated_at = ? 
     WHERE id = ? AND user_id = ?`,
    [smsEnabled, new Date().toISOString(), customerId, userId]
  );

  // ✅ ADD: Queue for sync
  await SyncService.queueForSync("customers", customerId);
};

export const archiveCustomer = async (
  userId: number,
  customerId: number
): Promise<void> => {
  // ✅ UPDATED: Add sync fields
  await db.runAsync(
    `UPDATE customers 
     SET archived = 1, sync_status = 'pending', updated_at = ? 
     WHERE id = ? AND user_id = ?`,
    [new Date().toISOString(), customerId, userId]
  );

  // ✅ ADD: Queue for sync
  await SyncService.queueForSync("customers", customerId);
};

export const unarchiveCustomer = async (
  userId: number,
  customerId: number
): Promise<void> => {
  // ✅ UPDATED: Add sync fields
  await db.runAsync(
    `UPDATE customers 
     SET archived = 0, sync_status = 'pending', updated_at = ? 
     WHERE id = ? AND user_id = ?`,
    [new Date().toISOString(), customerId, userId]
  );

  // ✅ ADD: Queue for sync
  await SyncService.queueForSync("customers", customerId);
};

export const deleteCustomer = async (
  userId: number,
  customerId: number
): Promise<void> => {
  // First delete all transactions
  await db.runAsync(
    "DELETE FROM transactions WHERE customer_id = ? AND user_id = ?",
    [customerId, userId]
  );

  // Then delete the customer
  await db.runAsync("DELETE FROM customers WHERE id = ? AND user_id = ?", [
    customerId,
    userId,
  ]);

  // ⚠️ NOTE: Actual deletion - not synced to Firestore
  // If you want to sync deletions, use archive instead or add a "deleted" flag:
  // await db.runAsync(
  //   `UPDATE customers SET deleted = 1, sync_status = 'pending', updated_at = ? WHERE id = ? AND user_id = ?`,
  //   [new Date().toISOString(), customerId, userId]
  // );
  // await SyncService.queueForSync("customers", customerId);
};

export const updateCustomerDueDate = async (
  userId: number,
  customerId: number,
  dueDate: string | null
): Promise<void> => {
  // ✅ UPDATED: Add sync fields
  await db.runAsync(
    `UPDATE customers 
     SET due_date = ?, sync_status = 'pending', updated_at = ? 
     WHERE id = ? AND user_id = ?`,
    [dueDate, new Date().toISOString(), customerId, userId]
  );

  // ✅ ADD: Queue for sync
  await SyncService.queueForSync("customers", customerId);
};

// ✅ ADD: Helper function to update customer balance (used by transactions)
export const updateCustomerBalance = async (
  customerId: number,
  newBalance: number
): Promise<void> => {
  await db.runAsync(
    `UPDATE customers 
     SET balance = ?, last_activity = ?, sync_status = 'pending', updated_at = ? 
     WHERE id = ?`,
    [
      newBalance,
      new Date().toLocaleDateString("en-IN"),
      new Date().toISOString(),
      customerId,
    ]
  );

  // ✅ ADD: Queue for sync
  await SyncService.queueForSync("customers", customerId);
};
