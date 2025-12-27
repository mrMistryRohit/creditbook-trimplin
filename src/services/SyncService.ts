// src/services/SyncService.ts
import NetInfo from "@react-native-community/netinfo";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  Timestamp,
  where,
} from "firebase/firestore";
import { firestore } from "../config/firebase";
import db, {
  getLastSyncTime,
  getPendingItems,
  markAsPendingSync,
  markAsSynced,
  updateLastSyncTime,
} from "../database/db";
import { appEvents } from "../utils/events";

interface SyncConfig {
  userId: string;
  enabled: boolean;
  autoSync: boolean;
  syncInterval: number;
}

class SyncService {
  private config: SyncConfig | null = null;
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private realtimeUnsubscribers: (() => void)[] = [];
  private isSyncing = false;
  private isOnline = false;

  async initializeSync(userId: string): Promise<void> {
    console.log("🔄 Initializing SyncService for user:", userId);
    this.config = {
      userId,
      enabled: true,
      autoSync: true,
      syncInterval: 50000,
    };

    this.setupNetworkListener();
    await this.setupRealtimeListeners();
    this.startPeriodicSync();
    await this.syncNow(userId);
    console.log("✅ SyncService initialized");
  }

  private setupNetworkListener(): void {
    NetInfo.addEventListener((state) => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;
      console.log(`📡 Network status: ${this.isOnline ? "Online" : "Offline"}`);

      if (!wasOnline && this.isOnline && this.config?.userId) {
        console.log("📡 Back online - triggering sync");
        this.syncNow(this.config.userId);
      }
    });
  }

  private startPeriodicSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    if (this.config?.autoSync) {
      this.syncTimer = setInterval(() => {
        if (this.config?.userId && this.isOnline) {
          this.syncNow(this.config.userId);
        }
      }, this.config.syncInterval);
    }
  }

  stopPeriodicSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  private async setupRealtimeListeners(): Promise<void> {
    if (!this.config?.userId) return;
    const userId = this.config.userId;

    const tables = [
      "businesses",
      "customers",
      "suppliers",
      "transactions",
      "supplier_transactions",
      "inventory",
      "bills",
      "bill_items",
    ];

    this.realtimeUnsubscribers.forEach((unsub) => unsub());
    this.realtimeUnsubscribers = [];

    for (const table of tables) {
      const q = query(
        collection(firestore, table),
        where("user_id", "==", userId)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === "added" || change.type === "modified") {
              this.downloadDocument(table, change.doc.id, change.doc.data());
            } else if (change.type === "removed") {
              this.deleteLocalDocument(table, change.doc.id);
            }
          });
        },
        (error) => {
          console.error(`❌ Realtime listener error for ${table}:`, error);
        }
      );

      this.realtimeUnsubscribers.push(unsubscribe);
    }

    console.log("✅ Realtime listeners setup for all collections");
  }

  async syncNow(userId: string): Promise<void> {
    if (!this.isOnline) {
      console.log("⚠️ Cannot sync - offline");
      return;
    }

    if (this.isSyncing) {
      console.log("⚠️ Sync already in progress");
      return;
    }

    this.isSyncing = true;
    console.log("🔄 Starting sync...");

    try {
      await this.uploadPendingChanges(userId);
      await this.downloadNewChanges(userId);
      await updateLastSyncTime();
      console.log("✅ Sync completed successfully");

      appEvents.emit("syncCompleted");
    } catch (error) {
      console.error("❌ Sync failed:", error);
    } finally {
      this.isSyncing = false;
    }
  }

  private async uploadPendingChanges(userId: string): Promise<void> {
    console.log("⬆️ Uploading pending changes...");

    const tables = [
      "businesses",
      "customers",
      "suppliers",
      "transactions",
      "supplier_transactions",
      "inventory",
      "bills",
      "bill_items",
    ];

    for (const table of tables) {
      try {
        const pendingItems = await getPendingItems(table);
        if (pendingItems.length === 0) continue;

        console.log(`⬆️ Uploading ${pendingItems.length} items from ${table}`);

        for (const item of pendingItems) {
          try {
            const firestoreData = await this.prepareForFirestore(item, userId); // ✅ ADD AWAIT
            const docId =
              item.firestore_id || doc(collection(firestore, table)).id;

            await setDoc(doc(firestore, table, docId), firestoreData, {
              merge: true,
            });

            await markAsSynced(table, item.id, docId);
            console.log(
              `✅ Uploaded ${table}/${item.id} to Firestore as ${docId}`
            );
          } catch (error) {
            console.error(`❌ Failed to upload ${table}/${item.id}:`, error);
          }
        }
      } catch (error) {
        console.error(`❌ Error uploading from ${table}:`, error);
      }
    }

    console.log("✅ Upload complete");
  }

  private async downloadNewChanges(userId: string): Promise<void> {
    console.log("⬇️ Downloading new changes...");

    const tables = [
      "businesses",
      "customers",
      "suppliers",
      "transactions",
      "supplier_transactions",
      "inventory",
      "bills",
      "bill_items",
    ];

    const lastSync = await getLastSyncTime();
    const lastSyncDate = lastSync ? new Date(lastSync) : new Date(0);

    for (const table of tables) {
      try {
        const q = query(
          collection(firestore, table),
          where("user_id", "==", userId),
          where("updated_at", ">", Timestamp.fromDate(lastSyncDate))
        );

        const snapshot = await getDocs(q);
        if (snapshot.empty) continue;

        console.log(`⬇️ Downloading ${snapshot.size} items to ${table}`);

        for (const docSnap of snapshot.docs) {
          await this.downloadDocument(table, docSnap.id, docSnap.data());
        }
      } catch (error) {
        console.error(`❌ Error downloading ${table}:`, error);
      }
    }

    console.log("✅ Download complete");
  }

  // HELPER METHOD
  private tableHasSyncColumns(table: string): boolean {
    // bill_items and inventory don't have firestore_id/sync_status
    return !["bill_items"].includes(table);
  }

  // ✅ MODIFY downloadDocument METHOD
  private async downloadDocument(
    table: string,
    firestoreId: string,
    data: any
  ): Promise<void> {
    try {
      // ✅ For bill_items, use bill_id to check for existing records
      if (table === "bill_items") {
        // ✅ Map bill_firestore_id to local bill_id
        let sqliteBillId: number | null = null;
        if (data.bill_firestore_id) {
          const bill = await db.getFirstAsync<{ id: number }>(
            `SELECT id FROM bills WHERE firestore_id = ?`,
            [data.bill_firestore_id]
          );
          if (!bill) {
            console.warn(
              `⚠️ Bill not found for bill_item (bill_firestore_id: ${data.bill_firestore_id}), skipping`
            );
            return;
          }
          sqliteBillId = bill.id;
        }

        // ✅ Check if already exists by EXACT match (bill_id + all fields)
        const existing = await db.getFirstAsync<{ id: number }>(
          `SELECT id FROM bill_items 
     WHERE bill_id = ? AND item_name = ? AND quantity = ? AND rate = ? AND total = ?`,
          [
            sqliteBillId || data.bill_id,
            data.item_name || data.name || "",
            data.quantity || 0,
            data.rate || 0,
            data.total || 0,
          ]
        );

        if (existing) {
          console.log(
            `⚠️ Bill item already exists (bill_id: ${sqliteBillId}, item: ${data.item_name}), skipping duplicate`
          );
          return; // ✅ Skip duplicate
        }

        const sqliteData = this.prepareForSQLiteComplete(
          table,
          data,
          firestoreId,
          1,
          null,
          null,
          null
        );

        const columns = Object.keys(sqliteData).join(", ");
        const placeholders = Object.keys(sqliteData)
          .map(() => "?")
          .join(", ");
        const values = Object.values(sqliteData);

        await db.runAsync(
          `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`,
          values as any[]
        );

        console.log(`✅ Inserted ${table} for bill_id ${sqliteBillId}`);
        return;
      }

      // ✅ Deduplication for supplier_transactions
      if (table === "supplier_transactions") {
        const existing = await db.getFirstAsync<{ id: number }>(
          `SELECT id FROM supplier_transactions WHERE firestore_id = ?`,
          [firestoreId]
        );

        if (existing) {
          console.log(
            `⚠️ Supplier transaction ${firestoreId} already exists, skipping`
          );
          return;
        }

        let sqliteSupplierId: number | null = null;
        if (data.supplier_firestore_id) {
          const supplier = await db.getFirstAsync<{ id: number }>(
            `SELECT id FROM suppliers WHERE firestore_id = ?`,
            [data.supplier_firestore_id]
          );

          if (!supplier) {
            console.warn(
              `⚠️ Supplier not found for supplier_transactions ${firestoreId}, skipping`
            );
            return;
          }
          sqliteSupplierId = supplier.id;
        }

        if (sqliteSupplierId) {
          const duplicate = await db.getFirstAsync<{ id: number }>(
            `SELECT id FROM supplier_transactions 
           WHERE supplier_id = ? AND amount = ? AND date = ? AND type = ?`,
            [
              sqliteSupplierId,
              data.amount || 0,
              data.date || "",
              data.type || "credit",
            ]
          );

          if (duplicate) {
            await db.runAsync(
              `UPDATE supplier_transactions SET firestore_id = ?, sync_status = 'synced' WHERE id = ?`,
              [firestoreId, duplicate.id]
            );
            console.log(
              `✅ Linked existing supplier_transaction/${duplicate.id} to Firestore/${firestoreId}`
            );
            return;
          }
        }
      }

      // ✅ Deduplication for inventory
      if (table === "inventory") {
        const existing = await db.getFirstAsync<{ id: number }>(
          `SELECT id FROM inventory WHERE firestore_id = ?`,
          [firestoreId]
        );

        if (existing) {
          console.log(
            `⚠️ Inventory item ${firestoreId} already exists, skipping`
          );
          return;
        }

        let sqliteBusinessId: number | null = null;
        if (data.business_firestore_id) {
          const business = await db.getFirstAsync<{ id: number }>(
            `SELECT id FROM businesses WHERE firestore_id = ?`,
            [data.business_firestore_id]
          );

          if (!business) {
            console.warn(
              `⚠️ Business not found for inventory ${firestoreId}, skipping`
            );
            return;
          }
          sqliteBusinessId = business.id;
        }

        if (sqliteBusinessId) {
          const duplicate = await db.getFirstAsync<{ id: number }>(
            `SELECT id FROM inventory 
           WHERE business_id = ? AND item_name = ?`,
            [sqliteBusinessId, data.item_name || ""]
          );

          if (duplicate) {
            await db.runAsync(
              `UPDATE inventory SET firestore_id = ?, sync_status = 'synced' WHERE id = ?`,
              [firestoreId, duplicate.id]
            );
            console.log(
              `✅ Linked existing inventory/${duplicate.id} (${data.item_name}) to Firestore/${firestoreId}`
            );
            return;
          }
        }
        // Continue to normal insert for inventory
      }

      // ✅ NORMAL FLOW FOR ALL OTHER TABLES
      const existing = await db.getFirstAsync<{ id: number }>(
        `SELECT id FROM ${table} WHERE firestore_id = ?`,
        [firestoreId]
      );

      let sqliteUserId: number = 1;
      const firstUser = await db.getFirstAsync<{ id: number }>(
        `SELECT id FROM users LIMIT 1`,
        []
      );
      sqliteUserId = firstUser?.id || 1;

      // Business deduplication
      if (table === "businesses" && !existing) {
        const duplicateBusiness = await db.getFirstAsync<{ id: number }>(
          `SELECT id FROM ${table} WHERE user_id = ? AND name = ?`,
          [sqliteUserId, data.name]
        );

        if (duplicateBusiness) {
          await db.runAsync(
            `UPDATE ${table} SET firestore_id = ?, sync_status = 'synced' WHERE id = ?`,
            [firestoreId, duplicateBusiness.id]
          );
          console.log(
            `✅ Linked existing ${table}/${duplicateBusiness.id} to Firestore/${firestoreId}`
          );
          return;
        }
      }

      // Map business_firestore_id
      let sqliteBusinessId: number | null = null;
      if (table !== "businesses" && data.business_firestore_id) {
        const business = await db.getFirstAsync<{ id: number }>(
          `SELECT id FROM businesses WHERE firestore_id = ?`,
          [data.business_firestore_id]
        );

        if (!business) {
          console.warn(
            `⚠️ Business not found for ${table} ${firestoreId}, skipping`
          );
          return;
        }
        sqliteBusinessId = business.id;
        console.log(
          `✅ Mapped business_firestore_id ${data.business_firestore_id} to local ID ${sqliteBusinessId}`
        );
      }

      // Customer deduplication
      if (table === "customers" && !existing && sqliteBusinessId) {
        const duplicateCustomer = await db.getFirstAsync<{ id: number }>(
          `SELECT id FROM ${table} WHERE business_id = ? AND name = ? AND phone = ?`,
          [sqliteBusinessId, data.name, data.phone || ""]
        );

        if (duplicateCustomer) {
          await db.runAsync(
            `UPDATE ${table} SET firestore_id = ?, sync_status = 'synced' WHERE id = ?`,
            [firestoreId, duplicateCustomer.id]
          );
          console.log(
            `✅ Linked existing ${table}/${duplicateCustomer.id} to Firestore/${firestoreId}`
          );
          return;
        }
      }

      // Map customer_firestore_id
      let sqliteCustomerId: number | null = null;
      if (
        (table === "transactions" || table === "bills") &&
        data.customer_firestore_id
      ) {
        const customer = await db.getFirstAsync<{ id: number }>(
          `SELECT id FROM customers WHERE firestore_id = ?`,
          [data.customer_firestore_id]
        );

        if (!customer) {
          console.warn(
            `⚠️ Customer not found for ${table} ${firestoreId}, skipping`
          );
          return;
        }
        sqliteCustomerId = customer.id;
        console.log(
          `✅ Mapped customer_firestore_id ${data.customer_firestore_id} to local ID ${sqliteCustomerId}`
        );
      }

      // Map supplier_firestore_id
      let sqliteSupplierId: number | null = null;
      if (table === "supplier_transactions" && data.supplier_firestore_id) {
        const supplier = await db.getFirstAsync<{ id: number }>(
          `SELECT id FROM suppliers WHERE firestore_id = ?`,
          [data.supplier_firestore_id]
        );

        if (!supplier) {
          console.warn(
            `⚠️ Supplier not found for ${table} ${firestoreId}, skipping`
          );
          return;
        }
        sqliteSupplierId = supplier.id;
      }

      // Build SQLite data
      const sqliteData = await this.prepareForSQLiteComplete(
        table,
        data,
        firestoreId,
        sqliteUserId,
        sqliteBusinessId,
        sqliteCustomerId,
        sqliteSupplierId
      );

      if (existing) {
        // Update existing record
        const setClause = Object.keys(sqliteData)
          .filter((k) => k !== "id")
          .map((key) => `${key} = ?`)
          .join(", ");

        const values = [
          ...Object.keys(sqliteData)
            .filter((k) => k !== "id")
            .map((k) => sqliteData[k]),
          existing.id,
        ];

        await db.runAsync(
          `UPDATE ${table} SET ${setClause} WHERE id = ?`,
          values as any[]
        );

        console.log(
          `✅ Updated ${table}/${existing.id} from Firestore/${firestoreId}`
        );
      } else {
        // Insert new record
        const columns = Object.keys(sqliteData).join(", ");
        const placeholders = Object.keys(sqliteData)
          .map(() => "?")
          .join(", ");
        const values = Object.values(sqliteData);

        await db.runAsync(
          `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`,
          values as any[]
        );

        console.log(`✅ Inserted ${table} from Firestore/${firestoreId}`);
      }
    } catch (error) {
      console.error(`❌ Error downloading ${table}/${firestoreId}:`, error);
    }
  }

  private async prepareForSQLiteComplete(
    table: string,
    data: any,
    firestoreId: string,
    sqliteUserId: number,
    sqliteBusinessId: number | null = null,
    sqliteCustomerId: number | null = null,
    sqliteSupplierId: number | null = null
  ): Promise<any> {
    const convertTimestamp = (value: any) => {
      if (value instanceof Timestamp) {
        return value.toDate().toISOString();
      }
      if (typeof value === "string") return value;
      return new Date().toISOString();
    };

    const created_at = convertTimestamp(data.created_at);

    switch (table) {
      case "businesses":
        return {
          user_id: sqliteUserId,
          firestore_id: firestoreId,
          sync_status: "synced",
          created_at,
          name: data.name || "",
          description: data.description || null,
          phone: data.phone || null,
          address: data.address || null,
          business_type: data.business_type || null,
          category: data.category || null,
          gst_number: data.gst_number || null,
          pan_number: data.pan_number || null,
          website_url: data.website_url || null,
          upi_id: data.upi_id || null,
          bank_account_number: data.bank_account_number || null,
          bank_ifsc: data.bank_ifsc || null,
          bank_name: data.bank_name || null,
          logo_uri: data.logo_uri || null,
          is_default: data.is_default ? 1 : 0,
        };

      case "customers":
        return {
          user_id: sqliteUserId,
          firestore_id: firestoreId,
          sync_status: "synced",
          created_at,
          updated_at: convertTimestamp(data.updated_at),
          business_id: sqliteBusinessId || data.business_id || null,
          name: data.name || "",
          phone: data.phone || null,
          email: data.email || null,
          address: data.address || null,
          photo_uri: data.photo_uri || null,
          balance: data.balance || 0,
          last_activity: data.last_activity || null,
          archived: data.archived ? 1 : 0,
          due_date: data.due_date || null,
          sms_enabled: data.sms_enabled !== false ? 1 : 0,
        };

      case "transactions":
        return {
          user_id: sqliteUserId,
          firestore_id: firestoreId,
          sync_status: "synced",
          created_at,
          customer_id: sqliteCustomerId || data.customer_id,
          business_id: sqliteBusinessId || data.business_id || null,
          amount: data.amount || 0,
          type: data.type || "credit",
          note: data.note || null,
          date: data.date || new Date().toISOString(),
        };

      case "suppliers":
        return {
          user_id: sqliteUserId,
          firestore_id: firestoreId,
          sync_status: "synced",
          created_at,
          business_id: sqliteBusinessId || data.business_id || null,
          name: data.name || "",
          phone: data.phone || null,
          balance: data.balance || 0,
          last_activity: data.last_activity || null,
          archived: data.archived ? 1 : 0,
        };

      case "supplier_transactions":
        return {
          user_id: sqliteUserId,
          firestore_id: firestoreId,
          sync_status: "synced",
          created_at,
          supplier_id: sqliteSupplierId || data.supplier_id,
          business_id: sqliteBusinessId || data.business_id || null,
          amount: data.amount || 0,
          type: data.type || "credit",
          note: data.note || null,
          date: data.date || new Date().toISOString(),
        };

      case "inventory":
        // ✅ NO user_id column in inventory table!
        return {
          firestore_id: firestoreId,
          sync_status: "synced",
          business_id: sqliteBusinessId || data.business_id || null,
          item_name: data.item_name || data.name || "",
          quantity: data.quantity || 0,
          unit: data.unit || "Nos",
          mrp: data.mrp || 0,
          rate: data.rate || 0,
          product_code: data.product_code || null,
          tax_type: data.tax_type || "No Tax",
          tax_included: data.tax_included || "Included",
          photo_uri: data.photo_uri || null,
          date_added: data.date_added || new Date().toISOString(),
          last_updated: data.last_updated || new Date().toISOString(),
        };

      case "bills":
        return {
          user_id: sqliteUserId,
          firestore_id: firestoreId,
          sync_status: "synced",
          created_at,
          business_id: sqliteBusinessId || data.business_id || null,
          customer_id: sqliteCustomerId || data.customer_id,
          bill_number: data.bill_number || null,
          bill_date: data.bill_date || data.date || new Date().toISOString(),
          notes: data.notes || null,
          total: data.total || 0,
        };

      case "bill_items": {
        // ✅ Map bill_firestore_id back to local bill_id
        let sqliteBillId: number | null = null;
        if (data.bill_firestore_id) {
          const bill = await db.getFirstAsync<{ id: number }>(
            `SELECT id FROM bills WHERE firestore_id = ?`,
            [data.bill_firestore_id]
          );
          if (!bill) {
            console.warn(
              `⚠️ Bill not found for bill_items (bill_firestore_id: ${data.bill_firestore_id}), returning empty`
            );
            // ✅ Return valid structure even if bill not found
            return {
              bill_id: null,
              inventory_id: null,
              item_name: "",
              quantity: 0,
              unit: "Nos",
              mrp: 0,
              rate: 0,
              total: 0,
            };
          }
          sqliteBillId = bill.id;
        }

        // ✅ Map inventory_firestore_id back to local inventory_id
        let sqliteInventoryId: number | null = null;
        if (data.inventory_firestore_id) {
          const inventory = await db.getFirstAsync<{ id: number }>(
            `SELECT id FROM inventory WHERE firestore_id = ?`,
            [data.inventory_firestore_id]
          );
          if (inventory) {
            sqliteInventoryId = inventory.id;
          }
        }

        // ✅ IMPORTANT: Return ONLY valid bill_items columns
        return {
          bill_id: sqliteBillId || data.bill_id || null,
          inventory_id: sqliteInventoryId || data.inventory_id || null,
          item_name: data.item_name || data.name || "",
          quantity: data.quantity || 0,
          unit: data.unit || "Nos",
          mrp: data.mrp || 0,
          rate: data.rate || 0,
          total: data.total || 0,
        };
      }

      default:
        return {
          user_id: sqliteUserId,
          firestore_id: firestoreId,
          sync_status: "synced",
          created_at,
          ...data,
        };
    }
  }

  private async deleteLocalDocument(
    table: string,
    firestoreId: string
  ): Promise<void> {
    try {
      await db.runAsync(`DELETE FROM ${table} WHERE firestore_id = ?`, [
        firestoreId,
      ]);
      console.log(`✅ Deleted ${table} with firestore_id ${firestoreId}`);
    } catch (error) {
      console.error(`❌ Error deleting ${table}/${firestoreId}:`, error);
    }
  }

  private async prepareForFirestore(item: any, userId: string): Promise<any> {
    const data: any = {};

    for (const [key, value] of Object.entries(item)) {
      if (
        key === "id" ||
        key === "firestore_id" ||
        key === "sync_status" ||
        key === "created_at"
      ) {
        continue;
      }

      // ✅ For bill_items, map bill_id to bill's firestore_id
      if (key === "bill_id" && value) {
        const bill = await db.getFirstAsync<{ firestore_id: string }>(
          `SELECT firestore_id FROM bills WHERE id = ?`,
          [value as number]
        );
        if (bill?.firestore_id) {
          data.bill_firestore_id = bill.firestore_id;
        }
        continue; // Skip raw bill_id
      }

      // ✅ For bill_items, map inventory_id to inventory's firestore_id
      if (key === "inventory_id" && value) {
        const inventory = await db.getFirstAsync<{ firestore_id: string }>(
          `SELECT firestore_id FROM inventory WHERE id = ?`,
          [value as number]
        );
        if (inventory?.firestore_id) {
          data.inventory_firestore_id = inventory.firestore_id;
        }
        continue; // Skip raw inventory_id
      }

      if (key === "business_id" && value) {
        const business = await db.getFirstAsync<{ firestore_id: string }>(
          `SELECT firestore_id FROM businesses WHERE id = ?`,
          [value as number]
        );
        if (business?.firestore_id) {
          data.business_firestore_id = business.firestore_id;
        }
        continue;
      }

      if (key === "customer_id" && value) {
        const customer = await db.getFirstAsync<{ firestore_id: string }>(
          `SELECT firestore_id FROM customers WHERE id = ?`,
          [value as number]
        );
        if (customer?.firestore_id) {
          data.customer_firestore_id = customer.firestore_id;
        }
        continue;
      }

      if (key === "supplier_id" && value) {
        const supplier = await db.getFirstAsync<{ firestore_id: string }>(
          `SELECT firestore_id FROM suppliers WHERE id = ?`,
          [value as number]
        );
        if (supplier?.firestore_id) {
          data.supplier_firestore_id = supplier.firestore_id;
        }
        continue;
      }

      data[key] = value;
    }

    data.user_id = userId;
    data.updated_at = Timestamp.now();
    if (!data.created_at) {
      data.created_at = Timestamp.now();
    }

    return data;
  }

  cleanup(): void {
    console.log("🧹 Cleaning up SyncService");
    this.stopPeriodicSync();
    this.realtimeUnsubscribers.forEach((unsub) => unsub());
    this.realtimeUnsubscribers = [];
    this.config = null;
    this.isSyncing = false;
    console.log("✅ SyncService cleaned up");
  }

  async queueForSync(table: string, id: number): Promise<void> {
    await markAsPendingSync(table, id);
    console.log(`📝 Queued ${table}/${id} for sync`);

    if (this.isOnline && this.config?.userId) {
      this.syncNow(this.config.userId);
    }
  }

  getSyncStatus(): { isSyncing: boolean; isOnline: boolean; enabled: boolean } {
    return {
      isSyncing: this.isSyncing,
      isOnline: this.isOnline,
      enabled: this.config?.enabled ?? false,
    };
  }
}

export default new SyncService();
