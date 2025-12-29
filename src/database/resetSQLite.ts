import * as SQLite from "expo-sqlite";

/**
 * Clears local SQLite database.
 * Safe to call on logout.
 * Does NOT delete Firebase data.
 */
export async function resetSQLiteDatabase(): Promise<void> {
  try {
    console.log("🗑️ Deleting local SQLite database...");

    await SQLite.deleteDatabaseAsync("creditbook.db");

    console.log("✅ SQLite database deleted");
  } catch (error: any) {
    // Database may not exist on first logout
    if (
      error?.message?.includes("no such file") ||
      error?.message?.includes("does not exist")
    ) {
      console.log("ℹ️ SQLite database already cleared");
      return;
    }

    console.error("❌ Failed to reset SQLite database:", error);
  }
}
