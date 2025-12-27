import SyncService from "../services/SyncService"; // ✅ ADD THIS
import db from "./db";

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  shop_name?: string;
  firestore_id?: string; // ✅ ADD THIS
  sync_status?: string; // ✅ ADD THIS
  updated_at?: string; // ✅ ADD THIS
}

export const createUser = async (
  name: string,
  email: string,
  password: string,
  phone?: string,
  shopName?: string
): Promise<number> => {
  // ✅ UPDATED: Add sync fields
  const result = await db.runAsync(
    `INSERT INTO users (name, email, password, phone, shop_name, sync_status, updated_at) 
     VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
    [
      name,
      email,
      password,
      phone || "",
      shopName || "",
      new Date().toISOString(),
    ]
  );

  const userId = result.lastInsertRowId;

  // ✅ ADD: Queue for sync
  await SyncService.queueForSync("users", userId);

  return userId;
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  return await db.getFirstAsync<User>(
    "SELECT id, name, email, phone, shop_name FROM users WHERE email = ?",
    [email]
  );
};

export const updateUserProfile = async (
  userId: number,
  name: string,
  shopName: string
): Promise<void> => {
  // ✅ UPDATED: Add sync fields
  await db.runAsync(
    `UPDATE users 
     SET name = ?, shop_name = ?, sync_status = 'pending', updated_at = ? 
     WHERE id = ?`,
    [name, shopName, new Date().toISOString(), userId]
  );

  // ✅ ADD: Queue for sync
  await SyncService.queueForSync("users", userId);
};
