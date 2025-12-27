import SyncService from "../services/SyncService"; // ✅ ADD THIS
import db from "./db";

export interface Business {
  id: number;
  user_id: number;
  name: string;
  description?: string | null;
  phone?: string | null;
  address?: string | null;
  business_type?: string | null;
  category?: string | null;
  gst_number?: string | null;
  pan_number?: string | null;
  website_url?: string | null;
  upi_id?: string | null;
  bank_account_number?: string | null;
  bank_ifsc?: string | null;
  bank_name?: string | null;
  logo_uri?: string | null;
  is_default: number;
  created_at: string;
  firestore_id?: string; // ✅ ADD THIS
  sync_status?: string; // ✅ ADD THIS
  updated_at?: string; // ✅ ADD THIS
}

export const getBusinessesByUser = async (
  userId: number
): Promise<Business[]> => {
  return await db.getAllAsync<Business>(
    `SELECT * FROM businesses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC`,
    [userId]
  );
};

export const getDefaultBusiness = async (
  userId: number
): Promise<Business | null> => {
  return await db.getFirstAsync<Business>(
    `SELECT * FROM businesses WHERE user_id = ? AND is_default = 1`,
    [userId]
  );
};

export const getBusinessById = async (
  businessId: number
): Promise<Business | null> => {
  return await db.getFirstAsync<Business>(
    `SELECT * FROM businesses WHERE id = ?`,
    [businessId]
  );
};

export const addBusiness = async (
  userId: number,
  name: string,
  description?: string,
  phone?: string,
  address?: string
): Promise<number> => {
  // ✅ UPDATED: Add sync fields
  const result = await db.runAsync(
    `INSERT INTO businesses (user_id, name, description, phone, address, is_default, sync_status, updated_at) 
     VALUES (?, ?, ?, ?, ?, 0, 'pending', ?)`,
    [
      userId,
      name,
      description || null,
      phone || null,
      address || null,
      new Date().toISOString(),
    ]
  );

  // ✅ ADD: Queue for sync
  const businessId = result.lastInsertRowId;
  await SyncService.queueForSync("businesses", businessId);

  return businessId;
};

export const updateBusiness = async (
  businessId: number,
  name: string,
  description?: string,
  phone?: string,
  address?: string
): Promise<void> => {
  // ✅ UPDATED: Add sync fields
  await db.runAsync(
    `UPDATE businesses 
     SET name = ?, description = ?, phone = ?, address = ?, sync_status = 'pending', updated_at = ? 
     WHERE id = ?`,
    [
      name,
      description || null,
      phone || null,
      address || null,
      new Date().toISOString(),
      businessId,
    ]
  );

  // ✅ ADD: Queue for sync
  await SyncService.queueForSync("businesses", businessId);
};

/**
 * Update business with all enhanced fields
 */
export const updateBusinessFull = async (
  businessId: number,
  data: {
    name: string;
    description?: string;
    phone?: string;
    address?: string;
    business_type?: string;
    category?: string;
    gst_number?: string;
    pan_number?: string;
    website_url?: string;
    upi_id?: string;
    bank_account_number?: string;
    bank_ifsc?: string;
    bank_name?: string;
    logo_uri?: string;
  }
): Promise<void> => {
  // ✅ UPDATED: Add sync fields
  await db.runAsync(
    `UPDATE businesses SET 
      name = ?, 
      description = ?, 
      phone = ?, 
      address = ?,
      business_type = ?,
      category = ?,
      gst_number = ?,
      pan_number = ?,
      website_url = ?,
      upi_id = ?,
      bank_account_number = ?,
      bank_ifsc = ?,
      bank_name = ?,
      logo_uri = ?,
      sync_status = 'pending',
      updated_at = ?
    WHERE id = ?`,
    [
      data.name,
      data.description || null,
      data.phone || null,
      data.address || null,
      data.business_type || null,
      data.category || null,
      data.gst_number || null,
      data.pan_number || null,
      data.website_url || null,
      data.upi_id || null,
      data.bank_account_number || null,
      data.bank_ifsc || null,
      data.bank_name || null,
      data.logo_uri || null,
      new Date().toISOString(), // ✅ ADD THIS
      businessId,
    ]
  );

  // ✅ ADD: Queue for sync
  await SyncService.queueForSync("businesses", businessId);
};

/**
 * Update only business logo
 */
export const updateBusinessLogo = async (
  businessId: number,
  logoUri: string | null
): Promise<void> => {
  // ✅ UPDATED: Add sync fields
  await db.runAsync(
    `UPDATE businesses SET logo_uri = ?, sync_status = 'pending', updated_at = ? WHERE id = ?`,
    [logoUri, new Date().toISOString(), businessId]
  );

  // ✅ ADD: Queue for sync
  await SyncService.queueForSync("businesses", businessId);
};

export const setDefaultBusiness = async (
  userId: number,
  businessId: number
): Promise<void> => {
  // ✅ UPDATED: Add sync fields to both queries
  await db.runAsync(
    `UPDATE businesses SET is_default = 0, sync_status = 'pending', updated_at = ? WHERE user_id = ?`,
    [new Date().toISOString(), userId]
  );

  await db.runAsync(
    `UPDATE businesses SET is_default = 1, sync_status = 'pending', updated_at = ? WHERE id = ? AND user_id = ?`,
    [new Date().toISOString(), businessId, userId]
  );

  // ✅ ADD: Queue for sync
  await SyncService.queueForSync("businesses", businessId);
};

export const deleteBusiness = async (businessId: number): Promise<void> => {
  const customers = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM customers WHERE business_id = ?`,
    [businessId]
  );

  const suppliers = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM suppliers WHERE business_id = ?`,
    [businessId]
  );

  if ((customers?.count || 0) > 0 || (suppliers?.count || 0) > 0) {
    throw new Error(
      "Cannot delete business with existing customers or suppliers"
    );
  }

  await db.runAsync(`DELETE FROM businesses WHERE id = ?`, [businessId]);

  // ⚠️ NOTE: Actual deletion - not synced to Firestore
  // If you want to sync deletions, use a "deleted" flag instead:
  // await db.runAsync(
  //   `UPDATE businesses SET deleted = 1, sync_status = 'pending', updated_at = ? WHERE id = ?`,
  //   [new Date().toISOString(), businessId]
  // );
  // await SyncService.queueForSync("businesses", businessId);
};
