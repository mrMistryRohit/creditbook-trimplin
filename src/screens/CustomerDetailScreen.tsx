import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  BackHandler,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "../../constants/theme";
import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";
import Screen from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import {
  Transaction,
  addTransactionForCustomer,
  deleteTransaction,
  getTransactionsForCustomer,
  updateTransaction,
} from "../database/transactionRepo";
import { appEvents } from "../utils/events";

interface CustomerParam {
  id: number;
  name: string;
  balance: number;
  last_activity?: string | null;
}

type DateFilter = "all" | "today" | "week" | "month";

export default function CustomerDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const customer: CustomerParam = params.customer
    ? JSON.parse(params.customer as string)
    : { id: 0, name: "Unknown Customer", balance: 0 };

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  // Edit modal state
  const [editVisible, setEditVisible] = useState(false);
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editType, setEditType] = useState<"credit" | "debit">("credit");

  const loadTransactions = async () => {
    if (!user || !customer.id) return;
    const list = await getTransactionsForCustomer(user.id, customer.id);
    setTransactions(list);
  };

  useEffect(() => {
    loadTransactions();
  }, [user, customer.id]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        router.push("/(tabs)/ledger");
        return true; // Prevent default back behavior
      }
    );

    return () => backHandler.remove();
  }, []);

  // Apply date filter
  useEffect(() => {
    let result = [...transactions];

    if (dateFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      result = result.filter((txn) => {
        const txnDate = parseDateString(txn.date);
        if (!txnDate) return true;

        switch (dateFilter) {
          case "today":
            return txnDate >= today;
          case "week":
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return txnDate >= weekAgo;
          case "month":
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return txnDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    setFilteredTransactions(result);
  }, [transactions, dateFilter]);

  const parseDateString = (dateStr: string): Date | null => {
    try {
      const parts = dateStr.split(", ");
      if (parts.length < 2) return null;

      const datePart = parts[0];
      const [day, month, year] = datePart.split("/").map(Number);

      return new Date(year, month - 1, day);
    } catch {
      return null;
    }
  };

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

    appEvents.emit("customerUpdated");

    setAmount("");
    setNote("");
    await loadTransactions();
  };

  const handleEditPress = (txn: Transaction) => {
    setEditingTxn(txn);
    setEditAmount(txn.amount.toString());
    setEditNote(txn.note || "");
    setEditType(txn.type);
    setEditVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!user || !customer.id || !editingTxn) return;
    const amt = Number(editAmount);
    if (Number.isNaN(amt) || amt <= 0) {
      Alert.alert("Invalid amount");
      return;
    }

    const now = new Date().toLocaleString("en-IN");

    await updateTransaction(
      user.id,
      customer.id,
      editingTxn.id,
      editingTxn.type,
      editingTxn.amount,
      editType,
      amt,
      editNote,
      now
    );

    appEvents.emit("customerUpdated");
    setEditVisible(false);
    setEditingTxn(null);
    await loadTransactions();
  };

  const handleDeletePress = (txn: Transaction) => {
    Alert.alert(
      "Delete Transaction",
      "Are you sure you want to delete this transaction?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!user || !customer.id) return;
            await deleteTransaction(
              user.id,
              customer.id,
              txn.id,
              txn.type,
              txn.amount
            );
            appEvents.emit("customerUpdated");
            await loadTransactions();
          },
        },
      ]
    );
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
        <TouchableOpacity
          onLongPress={() => handleEditPress(item)}
          activeOpacity={0.8}
        >
          <View style={styles.txnRow}>
            <View style={styles.txnInfo}>
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
        </TouchableOpacity>
        <View style={styles.txnActions}>
          <TouchableOpacity
            onPress={() => handleEditPress(item)}
            style={styles.actionButton}
          >
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDeletePress(item)}
            style={styles.actionButton}
          >
            <Text style={[styles.actionText, { color: colors.danger }]}>
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  return (
    <Screen>
      <View style={styles.container}>
        {/* Back Button Header */}
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => router.push("/(tabs)/ledger")} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.customerName}>{customer.name}</Text>
            <Text style={styles.customerTag}>Customer ledger</Text>
          </View>
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

        {/* Date Filters */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              dateFilter === "all" && styles.filterButtonActive,
            ]}
            onPress={() => setDateFilter("all")}
          >
            <Text
              style={[
                styles.filterText,
                dateFilter === "all" && styles.filterTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              dateFilter === "today" && styles.filterButtonActive,
            ]}
            onPress={() => setDateFilter("today")}
          >
            <Text
              style={[
                styles.filterText,
                dateFilter === "today" && styles.filterTextActive,
              ]}
            >
              Today
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              dateFilter === "week" && styles.filterButtonActive,
            ]}
            onPress={() => setDateFilter("week")}
          >
            <Text
              style={[
                styles.filterText,
                dateFilter === "week" && styles.filterTextActive,
              ]}
            >
              This Week
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              dateFilter === "month" && styles.filterButtonActive,
            ]}
            onPress={() => setDateFilter("month")}
          >
            <Text
              style={[
                styles.filterText,
                dateFilter === "month" && styles.filterTextActive,
              ]}
            >
              This Month
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>
          Transactions ({filteredTransactions.length})
        </Text>
        <FlatList
          data={filteredTransactions}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderTransaction}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No transactions for this period.
            </Text>
          }
        />

        {/* Edit Modal */}
        <Modal visible={editVisible} transparent animationType="slide">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Transaction</Text>

              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    editType === "credit" && styles.typeButtonActive,
                  ]}
                  onPress={() => setEditType("credit")}
                >
                  <Text style={styles.typeText}>You gave udhar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    editType === "debit" && styles.typeButtonActive,
                  ]}
                  onPress={() => setEditType("debit")}
                >
                  <Text style={styles.typeText}>You received</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.modalInput}
                placeholder="Amount"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={editAmount}
                onChangeText={setEditAmount}
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Note"
                placeholderTextColor={colors.textMuted}
                value={editNote}
                onChangeText={setEditNote}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setEditVisible(false)}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleSaveEdit}
                >
                  <Text style={styles.saveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerText: {
    flex: 1,
  },
  customerName: {
    color: colors.text,
    fontSize: 28,
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
  buttonRow: { flexDirection: "row", gap: 10, marginBottom: spacing.md },
  smallButton: { flex: 1 },
  filterRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: spacing.md,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: colors.inputBackground,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  filterTextActive: {
    color: "white",
  },
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
  txnInfo: { flex: 1 },
  txnNote: { color: colors.text, fontSize: typography.body, fontWeight: "600" },
  txnDate: {
    color: colors.textMuted,
    fontSize: typography.small,
    marginTop: 2,
  },
  amountBlock: { alignItems: "flex-end" },
  txnAmount: { fontSize: typography.body, fontWeight: "700" },
  txnType: { color: colors.textMuted, fontSize: typography.small },
  txnActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
    gap: 12,
  },
  actionButton: { paddingVertical: 4 },
  actionText: { color: colors.primary, fontSize: 13, fontWeight: "600" },
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.small,
    marginTop: spacing.sm,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },
  typeSelector: { flexDirection: "row", gap: 8, marginBottom: 12 },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: colors.inputBackground,
    borderRadius: 10,
    alignItems: "center",
  },
  typeButtonActive: { backgroundColor: colors.primary },
  typeText: { color: colors.text, fontSize: 13 },
  modalInput: {
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
    gap: 10,
  },
  modalButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  cancelButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveButton: { backgroundColor: colors.primary },
  cancelText: { color: colors.textMuted, fontSize: 15 },
  saveText: { color: "white", fontSize: 15, fontWeight: "600" },
});
