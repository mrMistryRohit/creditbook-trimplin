import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { colors, spacing, typography } from "../../constants/theme";
import Card from "../components/Card";
import Screen from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { useBusiness } from "../context/BusinessContext";
import { getReportsForUser, PeriodReport } from "../database/reportsRepo";
import { appEvents } from "../utils/events";

type PeriodTab = "today" | "week" | "month" | "allTime";

export default function ReportsScreen() {
  const { user } = useAuth();
  const { currentBusiness } = useBusiness();
  const [reports, setReports] = useState<PeriodReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePeriod, setActivePeriod] = useState<PeriodTab>("month");

  // ✅ Wrap loadReports in useCallback with proper dependencies
  const loadReports = useCallback(async () => {
    console.log("🔄 ReportsScreen loadReports called");
    console.log(
      "User ID:",
      user?.id,
      "Current Business:",
      currentBusiness?.name,
      "ID:",
      currentBusiness?.id
    );

    if (!user || !currentBusiness) {
      console.log("⚠️ Missing user or business");
      setReports(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await getReportsForUser(user.id, currentBusiness.id);
      console.log("✅ Reports loaded for business:", currentBusiness.id, data);
      setReports(data);
    } catch (error) {
      console.error("❌ Failed to load reports:", error);
      setReports(null);
    } finally {
      setLoading(false);
    }
  }, [user, currentBusiness]); // ✅ Fixed: Use full objects, not optional chaining

  // ✅ Load reports when dependencies change
  useEffect(() => {
    console.log("📊 Reports useEffect triggered");
    loadReports();
  }, [loadReports]);

  // ✅ Event handlers to reload data
  useEffect(() => {
    const handler = () => {
      console.log("📣 Reports: Event received, reloading data");
      loadReports();
    };

    appEvents.on("customerUpdated", handler);
    appEvents.on("supplierUpdated", handler);
    appEvents.on("businessUpdated", handler); // ✅ Changed from businessSwitched
    // appEvents.on("transactionAdded", handler); // ✅ Added if you emit this

    return () => {
      appEvents.off("customerUpdated", handler);
      appEvents.off("supplierUpdated", handler);
      appEvents.off("businessUpdated", handler);
      // appEvents.off("transactionAdded", handler);
    };
  }, [loadReports]); // ✅ Added loadReports dependency

  if (loading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      </Screen>
    );
  }

  if (!reports) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>No data available.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadReports}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  const currentReport = reports[activePeriod];

  return (
    <Screen>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Reports</Text>
          <Text style={styles.subtitle}>
            Financial summary of your business
          </Text>
          {currentBusiness && (
            <Text style={styles.businessName}>{currentBusiness.name}</Text>
          )}
        </View>

        {/* Period Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activePeriod === "today" && styles.tabActive]}
            onPress={() => setActivePeriod("today")}
          >
            <Text
              style={[
                styles.tabText,
                activePeriod === "today" && styles.tabTextActive,
              ]}
            >
              Today
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activePeriod === "week" && styles.tabActive]}
            onPress={() => setActivePeriod("week")}
          >
            <Text
              style={[
                styles.tabText,
                activePeriod === "week" && styles.tabTextActive,
              ]}
            >
              7 Days
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activePeriod === "month" && styles.tabActive]}
            onPress={() => setActivePeriod("month")}
          >
            <Text
              style={[
                styles.tabText,
                activePeriod === "month" && styles.tabTextActive,
              ]}
            >
              30 Days
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activePeriod === "allTime" && styles.tabActive]}
            onPress={() => setActivePeriod("allTime")}
          >
            <Text
              style={[
                styles.tabText,
                activePeriod === "allTime" && styles.tabTextActive,
              ]}
            >
              All Time
            </Text>
          </TouchableOpacity>
        </View>

        {/* Summary Cards */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Udhar Given</Text>
              <Text style={[styles.summaryValue, styles.credit]}>
                ₹ {currentReport.totalCredit.toLocaleString("en-IN")}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Payment Received</Text>
              <Text style={[styles.summaryValue, styles.debit]}>
                ₹ {currentReport.totalDebit.toLocaleString("en-IN")}
              </Text>
            </View>
          </View>
        </Card>

        {/* Net Balance */}
        <Card style={styles.netCard}>
          <Text style={styles.netLabel}>Net Balance</Text>
          <Text
            style={[
              styles.netValue,
              currentReport.netBalance >= 0 ? styles.credit : styles.debit,
            ]}
          >
            {currentReport.netBalance >= 0 ? "+" : ""}₹{" "}
            {Math.abs(currentReport.netBalance).toLocaleString("en-IN")}
          </Text>
          <Text style={styles.netDescription}>
            {currentReport.netBalance >= 0
              ? "Total outstanding amount you will receive"
              : "Total amount you owe to customers"}
          </Text>
        </Card>

        {/* Transaction Count */}
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total Transactions</Text>
            <Text style={styles.infoValue}>
              {currentReport.transactionCount}
            </Text>
          </View>
        </Card>

        {/* All Periods Overview */}
        <Text style={styles.sectionTitle}>Quick Overview</Text>

        <Card style={styles.periodCard}>
          <Text style={styles.periodTitle}>Today</Text>
          <View style={styles.periodRow}>
            <Text style={styles.periodLabel}>Given:</Text>
            <Text style={styles.periodValue}>
              ₹ {reports.today.totalCredit.toLocaleString("en-IN")}
            </Text>
          </View>
          <View style={styles.periodRow}>
            <Text style={styles.periodLabel}>Received:</Text>
            <Text style={styles.periodValue}>
              ₹ {reports.today.totalDebit.toLocaleString("en-IN")}
            </Text>
          </View>
          <View style={styles.periodRow}>
            <Text style={styles.periodLabel}>Transactions:</Text>
            <Text style={styles.periodValue}>
              {reports.today.transactionCount}
            </Text>
          </View>
        </Card>

        <Card style={styles.periodCard}>
          <Text style={styles.periodTitle}>Last 7 Days</Text>
          <View style={styles.periodRow}>
            <Text style={styles.periodLabel}>Given:</Text>
            <Text style={styles.periodValue}>
              ₹ {reports.week.totalCredit.toLocaleString("en-IN")}
            </Text>
          </View>
          <View style={styles.periodRow}>
            <Text style={styles.periodLabel}>Received:</Text>
            <Text style={styles.periodValue}>
              ₹ {reports.week.totalDebit.toLocaleString("en-IN")}
            </Text>
          </View>
          <View style={styles.periodRow}>
            <Text style={styles.periodLabel}>Transactions:</Text>
            <Text style={styles.periodValue}>
              {reports.week.transactionCount}
            </Text>
          </View>
        </Card>

        <Card style={styles.periodCard}>
          <Text style={styles.periodTitle}>Last 30 Days</Text>
          <View style={styles.periodRow}>
            <Text style={styles.periodLabel}>Given:</Text>
            <Text style={styles.periodValue}>
              ₹ {reports.month.totalCredit.toLocaleString("en-IN")}
            </Text>
          </View>
          <View style={styles.periodRow}>
            <Text style={styles.periodLabel}>Received:</Text>
            <Text style={styles.periodValue}>
              ₹ {reports.month.totalDebit.toLocaleString("en-IN")}
            </Text>
          </View>
          <View style={styles.periodRow}>
            <Text style={styles.periodLabel}>Transactions:</Text>
            <Text style={styles.periodValue}>
              {reports.month.transactionCount}
            </Text>
          </View>
        </Card>

        <Card style={[styles.periodCard, { marginBottom: 40 }]}>
          <Text style={styles.periodTitle}>All Time</Text>
          <View style={styles.periodRow}>
            <Text style={styles.periodLabel}>Given:</Text>
            <Text style={styles.periodValue}>
              ₹ {reports.allTime.totalCredit.toLocaleString("en-IN")}
            </Text>
          </View>
          <View style={styles.periodRow}>
            <Text style={styles.periodLabel}>Received:</Text>
            <Text style={styles.periodValue}>
              ₹ {reports.allTime.totalDebit.toLocaleString("en-IN")}
            </Text>
          </View>
          <View style={styles.periodRow}>
            <Text style={styles.periodLabel}>Transactions:</Text>
            <Text style={styles.periodValue}>
              {reports.allTime.transactionCount}
            </Text>
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: typography.body,
    marginTop: spacing.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.body,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: spacing.md,
  },
  retryText: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
  },
  header: {
    paddingTop: 12,
    paddingBottom: 16,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  businessName: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  tabRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: colors.inputBackground,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  tabTextActive: {
    color: "white",
  },
  summaryCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryItem: {
    flex: 1,
  },
  summaryDivider: {
    width: 1,
    height: 50,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  credit: { color: colors.accent },
  debit: { color: colors.danger },
  netCard: {
    marginBottom: spacing.md,
    padding: spacing.lg,
    alignItems: "center",
  },
  netLabel: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: 8,
  },
  netValue: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 8,
  },
  netDescription: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: "center",
  },
  infoCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLabel: {
    color: colors.textMuted,
    fontSize: 14,
  },
  infoValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  periodCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  periodTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  periodRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 4,
  },
  periodLabel: {
    color: colors.textMuted,
    fontSize: 14,
  },
  periodValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
});
