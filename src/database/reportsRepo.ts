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

const parseDateString = (dateStr: string): Date | null => {
  try {
    const parts = dateStr.split(", ");
    if (parts.length < 2) return null;
    const datePart = parts[0];
    const [day, month, year] = datePart.split("/").map(Number);
    if (!day || !month || !year) return null;
    return new Date(year, month - 1, day);
  } catch {
    return null;
  }
};

const getReportForPeriod = async (
  userId: number,
  businessId: number,
  startDate: Date | null
): Promise<ReportSummary> => {
  const allTransactions = await db.getAllAsync<{
    type: string;
    amount: number;
    date: string;
  }>(
    `SELECT type, amount, date FROM transactions WHERE user_id = ? AND business_id = ?`,
    [userId, businessId]
  );

  let totalCredit = 0;
  let totalDebit = 0;
  let transactionCount = 0;

  for (const txn of allTransactions) {
    if (startDate) {
      const txnDate = parseDateString(txn.date);
      if (!txnDate || txnDate < startDate) {
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
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const monthStart = new Date(todayStart);
  monthStart.setDate(monthStart.getDate() - 30);

  const [today, week, month, allTime] = await Promise.all([
    getReportForPeriod(userId, businessId, todayStart),
    getReportForPeriod(userId, businessId, weekStart),
    getReportForPeriod(userId, businessId, monthStart),
    getReportForPeriod(userId, businessId, null),
  ]);

  return { today, week, month, allTime };
};
