// src/database/businessRepo.ts
import SyncService from "../services/SyncService";
import { compressImageToBase64 } from "../utils/imageHelper"; // ✅ ADD THIS
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
  logo_uri?: string | null; // ✅ Stores base64
  is_default: number;
  created_at: string;
  firestore_id?: string;
  sync_status?: string;
  updated_at?: string;
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

  await SyncService.queueForSync("businesses", businessId);
};

/**
 * ✅ UPDATED: Update business with all enhanced fields + image compression
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
    logo_uri?: string; // Can be file:// or base64
  }
): Promise<void> => {
  let finalLogoUri = data.logo_uri;

  // ✅ NEW: Compress logo if it's a local file
  if (finalLogoUri && !finalLogoUri.startsWith("data:image")) {
    console.log("📸 Compressing business logo...");
    finalLogoUri = await compressImageToBase64(finalLogoUri);
    console.log("✅ Business logo compressed");
  }

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
      finalLogoUri || null,
      new Date().toISOString(),
      businessId,
    ]
  );

  await SyncService.queueForSync("businesses", businessId);
};

/**
 * ✅ UPDATED: Update only business logo with compression
 */
export const updateBusinessLogo = async (
  businessId: number,
  logoUri: string | null
): Promise<void> => {
  let finalLogoUri = logoUri;

  // ✅ NEW: Compress if it's a local file
  if (finalLogoUri && !finalLogoUri.startsWith("data:image")) {
    console.log("📸 Compressing business logo...");
    finalLogoUri = await compressImageToBase64(finalLogoUri);
    console.log("✅ Business logo compressed");
  }

  await db.runAsync(
    `UPDATE businesses SET logo_uri = ?, sync_status = 'pending', updated_at = ? WHERE id = ?`,
    [finalLogoUri, new Date().toISOString(), businessId]
  );

  await SyncService.queueForSync("businesses", businessId);
};

/**
 * ✅ NEW: Update business logo with sync (dedicated function)
 */
export const updateBusinessLogoWithSync = async (
  businessId: number,
  imageUri: string
): Promise<void> => {
  try {
    console.log("📸 Compressing business logo...");

    // Compress image to base64
    const base64Logo = await compressImageToBase64(imageUri);

    console.log("📸 Logo compressed to base64");

    // Update SQLite
    await db.runAsync(
      `UPDATE businesses 
       SET logo_uri = ?, sync_status = 'pending', updated_at = ?
       WHERE id = ?`,
      [base64Logo, new Date().toISOString(), businessId]
    );

    console.log("✅ Logo saved to SQLite");

    // Queue for Firestore sync
    await SyncService.queueForSync("businesses", businessId);

    console.log("✅ Queued for Firebase sync");
  } catch (error) {
    console.error("Error updating business logo:", error);
    throw error;
  }
};

export const setDefaultBusiness = async (
  userId: number,
  businessId: number
): Promise<void> => {
  await db.runAsync(
    `UPDATE businesses SET is_default = 0, sync_status = 'pending', updated_at = ? WHERE user_id = ?`,
    [new Date().toISOString(), userId]
  );

  await db.runAsync(
    `UPDATE businesses SET is_default = 1, sync_status = 'pending', updated_at = ? WHERE id = ? AND user_id = ?`,
    [new Date().toISOString(), businessId, userId]
  );

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
};
