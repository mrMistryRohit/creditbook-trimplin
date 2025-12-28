// src/database/supplierRepo.ts
import SyncService from "../services/SyncService";
import db from "./db";

export interface Supplier {
  id: number;
  user_id: number;
  business_id: number | null;
  name: string;
  phone?: string | null;
  balance: number;
  last_activity?: string | null;
  archived?: number;
  firestore_id?: string;
  sync_status?: string;
  updated_at?: string;
}

export const getSuppliersByUser = async (
  userId: number,
  businessId: number,
  includeArchived = false
): Promise<Supplier[]> => {
  const query = includeArchived
    ? `SELECT id, user_id, business_id, name, phone, balance, last_activity, archived 
       FROM suppliers WHERE user_id = ? AND business_id = ? ORDER BY created_at DESC`
    : `SELECT id, user_id, business_id, name, phone, balance, last_activity, archived 
       FROM suppliers WHERE user_id = ? AND business_id = ? AND (archived = 0 OR archived IS NULL) 
       ORDER BY created_at DESC`;

  const rows = await db.getAllAsync<Supplier>(query, [userId, businessId]);
  return rows ?? [];
};

export const getSupplierById = async (
  supplierId: number
): Promise<Supplier | null> => {
  return await db.getFirstAsync<Supplier>(
    `SELECT * FROM suppliers WHERE id = ?`,
    [supplierId]
  );
};

/**
 * ✅ FIXED: Add duplicate checking
 */
export const addSupplier = async (
  userId: number,
  businessId: number,
  name: string,
  phone?: string
): Promise<number> => {
  // ✅ CRITICAL: Check for duplicate supplier
  const existing = await db.getFirstAsync<{ id: number }>(
    `SELECT id FROM suppliers 
     WHERE business_id = ? AND name = ? AND user_id = ? AND (archived = 0 OR archived IS NULL)`,
    [businessId, name, userId]
  );

  if (existing) {
    console.warn(
      `⚠️ Supplier "${name}" already exists in business ${businessId}`
    );
    throw new Error(`Supplier "${name}" already exists`);
  }

  const now = new Date().toISOString();

  const result = await db.runAsync(
    `INSERT INTO suppliers (user_id, business_id, name, phone, balance, last_activity, archived, sync_status, updated_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    [userId, businessId, name, phone || null, 0, now, 0, now]
  );

  const supplierId = result.lastInsertRowId;
  await SyncService.queueForSync("suppliers", supplierId);

  console.log(`✅ Added supplier: ${name} (ID: ${supplierId})`);
  return supplierId;
};

/**
 * ✅ FIXED: Add duplicate checking during update
 */
export const updateSupplier = async (
  userId: number,
  supplierId: number,
  name: string,
  phone?: string
): Promise<void> => {
  // ✅ Check if another supplier with same name exists
  const existing = await db.getFirstAsync<{ id: number }>(
    `SELECT id FROM suppliers 
     WHERE business_id = (SELECT business_id FROM suppliers WHERE id = ?) 
     AND name = ? AND user_id = ? AND id != ?`,
    [supplierId, name, userId, supplierId]
  );

  if (existing) {
    console.warn(`⚠️ Another supplier with name "${name}" already exists`);
    throw new Error(`Supplier "${name}" already exists`);
  }

  const now = new Date().toISOString();

  await db.runAsync(
    `UPDATE suppliers 
     SET name = ?, phone = ?, sync_status = 'pending', updated_at = ? 
     WHERE id = ? AND user_id = ?`,
    [name, phone || null, now, supplierId, userId]
  );

  await SyncService.queueForSync("suppliers", supplierId);
};

export const archiveSupplier = async (
  userId: number,
  supplierId: number
): Promise<void> => {
  const now = new Date().toISOString();

  await db.runAsync(
    `UPDATE suppliers 
     SET archived = 1, sync_status = 'pending', updated_at = ? 
     WHERE id = ? AND user_id = ?`,
    [now, supplierId, userId]
  );

  await SyncService.queueForSync("suppliers", supplierId);
};

export const unarchiveSupplier = async (
  userId: number,
  supplierId: number
): Promise<void> => {
  const now = new Date().toISOString();

  await db.runAsync(
    `UPDATE suppliers 
     SET archived = 0, sync_status = 'pending', updated_at = ? 
     WHERE id = ? AND user_id = ?`,
    [now, supplierId, userId]
  );

  await SyncService.queueForSync("suppliers", supplierId);
};

export const deleteSupplier = async (
  userId: number,
  supplierId: number
): Promise<void> => {
  // First delete all supplier transactions
  await db.runAsync(
    "DELETE FROM supplier_transactions WHERE supplier_id = ? AND user_id = ?",
    [supplierId, userId]
  );

  // Then delete the supplier
  await db.runAsync("DELETE FROM suppliers WHERE id = ? AND user_id = ?", [
    supplierId,
    userId,
  ]);

  // NOTE: Physical deletion - not synced to Firestore
  // Consider using soft delete (archive) instead for sync support
};

/**
 * ✅ Helper function to update supplier balance
 */
export const updateSupplierBalance = async (
  supplierId: number,
  newBalance: number
): Promise<void> => {
  const now = new Date().toISOString();

  await db.runAsync(
    `UPDATE suppliers 
     SET balance = ?, last_activity = ?, sync_status = 'pending', updated_at = ? 
     WHERE id = ?`,
    [newBalance, now, now, supplierId]
  );

  await SyncService.queueForSync("suppliers", supplierId);
};
