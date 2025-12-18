import db from "./db";

export interface InventoryItem {
  id: number;
  business_id: number;
  item_name: string;
  quantity: number;
  unit: string;
  mrp: number;
  rate: number;
  product_code?: string;
  tax_type: string;
  tax_included: string;
  photo_uri?: string;
  date_added: string;
  last_updated: string;
}

export const UNIT_OPTIONS = [
  "Nos",
  "Bags",
  "Bottles",
  "Box",
  "Cans",
  "Dozens",
  "Feet",
  "Grams",
  "Kg",
  "Liters",
  "Meters",
  "Pieces",
  "Packs",
];

export const TAX_TYPES = ["No Tax", "GST 5%", "GST 12%", "GST 18%", "GST 28%"];
export const TAX_INCLUDED_OPTIONS = ["Included", "Excluded"];

export async function getInventoryByBusiness(
  businessId: number
): Promise<InventoryItem[]> {
  const items = await db.getAllAsync<InventoryItem>(
    `SELECT * FROM inventory WHERE business_id = ? ORDER BY last_updated DESC`,
    [businessId]
  );
  return items || [];
}

export async function addInventoryItem(
  businessId: number,
  itemName: string,
  quantity: number,
  unit: string,
  mrp: number,
  rate: number,
  productCode?: string,
  taxType: string = "No Tax",
  taxIncluded: string = "Included",
  photoUri?: string
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO inventory (business_id, item_name, quantity, unit, mrp, rate, product_code, tax_type, tax_included, photo_uri) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      businessId,
      itemName,
      quantity,
      unit,
      mrp,
      rate,
      productCode || null,
      taxType,
      taxIncluded,
      photoUri || null,
    ]
  );
  return result.lastInsertRowId;
}

export async function updateInventoryItem(
  itemId: number,
  itemName: string,
  quantity: number,
  unit: string,
  mrp: number,
  rate: number,
  productCode?: string,
  taxType?: string,
  taxIncluded?: string,
  photoUri?: string
): Promise<void> {
  await db.runAsync(
    `UPDATE inventory 
     SET item_name = ?, quantity = ?, unit = ?, mrp = ?, rate = ?, 
         product_code = ?, tax_type = ?, tax_included = ?, photo_uri = ?,
         last_updated = CURRENT_TIMESTAMP 
     WHERE id = ?`,
    [
      itemName,
      quantity,
      unit,
      mrp,
      rate,
      productCode || null,
      taxType || "No Tax",
      taxIncluded || "Included",
      photoUri || null,
      itemId,
    ]
  );
}

export async function updateInventoryQuantity(
  itemId: number,
  quantity: number
): Promise<void> {
  await db.runAsync(
    `UPDATE inventory SET quantity = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?`,
    [quantity, itemId]
  );
}

export async function deleteInventoryItem(itemId: number): Promise<void> {
  await db.runAsync(`DELETE FROM inventory WHERE id = ?`, [itemId]);
}

export async function getInventoryItem(
  itemId: number
): Promise<InventoryItem | null> {
  const item = await db.getFirstAsync<InventoryItem>(
    `SELECT * FROM inventory WHERE id = ?`,
    [itemId]
  );
  return item || null;
}

export async function searchInventory(
  businessId: number,
  query: string
): Promise<InventoryItem[]> {
  const items = await db.getAllAsync<InventoryItem>(
    `SELECT * FROM inventory 
     WHERE business_id = ? AND (item_name LIKE ? OR product_code LIKE ?)
     ORDER BY item_name ASC`,
    [businessId, `%${query}%`, `%${query}%`]
  );
  return items || [];
}
