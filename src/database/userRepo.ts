import db from "./db";

export const updateUserProfile = async (
  id: number,
  name: string,
  shopName?: string
) => {
  await db.runAsync("UPDATE users SET name = ?, shop_name = ? WHERE id = ?", [
    name,
    shopName || "",
    id,
  ]);
};
