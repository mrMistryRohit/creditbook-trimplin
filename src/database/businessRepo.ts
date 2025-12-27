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
    `INSERT INTO businesses (user_id, name, description, phone, address, is_default) VALUES (?, ?, ?, ?, ?, 0)`,
    [userId, name, description || null, phone || null, address || null]
  );
  return result.lastInsertRowId;
};

export const updateBusiness = async (
  businessId: number,
  name: string,
  description?: string,
  phone?: string,
  address?: string
): Promise<void> => {
  await db.runAsync(
    `UPDATE businesses SET name = ?, description = ?, phone = ?, address = ? WHERE id = ?`,
    [name, description || null, phone || null, address || null, businessId]
  );
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
      logo_uri = ?
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
      businessId,
    ]
  );
};

/**
 * Update only business logo
 */
export const updateBusinessLogo = async (
  businessId: number,
  logoUri: string | null
): Promise<void> => {
  await db.runAsync(`UPDATE businesses SET logo_uri = ? WHERE id = ?`, [
    logoUri,
    businessId,
  ]);
};

export const setDefaultBusiness = async (
  userId: number,
  businessId: number
): Promise<void> => {
  await db.runAsync(`UPDATE businesses SET is_default = 0 WHERE user_id = ?`, [
    userId,
  ]);
  await db.runAsync(
    `UPDATE businesses SET is_default = 1 WHERE id = ? AND user_id = ?`,
    [businessId, userId]
  );
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
