import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";
import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";
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

export default function LedgerScreen() {
  const params = useLocalSearchParams();
  const { user } = useAuth();

  const customer: CustomerParam = params.customer
    ? JSON.parse(params.customer as string)
    : { id: 0, name: "Sample Customer", balance: 0 };

  const [transactions, setTransactions] = useState<Transaction[]>([]);
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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
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
            <Text style={styles.emptyText}>No transactions yet.</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, paddingHorizontal: 16 },
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
