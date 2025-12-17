import db from "./db";

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  shop_name?: string;
}

export const createUser = async (
  name: string,
  email: string,
  password: string,
  phone?: string,
  shopName?: string
): Promise<number> => {
  const result = await db.runAsync(
    "INSERT INTO users (name, email, password, phone, shop_name) VALUES (?, ?, ?, ?, ?)",
    [name, email, password, phone || "", shopName || ""]
  );
  return result.lastInsertRowId; // ✅ Return the new user's ID
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
  await db.runAsync("UPDATE users SET name = ?, shop_name = ? WHERE id = ?", [
    name,
    shopName,
    userId,
  ]);
};
