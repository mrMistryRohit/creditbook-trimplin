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

// Parse Indian locale date string: "13/12/2025, 9:42:00 pm"
const parseDateString = (dateStr: string): Date | null => {
  try {
    const parts = dateStr.split(", ");
    if (parts.length < 2) return null;

    const datePart = parts[0]; // "13/12/2025"
    const [day, month, year] = datePart.split("/").map(Number);

    if (!day || !month || !year) return null;

    return new Date(year, month - 1, day);
  } catch {
    return null;
  }
};

const getReportForPeriod = async (
  userId: number,
  startDate: Date | null
): Promise<ReportSummary> => {
  // Get all transactions for user
  const allTransactions = await db.getAllAsync<{
    type: string;
    amount: number;
    date: string;
  }>(`SELECT type, amount, date FROM transactions WHERE user_id = ?`, [userId]);

  let totalCredit = 0;
  let totalDebit = 0;
  let transactionCount = 0;

  // Filter by date and calculate totals
  for (const txn of allTransactions) {
    if (startDate) {
      const txnDate = parseDateString(txn.date);
      if (!txnDate || txnDate < startDate) {
        continue; // Skip transactions before startDate
      }
    }

    // Include in calculation
    transactionCount++;
    if (txn.type === "credit") {
      totalCredit += txn.amount;
    } else if (txn.type === "debit") {
      totalDebit += txn.amount;
    }
  }

  const netBalance = totalCredit - totalDebit;

  return {
    totalCredit,
    totalDebit,
    netBalance,
    transactionCount,
  };
};

export const getReportsForUser = async (
  userId: number
): Promise<PeriodReport> => {
  const now = new Date();

  // Today (start of day at 00:00:00)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // 7 days ago (start of day)
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  // 30 days ago (start of day)
  const monthStart = new Date(todayStart);
  monthStart.setDate(monthStart.getDate() - 30);

  const [today, week, month, allTime] = await Promise.all([
    getReportForPeriod(userId, todayStart),
    getReportForPeriod(userId, weekStart),
    getReportForPeriod(userId, monthStart),
    getReportForPeriod(userId, null), // All time
  ]);

  return { today, week, month, allTime };
};
