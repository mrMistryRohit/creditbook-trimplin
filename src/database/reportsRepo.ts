import db from "./db";

export interface ReportSummary {
  totalCredit: number;
  totalDebit: number;
  netBalance: number;
  transactionCount: number;
}

export interface PeriodReport {
  today: ReportSummary;
  week: ReportSummary;
  month: ReportSummary;
  allTime: ReportSummary;
}

/**
 * ✅ Fixed: Parse "DD/MM/YYYY" format (no comma)
 * Examples: "27/12/2025", "1/1/2025"
 */
const parseDateString = (dateStr: string): Date | null => {
  try {
    if (!dateStr) return null;

    // Handle format: "DD/MM/YYYY" (e.g., "27/12/2025")
    const parts = dateStr.trim().split("/");
    if (parts.length !== 3) return null;

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);

    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 2000)
      return null;

    // Create date at start of day (00:00:00)
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  } catch (error) {
    console.error("Error parsing date:", dateStr, error);
    return null;
  }
};

const getReportForPeriod = async (
  userId: number,
  businessId: number,
  startDate: Date | null
): Promise<ReportSummary> => {
  console.log("📊 Getting report for period:", {
    userId,
    businessId,
    startDate: startDate?.toISOString(),
  });

  const allTransactions = await db.getAllAsync<{
    type: string;
    amount: number;
    date: string;
  }>(
    `SELECT type, amount, date FROM transactions WHERE user_id = ? AND business_id = ?`,
    [userId, businessId]
  );

  console.log(`📝 Total transactions found: ${allTransactions.length}`);

  let totalCredit = 0;
  let totalDebit = 0;
  let transactionCount = 0;
  let skippedCount = 0;

  for (const txn of allTransactions) {
    if (startDate) {
      const txnDate = parseDateString(txn.date);

      if (!txnDate) {
        console.warn("⚠️ Invalid date format:", txn.date);
        skippedCount++;
        continue;
      }

      // Compare dates (ignore time)
      if (txnDate < startDate) {
        skippedCount++;
        continue;
      }
    }

    transactionCount++;
    if (txn.type === "credit") {
      totalCredit += txn.amount;
    } else if (txn.type === "debit") {
      totalDebit += txn.amount;
    }
  }

  console.log(`✅ Included: ${transactionCount}, Skipped: ${skippedCount}`);

  const netBalance = totalCredit - totalDebit;
  return {
    totalCredit,
    totalDebit,
    netBalance,
    transactionCount,
  };
};

export const getReportsForUser = async (
  userId: number,
  businessId: number
): Promise<PeriodReport> => {
  const now = new Date();

  // Today: Start of current day (00:00:00)
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0
  );

  // Week: 7 days ago from start of today
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  // Month: 30 days ago from start of today
  const monthStart = new Date(todayStart);
  monthStart.setDate(monthStart.getDate() - 30);

  console.log("📅 Date ranges:", {
    today: todayStart.toISOString(),
    week: weekStart.toISOString(),
    month: monthStart.toISOString(),
  });

  const [today, week, month, allTime] = await Promise.all([
    getReportForPeriod(userId, businessId, todayStart),
    getReportForPeriod(userId, businessId, weekStart),
    getReportForPeriod(userId, businessId, monthStart),
    getReportForPeriod(userId, businessId, null),
  ]);

  return { today, week, month, allTime };
};
