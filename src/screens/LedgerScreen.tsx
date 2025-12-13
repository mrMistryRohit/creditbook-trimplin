import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";
import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";
import Screen from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import {
  Transaction,
  addTransactionForCustomer,
  getTransactionsForCustomer,
} from "../database/transactionRepo";
import { appEvents } from "../utils/events";

interface CustomerParam {
  id: number;
  name: string;
  balance: number;
  last_activity?: string | null;
}

export default function LedgerScreen() {
  const params = useLocalSearchParams();
  const { user } = useAuth();

  const customer: CustomerParam = params.customer
    ? JSON.parse(params.customer as string)
    : { id: 0, name: "Sample Customer", balance: 0 };

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const loadTransactions = async () => {
    if (!user || !customer.id) return;
    const list = await getTransactionsForCustomer(user.id, customer.id);
    setTransactions(list);
  };

  useEffect(() => {
    loadTransactions();
  }, [user, customer.id]);

  const handleAddTransaction = async (type: "credit" | "debit") => {
    if (!user || !customer.id) return;
    if (!amount) return;

    const amt = Number(amount);
    if (Number.isNaN(amt) || amt <= 0) return;

    const now = new Date();
    const formatted = now.toLocaleString("en-IN");

    await addTransactionForCustomer(
      user.id,
      customer.id,
      type,
      amt,
      note || (type === "credit" ? "Udhar given" : "Payment received"),
      formatted
    );

    // notify Home to reload customers
    appEvents.emit("customerUpdated");

    setAmount("");
    setNote("");
    await loadTransactions();
  };

  const balance = transactions.reduce((bal, t) => {
    return t.type === "credit" ? bal + t.amount : bal - t.amount;
  }, 0);

  const isDue = balance > 0;

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const isCredit = item.type === "credit";
    return (
      <Card
        style={[
          styles.txnCard,
          {
            borderLeftWidth: 3,
            borderLeftColor: isCredit ? colors.accent : colors.danger,
          },
        ]}
      >
        <View style={styles.txnRow}>
          <View>
            <Text style={styles.txnNote}>{item.note || ""}</Text>
            <Text style={styles.txnDate}>{item.date}</Text>
          </View>
          <View style={styles.amountBlock}>
            <Text
              style={[
                styles.txnAmount,
                isCredit ? styles.credit : styles.debit,
              ]}
            >
              {isCredit ? "+" : "-"} ₹ {item.amount.toLocaleString("en-IN")}
            </Text>
            <Text style={styles.txnType}>
              {isCredit ? "You gave udhar" : "You received payment"}
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <Screen>
      <View style={styles.headerContainer}>
        <Text style={styles.customerName}>{customer.name}</Text>
        <Text style={styles.customerTag}>Customer ledger</Text>
      </View>

      <Card style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Current balance</Text>
        <Text
          style={[styles.balanceValue, isDue ? styles.credit : styles.debit]}
        >
          ₹ {Math.abs(balance).toLocaleString("en-IN")}
        </Text>
        <Text style={styles.balanceSub}>
          {isDue
            ? "You will get from this customer"
            : "You will give to this customer"}
        </Text>
      </Card>

      <View style={styles.inputRow}>
        <TextInput
          placeholder="Amount"
          placeholderTextColor={colors.textMuted}
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
          style={styles.input}
        />
        <TextInput
          placeholder="Note (optional)"
          placeholderTextColor={colors.textMuted}
          value={note}
          onChangeText={setNote}
          style={[styles.input, { flex: 1 }]}
        />
      </View>

      <View style={styles.buttonRow}>
        <PrimaryButton
          label="You gave udhar"
          onPress={() => handleAddTransaction("credit")}
          style={[styles.smallButton, { backgroundColor: colors.accent }]}
        />
        <PrimaryButton
          label="You received"
          onPress={() => handleAddTransaction("debit")}
          style={[styles.smallButton, { backgroundColor: colors.danger }]}
        />
      </View>

      <Text style={styles.sectionTitle}>Transactions</Text>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderTransaction}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No transactions yet. Add one above.
          </Text>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerContainer: { marginTop: spacing.sm, marginBottom: spacing.md },
  customerName: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: "700",
  },
  customerTag: {
    color: colors.textMuted,
    fontSize: typography.small,
    marginTop: 2,
  },
  balanceCard: { marginBottom: spacing.md },
  balanceLabel: { color: colors.textMuted, fontSize: typography.small },
  balanceValue: { marginTop: 4, fontSize: 26, fontWeight: "700" },
  balanceSub: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: typography.small,
  },
  credit: { color: colors.accent },
  debit: { color: colors.danger },
  inputRow: { flexDirection: "row", gap: 8, marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.inputBackground,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    color: colors.text,
    minWidth: 100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonRow: { flexDirection: "row", gap: 10, marginBottom: spacing.lg },
  smallButton: { flex: 1 },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.subheading,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  txnCard: { marginBottom: 8 },
  txnRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  txnNote: { color: colors.text, fontSize: typography.body, fontWeight: "600" },
  txnDate: {
    color: colors.textMuted,
    fontSize: typography.small,
    marginTop: 2,
  },
  amountBlock: { alignItems: "flex-end" },
  txnAmount: { fontSize: typography.body, fontWeight: "700" },
  txnType: { color: colors.textMuted, fontSize: typography.small },
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.small,
    marginTop: spacing.sm,
  },
});
