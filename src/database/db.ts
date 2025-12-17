import * as SQLite from "expo-sqlite";

const db = SQLite.openDatabaseSync("creditbook.db");

export const initDB = async () => {
  try {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        phone TEXT,
        shop_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        phone TEXT,
        balance REAL DEFAULT 0,
        last_activity TEXT,
        archived INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        note TEXT,
        date TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
      );

      CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        phone TEXT,
        balance REAL DEFAULT 0,
        last_activity TEXT,
        archived INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      );

      CREATE TABLE IF NOT EXISTS supplier_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        note TEXT,
        date TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_id) REFERENCES suppliers (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
      );

      -- Businesses table
      CREATE TABLE IF NOT EXISTS businesses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        phone TEXT,
        address TEXT,
        is_default INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      );

      CREATE INDEX IF NOT EXISTS idx_businesses_user ON businesses(user_id);
      CREATE INDEX IF NOT EXISTS idx_customers_user ON customers(user_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customer_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_suppliers_user ON suppliers(user_id);
      CREATE INDEX IF NOT EXISTS idx_supplier_transactions_supplier ON supplier_transactions(supplier_id);
      CREATE INDEX IF NOT EXISTS idx_supplier_transactions_user ON supplier_transactions(user_id);
    `);

    await migrateAddArchivedColumn();
    await migrateRenamePasswordColumn();
    await migrateAddBusinessSupport();

    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Database initialization error:", error);
    throw error;
  }
};

const migrateAddArchivedColumn = async () => {
  try {
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM pragma_table_info('customers') WHERE name='archived'`
    );

    if (result && result.count === 0) {
      await db.execAsync(`
        ALTER TABLE customers ADD COLUMN archived INTEGER DEFAULT 0;
      `);
      console.log("Migration: Added archived column to customers");
    }

    const supplierResult = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM pragma_table_info('suppliers') WHERE name='archived'`
    );

    if (supplierResult && supplierResult.count === 0) {
      await db.execAsync(`
        ALTER TABLE suppliers ADD COLUMN archived INTEGER DEFAULT 0;
      `);
      console.log("Migration: Added archived column to suppliers");
    }
  } catch (error) {
    console.error("Migration error (archived):", error);
  }
};

const migrateRenamePasswordColumn = async () => {
  try {
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM pragma_table_info('users') WHERE name='password_hash'`
    );

    if (result && result.count === 0) {
      const passwordExists = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM pragma_table_info('users') WHERE name='password'`
      );

      if (passwordExists && passwordExists.count > 0) {
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
        console.log("Migration: Renamed password to password_hash");
      }
    }
  } catch (error) {
    console.error("Migration error (password_hash):", error);
  }
};

const migrateAddBusinessSupport = async () => {
  try {
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM pragma_table_info('customers') WHERE name='business_id'`
    );

    if (result && result.count === 0) {
      console.log("Migration: Adding business support...");

      await db.execAsync(`
        ALTER TABLE customers ADD COLUMN business_id INTEGER;
      `);
      console.log("Migration: Added business_id to customers");

      await db.execAsync(`
        ALTER TABLE suppliers ADD COLUMN business_id INTEGER;
      `);
      console.log("Migration: Added business_id to suppliers");

      await db.execAsync(`
        ALTER TABLE transactions ADD COLUMN business_id INTEGER;
      `);
      console.log("Migration: Added business_id to transactions");

      await db.execAsync(`
        ALTER TABLE supplier_transactions ADD COLUMN business_id INTEGER;
      `);
      console.log("Migration: Added business_id to supplier_transactions");

      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_customers_business ON customers(business_id);
        CREATE INDEX IF NOT EXISTS idx_suppliers_business ON suppliers(business_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_business ON transactions(business_id);
        CREATE INDEX IF NOT EXISTS idx_supplier_transactions_business ON supplier_transactions(business_id);
      `);
      console.log("Migration: Created indexes for business_id");

      const users = await db.getAllAsync<{
        id: number;
        name: string;
        shop_name: string | null;
      }>(`SELECT id, name, shop_name FROM users`);

      for (const user of users) {
        const businessName = user.shop_name || `${user.name}'s Business`;

        const insertResult = await db.runAsync(
          `INSERT INTO businesses (user_id, name, is_default) VALUES (?, ?, 1)`,
          [user.id, businessName]
        );

        const businessId = insertResult.lastInsertRowId;

        await db.runAsync(
          `UPDATE customers SET business_id = ? WHERE user_id = ?`,
          [businessId, user.id]
        );

        await db.runAsync(
          `UPDATE suppliers SET business_id = ? WHERE user_id = ?`,
          [businessId, user.id]
        );

        await db.runAsync(
          `UPDATE transactions SET business_id = ? WHERE user_id = ?`,
          [businessId, user.id]
        );

        await db.runAsync(
          `UPDATE supplier_transactions SET business_id = ? WHERE user_id = ?`,
          [businessId, user.id]
        );

        console.log(`Migration: Created default business for user ${user.id}`);
      }

      console.log("Migration: Business support added successfully");
    } else {
      console.log("Migration: business_id already exists");
    }
  } catch (error) {
    console.error("Migration error (business support):", error);
    throw error;
  }
};

export default db;
