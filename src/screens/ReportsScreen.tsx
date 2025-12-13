import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "../../constants/theme";
import AppHeader from "../components/AppHeader";
import Card from "../components/Card";
import Screen from "../components/Screen";

export default function ReportsScreen() {
  const totalCredit = 9600;
  const totalDebit = 4300;
  const net = totalCredit - totalDebit;

  return (
    <Screen>
      <AppHeader title="Reports" subtitle="Overview of your business" />
      <Card style={styles.summaryCard}>
        <Text style={styles.sectionTitle}>This month</Text>
        <View style={styles.row}>
          <View>
            <Text style={styles.label}>Total udhar given</Text>
            <Text style={[styles.value, styles.credit]}>
              ₹ {totalCredit.toLocaleString("en-IN")}
            </Text>
          </View>
          <View>
            <Text style={styles.label}>Total payment received</Text>
            <Text style={[styles.value, styles.debit]}>
              ₹ {totalDebit.toLocaleString("en-IN")}
            </Text>
          </View>
        </View>
        <View style={styles.netRow}>
          <Text style={styles.label}>Net balance</Text>
          <Text style={[styles.value, net >= 0 ? styles.credit : styles.debit]}>
            ₹ {net.toLocaleString("en-IN")}
          </Text>
        </View>
      </Card>
      <Card>
        <Text style={styles.sectionTitle}>Coming soon</Text>
        <Text style={styles.body}>
          Graphs, daily summaries, and more detailed analytics will appear here
          when backend is ready.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summaryCard: { marginBottom: spacing.lg },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.subheading,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  netRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  label: { color: colors.textMuted, fontSize: typography.small },
  value: { marginTop: 4, fontSize: typography.subheading, fontWeight: "700" },
  credit: { color: colors.accent },
  debit: { color: colors.danger },
  body: { color: colors.textMuted, fontSize: typography.body },
});
