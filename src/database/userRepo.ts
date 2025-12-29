import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, firestore } from "../config/firebase";

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

  return userId;
};

export async function syncUserProfile(localUser: User) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  await setDoc(
    doc(firestore, "users", uid),
    {
      user_id: uid,
      email: localUser.email,
      name: localUser.name,
      phone: localUser.phone || "",
      shop_name: localUser.shop_name || "",
      updated_at: new Date(),
    },
    { merge: true }
  );

  console.log("✅ User profile synced to Firestore");
}

export const getUserByEmail = async (email: string): Promise<User | null> => {
  return await db.getFirstAsync<User>(
    `SELECT 
      id,
      name,
      email,
      phone,
      shop_name,
      firestore_id,
      sync_status,
      updated_at
     FROM users 
     WHERE email = ?`,
    [email]
  );
};

export const updateUserProfile = async (
  userId: number,
  name: string,
  shopName: string
) => {
  await db.runAsync(
    `UPDATE users 
     SET name=?, shop_name=?, updated_at=? 
     WHERE id=?`,
    [name, shopName, new Date().toISOString(), userId]
  );

  const localUser = await db.getFirstAsync<User>(
    "SELECT * FROM users WHERE id=?",
    [userId]
  );

  if (localUser) {
    await syncUserProfile(localUser);
  }
};

export async function hydrateUserFromFirestore(uid: string) {
  const snap = await getDoc(doc(firestore, "users", uid));
  if (!snap.exists()) return;

  const data = snap.data();

  await db.runAsync(
    `
    UPDATE users
    SET
      name = ?,
      phone = ?,
      shop_name = ?,
      updated_at = ?
    WHERE email = ?
    `,
    [
      data.name ?? "",
      data.phone ?? "",
      data.shop_name ?? "",
      new Date().toISOString(),
      data.email.toLowerCase(),
    ]
  );

  console.log("✅ User hydrated from Firestore");
}
