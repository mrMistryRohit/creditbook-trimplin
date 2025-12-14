import db from "./db";

export interface Supplier {
    id: number;
    user_id: number;
    name: string;
    phone?: string | null;
    balance: number;
    last_activity?: string | null;
    archived?: number; // 0 = active, 1 = archived
}

export const getSuppliersByUser = async (
    userId: number,
    includeArchived = false
): Promise<Supplier[]> => {
    const query = includeArchived
        ? `SELECT id, user_id, name, phone, balance, last_activity, archived FROM suppliers WHERE user_id = ? ORDER BY created_at DESC`
        : `SELECT id, user_id, name, phone, balance, last_activity, archived FROM suppliers WHERE user_id = ? AND (archived = 0 OR archived IS NULL) ORDER BY created_at DESC`;

    const rows = await db.getAllAsync<Supplier>(query, [userId]);
    return rows ?? [];
};

export const addSupplier = async (
    userId: number,
    name: string,
    phone?: string
): Promise<void> => {
    const now = "Today";
    await db.runAsync(
        "INSERT INTO suppliers (user_id, name, phone, balance, last_activity, archived) VALUES (?, ?, ?, ?, ?, ?)",
        [userId, name, phone || "", 0, now, 0]
    );
};

export const updateSupplier = async (
    userId: number,
    supplierId: number,
    name: string,
    phone?: string
): Promise<void> => {
    await db.runAsync(
        "UPDATE suppliers SET name = ?, phone = ? WHERE id = ? AND user_id = ?",
        [name, phone || "", supplierId, userId]
    );
};

export const archiveSupplier = async (
    userId: number,
    supplierId: number
): Promise<void> => {
    await db.runAsync(
        "UPDATE suppliers SET archived = 1 WHERE id = ? AND user_id = ?",
        [supplierId, userId]
    );
};

export const unarchiveSupplier = async (
    userId: number,
    supplierId: number
): Promise<void> => {
    await db.runAsync(
        "UPDATE suppliers SET archived = 0 WHERE id = ? AND user_id = ?",
        [supplierId, userId]
    );
};

export const deleteSupplier = async (
    userId: number,
    supplierId: number
): Promise<void> => {
    // Delete all transactions first
    await db.runAsync(
        "DELETE FROM supplier_transactions WHERE supplier_id = ? AND user_id = ?",
        [supplierId, userId]
    );

    // Delete supplier
    await db.runAsync("DELETE FROM suppliers WHERE id = ? AND user_id = ?", [
        supplierId,
        userId,
    ]);
};
