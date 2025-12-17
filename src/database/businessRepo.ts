import db from "./db";

export interface Business {
  id: number;
  user_id: number;
  name: string;
  description?: string | null;
  phone?: string | null;
  address?: string | null;
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
