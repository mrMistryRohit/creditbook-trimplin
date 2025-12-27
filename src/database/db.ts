import * as SQLite from "expo-sqlite";

const db = SQLite.openDatabaseSync("creditbook.db");

export const initDB = async () => {
  try {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;

      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        phone TEXT,
        shop_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Businesses table
      CREATE TABLE IF NOT EXISTS businesses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        phone TEXT,
        address TEXT,
        business_type TEXT,
        category TEXT,
        gst_number TEXT,
        pan_number TEXT,
        website_url TEXT,
        upi_id TEXT,
        bank_account_number TEXT,
        bank_ifsc TEXT,
        bank_name TEXT,
        logo_uri TEXT,
        is_default INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );

      -- Customers table
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        business_id INTEGER,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT,
        photo_uri TEXT,
        balance REAL DEFAULT 0,
        last_activity TEXT,
        archived INTEGER DEFAULT 0,
        due_date TEXT,
        sms_enabled INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE
      );

      -- Suppliers table
      CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        business_id INTEGER,
        name TEXT NOT NULL,
        phone TEXT,
        balance REAL DEFAULT 0,
        last_activity TEXT,
        archived INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE
      );

      -- Transactions table
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        business_id INTEGER,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        note TEXT,
        date TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE
      );

      -- Supplier transactions table
      CREATE TABLE IF NOT EXISTS supplier_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        business_id INTEGER,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        note TEXT,
        date TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_id) REFERENCES suppliers (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE
      );

      -- Inventory table
      CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        business_id INTEGER NOT NULL,
        item_name TEXT NOT NULL,
        quantity REAL DEFAULT 0,
        unit TEXT DEFAULT 'Nos',
        mrp REAL DEFAULT 0,
        rate REAL DEFAULT 0,
        product_code TEXT,
        tax_type TEXT DEFAULT 'No Tax',
        tax_included TEXT DEFAULT 'Included',
        photo_uri TEXT,
        date_added TEXT DEFAULT CURRENT_TIMESTAMP,
        last_updated TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
      );

      -- Bills table
      CREATE TABLE IF NOT EXISTS bills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        business_id INTEGER NOT NULL,
        customer_id INTEGER NOT NULL,
        bill_number TEXT NOT NULL,
        bill_date TEXT NOT NULL,
        notes TEXT,
        total REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE
      );

      -- Bill items table
      CREATE TABLE IF NOT EXISTS bill_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bill_id INTEGER NOT NULL,
        inventory_id INTEGER,
        item_name TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit TEXT NOT NULL,
        mrp REAL NOT NULL,
        rate REAL NOT NULL,
        total REAL NOT NULL,
        FOREIGN KEY (bill_id) REFERENCES bills (id) ON DELETE CASCADE,
        FOREIGN KEY (inventory_id) REFERENCES inventory (id) ON DELETE SET NULL
      );

      -- ✅ ONLY NON-SYNC INDEXES HERE
      CREATE INDEX IF NOT EXISTS idx_bills_business ON bills(business_id);
      CREATE INDEX IF NOT EXISTS idx_bills_customer ON bills(customer_id);
      CREATE INDEX IF NOT EXISTS idx_bill_items_bill ON bill_items(bill_id);
      CREATE INDEX IF NOT EXISTS idx_businesses_user ON businesses(user_id);
      CREATE INDEX IF NOT EXISTS idx_customers_user ON customers(user_id);
      CREATE INDEX IF NOT EXISTS idx_customers_business ON customers(business_id);
      CREATE INDEX IF NOT EXISTS idx_suppliers_user ON suppliers(user_id);
      CREATE INDEX IF NOT EXISTS idx_suppliers_business ON suppliers(business_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customer_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_business ON transactions(business_id);
      CREATE INDEX IF NOT EXISTS idx_supplier_transactions_supplier ON supplier_transactions(supplier_id);
      CREATE INDEX IF NOT EXISTS idx_supplier_transactions_user ON supplier_transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_supplier_transactions_business ON supplier_transactions(business_id);
      CREATE INDEX IF NOT EXISTS idx_inventory_business ON inventory(business_id);
    `);

    // ✅ RUN MIGRATIONS IN CORRECT ORDER
    await migrateRenamePasswordColumn(); // 1. Rename password → password_hash
    await migratePasswordHashNullable(); // 2. Make password_hash nullable
    await migrateAddArchivedColumn(); // 3. Add archived columns
    await migrateAddBusinessSupport(); // 4. Add business support
    await migrateAddCustomerDueDate(); // 5. Add due_date
    await migrateAddEnhancedBusinessFields(); // 6. Enhanced business fields
    await migrateAddEnhancedCustomerFields(); // 7. Enhanced customer fields
    await migrateAddSyncColumns(); // 8. Add sync columns LAST

    console.log("✅ Database initialized successfully");
  } catch (error) {
    console.error("❌ Database initialization error:", error);
    throw error;
  }
};

/**
 * Migration 1: Rename password column to password_hash
 */
const migrateRenamePasswordColumn = async () => {
  try {
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM pragma_table_info('users') WHERE name='password_hash'`
    );

    if (result?.count === 0) {
      const passwordExists = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM pragma_table_info('users') WHERE name='password'`
      );

      if (passwordExists && passwordExists.count > 0) {
        console.log("🔄 Migration: Renaming password to password_hash...");
        await db.execAsync(`
          CREATE TABLE users_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            phone TEXT,
            shop_name TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          INSERT INTO users_new (id, name, email, password_hash, phone, shop_name, created_at)
          SELECT id, name, email, password, phone, shop_name, created_at FROM users;

          DROP TABLE users;
          ALTER TABLE users_new RENAME TO users;
        `);
        console.log("✅ Migration: password_hash column created");
      }
    } else {
      console.log("✓ Migration: password_hash column already exists");
    }
  } catch (error) {
    console.error("❌ Migration error (password_hash):", error);
  }
};

/**
 * Migration 2: Add archived column
 */
const migrateAddArchivedColumn = async () => {
  try {
    const customerResult = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM pragma_table_info('customers') WHERE name='archived'`
    );

    if (customerResult && customerResult.count === 0) {
      console.log("🔄 Migration: Adding archived column to customers...");
      await db.execAsync(
        `ALTER TABLE customers ADD COLUMN archived INTEGER DEFAULT 0;`
      );
      console.log("✅ Migration: archived column added to customers");
    } else {
      console.log("✓ Migration: customers.archived already exists");
    }

    const supplierResult = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM pragma_table_info('suppliers') WHERE name='archived'`
    );

    if (supplierResult && supplierResult.count === 0) {
      console.log("🔄 Migration: Adding archived column to suppliers...");
      await db.execAsync(
        `ALTER TABLE suppliers ADD COLUMN archived INTEGER DEFAULT 0;`
      );
      console.log("✅ Migration: archived column added to suppliers");
    } else {
      console.log("✓ Migration: suppliers.archived already exists");
    }
  } catch (error) {
    console.error("❌ Migration error (archived):", error);
  }
};

/**
 * Migration 3: Add multi-business support
 */
const migrateAddBusinessSupport = async () => {
  try {
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM pragma_table_info('customers') WHERE name='business_id'`
    );

    if (result && result.count === 0) {
      console.log("🔄 Migration: Adding multi-business support...");

      await db.execAsync(
        `ALTER TABLE customers ADD COLUMN business_id INTEGER;`
      );
      console.log("✅ Migration: business_id added to customers");

      await db.execAsync(
        `ALTER TABLE suppliers ADD COLUMN business_id INTEGER;`
      );
      console.log("✅ Migration: business_id added to suppliers");

      await db.execAsync(
        `ALTER TABLE transactions ADD COLUMN business_id INTEGER;`
      );
      console.log("✅ Migration: business_id added to transactions");

      await db.execAsync(
        `ALTER TABLE supplier_transactions ADD COLUMN business_id INTEGER;`
      );
      console.log("✅ Migration: business_id added to supplier_transactions");

      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_customers_business ON customers(business_id);
        CREATE INDEX IF NOT EXISTS idx_suppliers_business ON suppliers(business_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_business ON transactions(business_id);
        CREATE INDEX IF NOT EXISTS idx_supplier_transactions_business ON supplier_transactions(business_id);
      `);
      console.log("✅ Migration: business_id indexes created");

      const users = await db.getAllAsync<{
        id: number;
        name: string;
        shop_name: string | null;
      }>(`SELECT id, name, shop_name FROM users`);

      for (const user of users) {
        const businessName = user.shop_name || `${user.name}'s Business`;

        const insertResult = await db.runAsync(
          `INSERT INTO businesses (user_id, name, description, is_default) VALUES (?, ?, ?, 1)`,
          [user.id, businessName, "Default business account"]
        );

        const businessId = insertResult.lastInsertRowId;

        await db.runAsync(
          `UPDATE customers SET business_id = ? WHERE user_id = ? AND business_id IS NULL`,
          [businessId, user.id]
        );

        await db.runAsync(
          `UPDATE suppliers SET business_id = ? WHERE user_id = ? AND business_id IS NULL`,
          [businessId, user.id]
        );

        await db.runAsync(
          `UPDATE transactions SET business_id = ? WHERE user_id = ? AND business_id IS NULL`,
          [businessId, user.id]
        );

        await db.runAsync(
          `UPDATE supplier_transactions SET business_id = ? WHERE user_id = ? AND business_id IS NULL`,
          [businessId, user.id]
        );

        console.log(
          `✅ Migration: Created default business for user ${user.id}`
        );
      }

      console.log("✅ Migration: Multi-business support completed");
    } else {
      console.log("✓ Migration: Multi-business support already exists");
    }
  } catch (error) {
    console.error("❌ Migration error (business support):", error);
    throw error;
  }
};

/**
 * Migration 4: Add due_date column to customers
 */
const migrateAddCustomerDueDate = async () => {
  try {
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM pragma_table_info('customers') WHERE name='due_date'`
    );

    if (result && result.count === 0) {
      console.log("🔄 Migration: Adding due_date column to customers...");
      await db.execAsync(`ALTER TABLE customers ADD COLUMN due_date TEXT;`);
      console.log("✅ Migration: due_date column added to customers");
    } else {
      console.log("✓ Migration: customers.due_date already exists");
    }
  } catch (error) {
    console.error("❌ Migration error (due_date):", error);
  }
};

/**
 * Migration 5: Add enhanced business fields
 */
const migrateAddEnhancedBusinessFields = async () => {
  try {
    const fields = [
      "business_type",
      "category",
      "gst_number",
      "pan_number",
      "website_url",
      "upi_id",
      "bank_account_number",
      "bank_ifsc",
      "bank_name",
      "logo_uri",
    ];

    for (const field of fields) {
      const result = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM pragma_table_info('businesses') WHERE name='${field}'`
      );

      if (result && result.count === 0) {
        console.log(`🔄 Migration: Adding ${field} to businesses...`);
        await db.execAsync(`ALTER TABLE businesses ADD COLUMN ${field} TEXT;`);
        console.log(`✅ Migration: ${field} added to businesses`);
      }
    }

    console.log("✅ Migration: Enhanced business fields completed");
  } catch (error) {
    console.error("❌ Migration error (enhanced business fields):", error);
  }
};

/**
 * Migration 6: Add enhanced customer fields
 */
const migrateAddEnhancedCustomerFields = async () => {
  try {
    const fields = [
      { name: "email", type: "TEXT" },
      { name: "address", type: "TEXT" },
      { name: "photo_uri", type: "TEXT" },
      { name: "sms_enabled", type: "INTEGER DEFAULT 1" },
    ];

    for (const field of fields) {
      const result = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM pragma_table_info('customers') WHERE name='${field.name}'`
      );

      if (result && result.count === 0) {
        console.log(`🔄 Migration: Adding ${field.name} to customers...`);
        await db.execAsync(
          `ALTER TABLE customers ADD COLUMN ${field.name} ${field.type};`
        );
        console.log(`✅ Migration: ${field.name} added to customers`);
      }
    }

    console.log("✅ Migration: Enhanced customer fields completed");
  } catch (error) {
    console.error("❌ Migration error (enhanced customer fields):", error);
  }
};

/**
 * Migration 7: Add sync columns to all tables
 */
const migrateAddSyncColumns = async () => {
  try {
    console.log("🔄 Migration: Adding sync columns to all tables...");

    // Check if sync columns already exist in users table
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM pragma_table_info('users') WHERE name='firestore_id'`
    );

    if (result && result.count === 0) {
      // Add sync columns to users table
      await db.execAsync(`
        ALTER TABLE users ADD COLUMN firestore_id TEXT;
        ALTER TABLE users ADD COLUMN sync_status TEXT DEFAULT 'pending';
        ALTER TABLE users ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP;
      `);
      console.log("✅ Sync columns added to users");

      // Add sync columns to businesses table
      await db.execAsync(`
        ALTER TABLE businesses ADD COLUMN firestore_id TEXT;
        ALTER TABLE businesses ADD COLUMN sync_status TEXT DEFAULT 'pending';
        ALTER TABLE businesses ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP;
      `);
      console.log("✅ Sync columns added to businesses");

      // Add sync columns to customers table
      await db.execAsync(`
        ALTER TABLE customers ADD COLUMN firestore_id TEXT;
        ALTER TABLE customers ADD COLUMN sync_status TEXT DEFAULT 'pending';
        ALTER TABLE customers ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP;
      `);
      console.log("✅ Sync columns added to customers");

      // Add sync columns to suppliers table
      await db.execAsync(`
        ALTER TABLE suppliers ADD COLUMN firestore_id TEXT;
        ALTER TABLE suppliers ADD COLUMN sync_status TEXT DEFAULT 'pending';
        ALTER TABLE suppliers ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP;
      `);
      console.log("✅ Sync columns added to suppliers");

      // Add sync columns to transactions table
      await db.execAsync(`
        ALTER TABLE transactions ADD COLUMN firestore_id TEXT;
        ALTER TABLE transactions ADD COLUMN sync_status TEXT DEFAULT 'pending';
        ALTER TABLE transactions ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP;
      `);
      console.log("✅ Sync columns added to transactions");

      // Add sync columns to supplier_transactions table
      await db.execAsync(`
        ALTER TABLE supplier_transactions ADD COLUMN firestore_id TEXT;
        ALTER TABLE supplier_transactions ADD COLUMN sync_status TEXT DEFAULT 'pending';
        ALTER TABLE supplier_transactions ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP;
      `);
      console.log("✅ Sync columns added to supplier_transactions");

      // Add sync columns to inventory table
      await db.execAsync(`
        ALTER TABLE inventory ADD COLUMN firestore_id TEXT;
        ALTER TABLE inventory ADD COLUMN sync_status TEXT DEFAULT 'pending';
        ALTER TABLE inventory ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP;
      `);
      console.log("✅ Sync columns added to inventory");

      // Add sync columns to bills table
      await db.execAsync(`
        ALTER TABLE bills ADD COLUMN firestore_id TEXT;
        ALTER TABLE bills ADD COLUMN sync_status TEXT DEFAULT 'pending';
        ALTER TABLE bills ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP;
      `);
      console.log("✅ Sync columns added to bills");

      // Add sync columns to bill_items table
      await db.execAsync(`
        ALTER TABLE bill_items ADD COLUMN firestore_id TEXT;
        ALTER TABLE bill_items ADD COLUMN sync_status TEXT DEFAULT 'pending';
        ALTER TABLE bill_items ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP;
      `);
      console.log("✅ Sync columns added to bill_items");

      // Create indexes for sync queries (improves performance)
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_sync_users ON users(sync_status, updated_at);
        CREATE INDEX IF NOT EXISTS idx_sync_businesses ON businesses(sync_status, updated_at);
        CREATE INDEX IF NOT EXISTS idx_sync_customers ON customers(sync_status, updated_at);
        CREATE INDEX IF NOT EXISTS idx_sync_suppliers ON suppliers(sync_status, updated_at);
        CREATE INDEX IF NOT EXISTS idx_sync_transactions ON transactions(sync_status, updated_at);
        CREATE INDEX IF NOT EXISTS idx_sync_supplier_transactions ON supplier_transactions(sync_status, updated_at);
        CREATE INDEX IF NOT EXISTS idx_sync_inventory ON inventory(sync_status, updated_at);
        CREATE INDEX IF NOT EXISTS idx_sync_bills ON bills(sync_status, updated_at);
        CREATE INDEX IF NOT EXISTS idx_sync_bill_items ON bill_items(sync_status, updated_at);
      `);
      console.log("✅ Sync indexes created");

      console.log("✅ Migration: Sync columns completed successfully");
    } else {
      console.log("✓ Migration: Sync columns already exist");
    }
  } catch (error) {
    console.error("❌ Migration error (sync columns):", error);
    throw error;
  }
};

/**
 * Migration 8: Make password_hash nullable (since we use Firebase Auth)
 */
const migratePasswordHashNullable = async () => {
  try {
    // ✅ Properly typed interface for PRAGMA result
    interface ColumnInfo {
      cid: number;
      name: string;
      type: string;
      notnull: number;
      dflt_value: any;
      pk: number;
    }

    // Check if password_hash column exists and get its info
    const columnInfo = await db.getAllAsync<ColumnInfo>(
      `PRAGMA table_info('users')`
    );

    const passwordHashColumn = columnInfo.find(
      (col) => col.name === "password_hash"
    );

    if (!passwordHashColumn) {
      console.log("✓ Migration: password_hash column doesn't exist yet");
      return;
    }

    if (passwordHashColumn.notnull === 1) {
      console.log("🔄 Migration: Making password_hash nullable...");

      // Check if sync columns exist in users table
      const hasSyncColumns = columnInfo.some(
        (col) => col.name === "firestore_id"
      );

      // SQLite doesn't support ALTER COLUMN, so we need to recreate the table
      if (hasSyncColumns) {
        // Users table already has sync columns
        await db.execAsync(`
          CREATE TABLE users_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT,
            phone TEXT,
            shop_name TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            firestore_id TEXT,
            sync_status TEXT DEFAULT 'pending',
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
          );

          INSERT INTO users_new 
          SELECT id, name, email, password_hash, phone, shop_name, created_at, firestore_id, sync_status, updated_at 
          FROM users;

          DROP TABLE users;
          ALTER TABLE users_new RENAME TO users;
        `);
      } else {
        // Users table doesn't have sync columns yet
        await db.execAsync(`
          CREATE TABLE users_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT,
            phone TEXT,
            shop_name TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          INSERT INTO users_new (id, name, email, password_hash, phone, shop_name, created_at)
          SELECT id, name, email, password_hash, phone, shop_name, created_at 
          FROM users;

          DROP TABLE users;
          ALTER TABLE users_new RENAME TO users;
        `);
      }

      console.log("✅ Migration: password_hash is now nullable");
    } else {
      console.log("✓ Migration: password_hash already nullable");
    }
  } catch (error) {
    console.error("❌ Migration error (password_hash nullable):", error);
  }
};

/**
 * Utility: Reset database (development only)
 */
export const resetDatabase = async () => {
  try {
    console.log("⚠️ Resetting database...");
    await db.execAsync(`
      DROP TABLE IF EXISTS bill_items;
      DROP TABLE IF EXISTS bills;
      DROP TABLE IF EXISTS supplier_transactions;
      DROP TABLE IF EXISTS transactions;
      DROP TABLE IF EXISTS inventory;
      DROP TABLE IF EXISTS suppliers;
      DROP TABLE IF EXISTS customers;
      DROP TABLE IF EXISTS businesses;
      DROP TABLE IF EXISTS users;
      DROP TABLE IF EXISTS sync_metadata;
    `);
    console.log("✅ Database reset complete");
  } catch (error) {
    console.error("❌ Database reset error:", error);
    throw error;
  }
};

/**
 * Get database statistics
 */
export const getDatabaseStats = async () => {
  try {
    const stats = {
      users: await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM users"
      ),
      businesses: await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM businesses"
      ),
      customers: await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM customers"
      ),
      suppliers: await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM suppliers"
      ),
      transactions: await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM transactions"
      ),
      supplierTransactions: await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM supplier_transactions"
      ),
      inventory: await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM inventory"
      ),
    };

    console.log("📊 Database Statistics:", {
      users: stats.users?.count || 0,
      businesses: stats.businesses?.count || 0,
      customers: stats.customers?.count || 0,
      suppliers: stats.suppliers?.count || 0,
      transactions: stats.transactions?.count || 0,
      supplierTransactions: stats.supplierTransactions?.count || 0,
      inventory: stats.inventory?.count || 0,
    });

    return stats;
  } catch (error) {
    console.error("❌ Error fetching database stats:", error);
  }
};
/**
 * Helper: Mark item as pending sync
 */
export const markAsPendingSync = async (
  table: string,
  id: number
): Promise<void> => {
  try {
    await db.runAsync(
      `UPDATE ${table} SET sync_status = 'pending', updated_at = ? WHERE id = ?`,
      [new Date().toISOString(), id]
    );
  } catch (error) {
    console.error(`Error marking ${table} ${id} as pending:`, error);
  }
};

/**
 * Helper: Mark item as synced
 */
export const markAsSynced = async (
  table: string,
  id: number,
  firestoreId: string
): Promise<void> => {
  try {
    await db.runAsync(
      `UPDATE ${table} SET sync_status = 'synced', firestore_id = ?, updated_at = ? WHERE id = ?`,
      [firestoreId, new Date().toISOString(), id]
    );
  } catch (error) {
    console.error(`Error marking ${table} ${id} as synced:`, error);
  }
};

/**
 * Helper: Get all pending items for sync
 */
export const getPendingItems = async (table: string): Promise<any[]> => {
  try {
    const items = await db.getAllAsync(
      `SELECT * FROM ${table} WHERE sync_status = 'pending' OR sync_status IS NULL ORDER BY updated_at ASC`
    );
    return items ?? [];
  } catch (error) {
    console.error(`Error getting pending items from ${table}:`, error);
    return [];
  }
};

/**
 * Helper: Get last sync timestamp
 */
export const getLastSyncTime = async (): Promise<string | null> => {
  try {
    const result = await db.getFirstAsync<{ sync_time: string }>(
      `SELECT sync_time FROM sync_metadata WHERE id = 1`
    );
    return result?.sync_time || null;
  } catch {
    // Table might not exist yet
    return null;
  }
};

/**
 * Helper: Update last sync timestamp
 */
export const updateLastSyncTime = async (): Promise<void> => {
  try {
    // Create sync_metadata table if it doesn't exist
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS sync_metadata (
        id INTEGER PRIMARY KEY,
        sync_time TEXT NOT NULL
      );
    `);

    const exists = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM sync_metadata WHERE id = 1`
    );

    if (exists && exists.count > 0) {
      await db.runAsync(`UPDATE sync_metadata SET sync_time = ? WHERE id = 1`, [
        new Date().toISOString(),
      ]);
    } else {
      await db.runAsync(
        `INSERT INTO sync_metadata (id, sync_time) VALUES (1, ?)`,
        [new Date().toISOString()]
      );
    }
  } catch (error) {
    console.error("Error updating last sync time:", error);
  }
};

export default db;
