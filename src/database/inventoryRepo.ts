// src/database/inventoryRepo.ts
import SyncService from "../services/SyncService";
import { compressImageToBase64 } from "../utils/imageHelper"; // ✅ ADD THIS
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
  photo_uri?: string; // ✅ Stores base64
  date_added: string;
  last_updated: string;
  firestore_id?: string;
  sync_status?: string;
  updated_at?: string;
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

/**
 * ✅ UPDATED: Add inventory item with image compression
 */
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
  let finalPhotoUri = photoUri;

  // ✅ NEW: Compress image if it's a local file
  if (finalPhotoUri && !finalPhotoUri.startsWith("data:image")) {
    console.log("📸 Compressing inventory item image...");
    finalPhotoUri = await compressImageToBase64(finalPhotoUri);
    console.log("✅ Inventory image compressed");
  }

  const result = await db.runAsync(
    `INSERT INTO inventory (business_id, item_name, quantity, unit, mrp, rate, product_code, tax_type, tax_included, photo_uri, sync_status, updated_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
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
      finalPhotoUri || null,
      new Date().toISOString(),
    ]
  );

  const itemId = result.lastInsertRowId;
  await SyncService.queueForSync("inventory", itemId);

  return itemId;
}

/**
 * ✅ UPDATED: Update inventory item with image compression
 */
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
  let finalPhotoUri = photoUri;

  // ✅ NEW: Compress image if it's a local file
  if (finalPhotoUri && !finalPhotoUri.startsWith("data:image")) {
    console.log("📸 Compressing inventory item image...");
    finalPhotoUri = await compressImageToBase64(finalPhotoUri);
    console.log("✅ Inventory image compressed");
  }

  await db.runAsync(
    `UPDATE inventory 
     SET item_name = ?, quantity = ?, unit = ?, mrp = ?, rate = ?, 
         product_code = ?, tax_type = ?, tax_included = ?, photo_uri = ?,
         last_updated = CURRENT_TIMESTAMP, sync_status = 'pending', updated_at = ?
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
      finalPhotoUri || null,
      new Date().toISOString(),
      itemId,
    ]
  );

  await SyncService.queueForSync("inventory", itemId);
}

/**
 * ✅ NEW: Update only inventory item photo
 */
export async function updateInventoryPhoto(
  itemId: number,
  photoUri: string | null
): Promise<void> {
  let finalPhotoUri = photoUri;

  // ✅ Compress if it's a local file
  if (finalPhotoUri && !finalPhotoUri.startsWith("data:image")) {
    finalPhotoUri = await compressImageToBase64(finalPhotoUri);
  }

  await db.runAsync(
    `UPDATE inventory 
     SET photo_uri = ?, last_updated = CURRENT_TIMESTAMP, sync_status = 'pending', updated_at = ?
     WHERE id = ?`,
    [finalPhotoUri, new Date().toISOString(), itemId]
  );

  await SyncService.queueForSync("inventory", itemId);
}

export async function updateInventoryQuantity(
  itemId: number,
  quantity: number
): Promise<void> {
  await db.runAsync(
    `UPDATE inventory 
     SET quantity = ?, last_updated = CURRENT_TIMESTAMP, sync_status = 'pending', updated_at = ? 
     WHERE id = ?`,
    [quantity, new Date().toISOString(), itemId]
  );

  await SyncService.queueForSync("inventory", itemId);
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
