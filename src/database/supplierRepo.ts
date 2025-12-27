// src/database/supplierRepo.ts
import SyncService from "../services/SyncService"; // ✅ ADD THIS
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
  firestore_id?: string; // ✅ ADD THIS
  sync_status?: string; // ✅ ADD THIS
  updated_at?: string; // ✅ ADD THIS
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

export const addSupplier = async (
  userId: number,
  businessId: number,
  name: string,
  phone?: string
): Promise<number> => {
  // ✅ CHANGED: Return number (supplier ID)
  const now = "Today";

  // ✅ UPDATED: Add sync fields
  const result = await db.runAsync(
    `INSERT INTO suppliers (user_id, business_id, name, phone, balance, last_activity, archived, sync_status, updated_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    [userId, businessId, name, phone || "", 0, now, 0, new Date().toISOString()]
  );

  // ✅ ADD: Queue for sync
  const supplierId = result.lastInsertRowId;
  await SyncService.queueForSync("suppliers", supplierId);

  return supplierId; // ✅ ADD: Return the ID
};

export const updateSupplier = async (
  userId: number,
  supplierId: number,
  name: string,
  phone?: string
): Promise<void> => {
  // ✅ UPDATED: Add sync fields
  await db.runAsync(
    `UPDATE suppliers 
     SET name = ?, phone = ?, sync_status = 'pending', updated_at = ? 
     WHERE id = ? AND user_id = ?`,
    [name, phone || "", new Date().toISOString(), supplierId, userId]
  );

  // ✅ ADD: Queue for sync
  await SyncService.queueForSync("suppliers", supplierId);
};

export const archiveSupplier = async (
  userId: number,
  supplierId: number
): Promise<void> => {
  // ✅ UPDATED: Add sync fields
  await db.runAsync(
    `UPDATE suppliers 
     SET archived = 1, sync_status = 'pending', updated_at = ? 
     WHERE id = ? AND user_id = ?`,
    [new Date().toISOString(), supplierId, userId]
  );

  // ✅ ADD: Queue for sync
  await SyncService.queueForSync("suppliers", supplierId);
};

export const unarchiveSupplier = async (
  userId: number,
  supplierId: number
): Promise<void> => {
  // ✅ UPDATED: Add sync fields
  await db.runAsync(
    `UPDATE suppliers 
     SET archived = 0, sync_status = 'pending', updated_at = ? 
     WHERE id = ? AND user_id = ?`,
    [new Date().toISOString(), supplierId, userId]
  );

  // ✅ ADD: Queue for sync
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

  // ⚠️ NOTE: Actual deletion - not synced to Firestore
  // If you want to sync deletions, use archive instead or add a "deleted" flag:
  // await db.runAsync(
  //   `UPDATE suppliers SET deleted = 1, sync_status = 'pending', updated_at = ? WHERE id = ? AND user_id = ?`,
  //   [new Date().toISOString(), supplierId, userId]
  // );
  // await SyncService.queueForSync("suppliers", supplierId);
};

// ✅ ADD: Helper function to update supplier balance (used by transactions)
export const updateSupplierBalance = async (
  supplierId: number,
  newBalance: number
): Promise<void> => {
  await db.runAsync(
    `UPDATE suppliers 
     SET balance = ?, last_activity = ?, sync_status = 'pending', updated_at = ? 
     WHERE id = ?`,
    [
      newBalance,
      new Date().toLocaleDateString("en-IN"),
      new Date().toISOString(),
      supplierId,
    ]
  );

  // ✅ ADD: Queue for sync
  await SyncService.queueForSync("suppliers", supplierId);
};
