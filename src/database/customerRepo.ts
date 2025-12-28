// src/database/customerRepo.ts
import SyncService from "../services/SyncService";
import { compressImageToBase64 } from "../utils/imageHelper"; // ✅ ADD THIS
import db from "./db";

export interface Customer {
  id: number;
  user_id: number;
  business_id: number | null;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  photo_uri?: string | null; // ✅ Now stores base64
  balance: number;
  last_activity?: string | null;
  archived?: number;
  due_date?: string | null;
  sms_enabled?: number;
  created_at?: string;
  firestore_id?: string;
  sync_status?: string;
  updated_at?: string;
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
  const now = "Today";

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

  const customerId = result.lastInsertRowId;
  await SyncService.queueForSync("customers", customerId);

  return customerId;
};

export const updateCustomer = async (
  userId: number,
  customerId: number,
  name: string,
  phone?: string
): Promise<void> => {
  await db.runAsync(
    `UPDATE customers 
     SET name = ?, phone = ?, sync_status = 'pending', updated_at = ? 
     WHERE id = ? AND user_id = ?`,
    [name, phone || "", new Date().toISOString(), customerId, userId]
  );

  await SyncService.queueForSync("customers", customerId);
};

/**
 * ✅ UPDATED: Update customer with all enhanced fields + image compression
 */
export const updateCustomerFull = async (
  userId: number,
  customerId: number,
  data: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    photo_uri?: string; // Can be file:// or base64
    sms_enabled?: number;
  }
): Promise<void> => {
  let finalPhotoUri = data.photo_uri;

  // ✅ NEW: If photo is a local file (not base64), compress it
  if (finalPhotoUri && !finalPhotoUri.startsWith("data:image")) {
    console.log("📸 Compressing image to base64...");
    finalPhotoUri = await compressImageToBase64(finalPhotoUri);
    console.log("✅ Image compressed");
  }

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
      finalPhotoUri || null,
      data.sms_enabled !== undefined ? data.sms_enabled : 1,
      new Date().toISOString(),
      customerId,
      userId,
    ]
  );

  await SyncService.queueForSync("customers", customerId);
};

/**
 * ✅ NEW: Update customer photo with compression and sync
 */
export const updateCustomerPhotoWithSync = async (
  userId: number,
  customerId: number,
  imageUri: string
): Promise<void> => {
  try {
    console.log("📸 Compressing customer photo...");

    // Compress image to base64
    const base64Photo = await compressImageToBase64(imageUri);

    console.log("📸 Photo compressed to base64");

    // Update SQLite
    await db.runAsync(
      `UPDATE customers 
       SET photo_uri = ?, sync_status = 'pending', updated_at = ?
       WHERE id = ? AND user_id = ?`,
      [base64Photo, new Date().toISOString(), customerId, userId]
    );

    console.log("✅ Photo saved to SQLite");

    // Queue for Firestore sync
    await SyncService.queueForSync("customers", customerId);

    console.log("✅ Queued for Firebase sync");
  } catch (error) {
    console.error("Error updating customer photo:", error);
    throw error;
  }
};

/**
 * ✅ UPDATED: Update only customer photo with compression
 */
export const updateCustomerPhoto = async (
  userId: number,
  customerId: number,
  photoUri: string | null
): Promise<void> => {
  let finalPhotoUri = photoUri;

  // ✅ NEW: Compress if it's a local file
  if (finalPhotoUri && !finalPhotoUri.startsWith("data:image")) {
    finalPhotoUri = await compressImageToBase64(finalPhotoUri);
  }

  await db.runAsync(
    `UPDATE customers 
     SET photo_uri = ?, sync_status = 'pending', updated_at = ? 
     WHERE id = ? AND user_id = ?`,
    [finalPhotoUri, new Date().toISOString(), customerId, userId]
  );

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
  await db.runAsync(
    `UPDATE customers 
     SET sms_enabled = ?, sync_status = 'pending', updated_at = ? 
     WHERE id = ? AND user_id = ?`,
    [smsEnabled, new Date().toISOString(), customerId, userId]
  );

  await SyncService.queueForSync("customers", customerId);
};

export const archiveCustomer = async (
  userId: number,
  customerId: number
): Promise<void> => {
  await db.runAsync(
    `UPDATE customers 
     SET archived = 1, sync_status = 'pending', updated_at = ? 
     WHERE id = ? AND user_id = ?`,
    [new Date().toISOString(), customerId, userId]
  );

  await SyncService.queueForSync("customers", customerId);
};

export const unarchiveCustomer = async (
  userId: number,
  customerId: number
): Promise<void> => {
  await db.runAsync(
    `UPDATE customers 
     SET archived = 0, sync_status = 'pending', updated_at = ? 
     WHERE id = ? AND user_id = ?`,
    [new Date().toISOString(), customerId, userId]
  );

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
};

export const updateCustomerDueDate = async (
  userId: number,
  customerId: number,
  dueDate: string | null
): Promise<void> => {
  await db.runAsync(
    `UPDATE customers 
     SET due_date = ?, sync_status = 'pending', updated_at = ? 
     WHERE id = ? AND user_id = ?`,
    [dueDate, new Date().toISOString(), customerId, userId]
  );

  await SyncService.queueForSync("customers", customerId);
};

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

  await SyncService.queueForSync("customers", customerId);
};
