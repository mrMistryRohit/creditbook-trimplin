import db from "./db";
import { addTransactionForCustomer } from "./transactionRepo";

export interface Bill {
  id: number;
  user_id: number;
  business_id: number;
  customer_id: number;
  bill_number: string;
  bill_date: string;
  notes?: string | null;
  total: number;
  created_at: string;
}

export interface BillItem {
  id: number;
  bill_id: number;
  inventory_id?: number | null;
  item_name: string;
  quantity: number;
  unit: string;
  mrp: number;
  rate: number;
  total: number;
}

/**
 * Create a bill with items and decrease stock for items linked to inventory.
 */
export async function createBillWithItems(options: {
  userId: number;
  businessId: number;
  customerId: number;
  billNumber: string;
  billDate: string; // e.g. "2025-12-20"
  notes?: string;
  items: {
    inventoryId?: number;
    itemName: string;
    quantity: number;
    unit: string;
    mrp: number;
    rate: number;
  }[];
}): Promise<number> {
  const { userId, businessId, customerId, billNumber, billDate, notes, items } =
    options;

  const total = items.reduce((sum, it) => sum + it.quantity * it.rate, 0);

  await db.execAsync("BEGIN TRANSACTION;");

  try {
    const billResult = await db.runAsync(
      `INSERT INTO bills
       (user_id, business_id, customer_id, bill_number, bill_date, notes, total)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        businessId,
        customerId,
        billNumber,
        billDate,
        notes || null,
        total,
      ]
    );
    const billId = billResult.lastInsertRowId;

    for (const item of items) {
      const lineTotal = item.quantity * item.rate;

      await db.runAsync(
        `INSERT INTO bill_items
         (bill_id, inventory_id, item_name, quantity, unit, mrp, rate, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          billId,
          item.inventoryId ?? null,
          item.itemName,
          item.quantity,
          item.unit,
          item.mrp,
          item.rate,
          lineTotal,
        ]
      );

      if (item.inventoryId != null) {
        await db.runAsync(
          `UPDATE inventory
           SET quantity = quantity - ?
           WHERE id = ? AND business_id = ?`,
          [item.quantity, item.inventoryId, businessId]
        );
      }
    }

    await db.execAsync("COMMIT;");
    return billId;
  } catch (e) {
    await db.execAsync("ROLLBACK;");
    throw e;
  }
}

/**
 * Create bill + items + reduce stock + log transaction in customer ledger
 */
export async function createBillWithTransaction(options: {
  userId: number;
  businessId: number;
  customerId: number;
  billNumber: string;
  billDate: string;
  notes?: string;
  items: {
    inventoryId?: number;
    itemName: string;
    quantity: number;
    unit: string;
    mrp: number;
    rate: number;
  }[];
}): Promise<number> {
  console.log("📝 Creating bill with transaction...");

  // First create the bill
  const billId = await createBillWithItems(options);

  // Calculate total
  const total = options.items.reduce(
    (sum, it) => sum + it.quantity * it.rate,
    0
  );

  // Format date as Indian locale: "20/12/2025, 10:30:00 pm"
  const now = new Date();
  const formattedDate = now.toLocaleString("en-IN");

  console.log("💰 Adding transaction:", {
    userId: options.userId,
    businessId: options.businessId,
    customerId: options.customerId,
    amount: total,
    date: formattedDate,
  });

  // Log as credit transaction (customer owes you)
  await addTransactionForCustomer(
    options.userId,
    options.businessId,
    options.customerId,
    "credit",
    total,
    `Bill: ${options.billNumber}`,
    formattedDate // Use formatted date instead of billDate
  );

  console.log("✅ Transaction added, emitting event...");

  // Emit event to refresh reports and customer detail
  const { appEvents } = await import("../utils/events");
  appEvents.emit("customerUpdated");

  console.log("📣 Event emitted!");

  return billId;
}

/**
 * Get the next bill number for a business
 */
export async function getNextBillNumber(businessId: number): Promise<string> {
  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM bills WHERE business_id = ?`,
    [businessId]
  );

  const count = result?.count || 0;
  const nextNumber = count + 1;

  return `BILL-${nextNumber}`;
}

export async function getBillsForCustomer(
  businessId: number,
  customerId: number
): Promise<Bill[]> {
  return (
    (await db.getAllAsync<Bill>(
      `SELECT * FROM bills
       WHERE business_id = ? AND customer_id = ?
       ORDER BY created_at DESC`,
      [businessId, customerId]
    )) ?? []
  );
}

export async function getBillWithItems(
  billId: number
): Promise<{ bill: Bill; items: BillItem[] } | null> {
  const bill = await db.getFirstAsync<Bill>(
    `SELECT * FROM bills WHERE id = ?`,
    [billId]
  );
  if (!bill) return null;

  const items =
    (await db.getAllAsync<BillItem>(
      `SELECT * FROM bill_items WHERE bill_id = ? ORDER BY id ASC`,
      [billId]
    )) ?? [];

  return { bill, items };
}
