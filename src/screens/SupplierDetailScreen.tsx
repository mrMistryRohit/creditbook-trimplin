import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  BackHandler,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { colors } from "../../constants/theme";
import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";
import Screen from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { useBusiness } from "../context/BusinessContext";
import {
  archiveSupplier,
  deleteSupplier,
  Supplier,
  unarchiveSupplier,
  updateSupplier,
} from "../database/supplierRepo";
import {
  addSupplierTransaction,
  getTransactionsForSupplier,
  SupplierTransaction,
} from "../database/supplierTransactionRepo";
import { appEvents } from "../utils/events";

export default function SupplierDetailScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentBusiness } = useBusiness();
  const params = useLocalSearchParams();

  const supplierData = params.supplier
    ? JSON.parse(params.supplier as string)
    : null;

  const [supplier, setSupplier] = useState<Supplier | null>(supplierData);
  const [transactions, setTransactions] = useState<SupplierTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [addVisible, setAddVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);

  // Form states
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [transactionType, setTransactionType] = useState<"credit" | "debit">(
    "credit"
  );

  // Edit supplier
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const loadTransactions = async () => {
    if (!user || !supplier) return;
    setLoading(true);
    const txns = await getTransactionsForSupplier(user.id, supplier.id);
    setTransactions(txns);
    setLoading(false);
  };

  useEffect(() => {
    loadTransactions();
  }, [supplier?.id]);

  // Handle back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        router.replace("/(tabs)");
        return true;
      }
    );
    return () => backHandler.remove();
  }, []);

  const handleAddTransaction = async () => {
    if (!user || !currentBusiness || !supplier || !amount.trim()) return;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount.");
      return;
    }

    try {
      const now = new Date().toLocaleString("en-IN");
      await addSupplierTransaction(
        user.id,
        currentBusiness.id,
        supplier.id,
        transactionType,
        amountNum,
        note.trim() ||
          (transactionType === "credit" ? "Goods Purchased" : "Payment Made"),
        now
      );

      setAmount("");
      setNote("");
      setTransactionType("credit");
      setAddVisible(false);

      await loadTransactions();
      appEvents.emit("supplierUpdated");

      // Update local supplier balance
      const delta = transactionType === "credit" ? amountNum : -amountNum;
      setSupplier((prev) =>
        prev ? { ...prev, balance: prev.balance + delta } : null
      );
    } catch (error) {
      Alert.alert("Error", "Failed to add transaction");
      console.error(error);
    }
  };

  const handleEditSupplier = async () => {
    if (!user || !supplier || !editName.trim()) return;

    await updateSupplier(
      user.id,
      supplier.id,
      editName.trim(),
      editPhone.trim()
    );
    setSupplier((prev) =>
      prev ? { ...prev, name: editName.trim(), phone: editPhone.trim() } : null
    );
    setEditVisible(false);
    appEvents.emit("supplierUpdated");
    Alert.alert("Success", "Supplier details updated successfully");
  };

  const openEditSupplier = () => {
    if (!supplier) return;
    setEditName(supplier.name);
    setEditPhone(supplier.phone || "");
    setEditVisible(true);
  };

  const handleArchiveSupplier = () => {
    Alert.alert(
      "Archive Supplier",
      "Are you sure you want to archive this supplier?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: async () => {
            if (!user || !supplier) return;
            await archiveSupplier(user.id, supplier.id);
            appEvents.emit("supplierUpdated");
            Alert.alert("Success", "Supplier has been archived", [
              {
                text: "OK",
                onPress: () => router.replace("/(tabs)"),
              },
            ]);
          },
        },
      ]
    );
  };

  const handleUnarchiveSupplier = async () => {
    if (!user || !supplier) return;
    await unarchiveSupplier(user.id, supplier.id);
    setSupplier((prev) => (prev ? { ...prev, archived: 0 } : null));
    appEvents.emit("supplierUpdated");
    Alert.alert("Success", "Supplier has been unarchived.");
  };

  const handleDeleteSupplier = () => {
    // Calculate current balance
    const currentBalance = transactions.reduce((bal, t) => {
      return t.type === "credit" ? bal + t.amount : bal - t.amount;
    }, 0);

    // Check if balance is not zero
    if (currentBalance !== 0) {
      const absBalance = Math.abs(currentBalance);
      const message =
        currentBalance > 0
          ? `You still owe ₹${absBalance.toLocaleString(
              "en-IN"
            )} to the supplier`
          : `Supplier still owes ₹${absBalance.toLocaleString("en-IN")} to you`;

      Alert.alert("Cannot Delete", message);
      return;
    }

    // Proceed with delete if balance is zero
    Alert.alert(
      "Delete Supplier",
      "Are you sure you want to permanently delete this supplier and all transactions?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!user || !supplier) return;
            await deleteSupplier(user.id, supplier.id);
            appEvents.emit("supplierUpdated");
            Alert.alert("Deleted", "Supplier has been deleted", [
              {
                text: "OK",
                onPress: () => router.replace("/(tabs)"),
              },
            ]);
          },
        },
      ]
    );
  };

  const renderTransaction = ({ item }: { item: SupplierTransaction }) => {
    const isCredit = item.type === "credit";
    return (
      <View style={styles.transactionCard}>
        <View style={styles.transactionLeft}>
          <View
            style={[
              styles.transactionIcon,
              isCredit ? styles.creditIcon : styles.debitIcon,
            ]}
          >
            <Ionicons
              name={isCredit ? "arrow-down" : "arrow-up"}
              size={18}
              color="white"
            />
          </View>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionNote}>
              {item.note || (isCredit ? "Goods Purchased" : "Payment Made")}
            </Text>
            <Text style={styles.transactionDate}>{item.date}</Text>
          </View>
        </View>
        <View style={styles.transactionRight}>
          <Text
            style={[
              styles.transactionAmount,
              isCredit ? styles.creditText : styles.debitText,
            ]}
          >
            {isCredit ? "+" : "-"}₹{item.amount.toLocaleString("en-IN")}
          </Text>
        </View>
      </View>
    );
  };

  if (!supplier) {
    return (
      <Screen>
        <Text style={styles.errorText}>Supplier not found</Text>
      </Screen>
    );
  }

  const isPayable = supplier.balance > 0;

  return (
    <Screen>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.replace("/(tabs)")}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={openEditSupplier}
              style={styles.iconButton}
            >
              <Ionicons name="create-outline" size={22} color={colors.text} />
            </TouchableOpacity>

            {/* Conditional Archive/Unarchive button */}
            {supplier.archived ? (
              <TouchableOpacity
                onPress={handleUnarchiveSupplier}
                style={styles.iconButton}
              >
                <Ionicons
                  name="arrow-undo-outline"
                  size={22}
                  color={colors.accent}
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleArchiveSupplier}
                style={styles.iconButton}
              >
                <Ionicons
                  name="archive-outline"
                  size={22}
                  color={colors.text}
                />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleDeleteSupplier}
              style={styles.iconButton}
            >
              <Ionicons name="trash-outline" size={22} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Supplier Info */}
        <View style={styles.supplierInfo}>
          <Text style={styles.supplierName}>{supplier.name}</Text>
          {supplier.phone && (
            <Text style={styles.supplierPhone}>{supplier.phone}</Text>
          )}
        </View>

        {/* Balance Card */}
        <Card style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>
            {isPayable ? "You will pay" : "You will get"}
          </Text>
          <Text
            style={[
              styles.balanceValue,
              isPayable ? styles.payableBalance : styles.receivableBalance,
            ]}
          >
            ₹ {Math.abs(supplier.balance).toLocaleString("en-IN")}
          </Text>
        </Card>

        {/* Add Transaction Button */}
        <PrimaryButton
          label="+ Add Transaction"
          onPress={() => setAddVisible(true)}
          style={styles.addButton}
        />

        {/* Transactions Section */}
        <Text style={styles.sectionTitle}>Transaction History</Text>

        {transactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No transactions yet. Add your first transaction above.
            </Text>
          </View>
        ) : (
          <FlatList
            data={transactions}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderTransaction}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </ScrollView>

      {/* Add Transaction Modal */}
      <Modal
        visible={addVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Transaction</Text>

            {/* Type Selector */}
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  transactionType === "credit" && styles.typeButtonActive,
                ]}
                onPress={() => setTransactionType("credit")}
              >
                <Text
                  style={[
                    styles.typeText,
                    transactionType === "credit" && styles.typeTextActive,
                  ]}
                >
                  Goods Purchased (You owe)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  transactionType === "debit" && styles.typeButtonActive,
                ]}
                onPress={() => setTransactionType("debit")}
              >
                <Text
                  style={[
                    styles.typeText,
                    transactionType === "debit" && styles.typeTextActive,
                  ]}
                >
                  Payment Made
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Amount"
              placeholderTextColor={colors.textMuted}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="Note (optional)"
              placeholderTextColor={colors.textMuted}
              value={note}
              onChangeText={setNote}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setAddVisible(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleAddTransaction}
              >
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Supplier Modal */}
      <Modal
        visible={editVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Supplier</Text>
            <TextInput
              style={styles.input}
              placeholder="Supplier name"
              placeholderTextColor={colors.textMuted}
              value={editName}
              onChangeText={setEditName}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone (optional)"
              placeholderTextColor={colors.textMuted}
              value={editPhone}
              onChangeText={setEditPhone}
              keyboardType="phone-pad"
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
                onPress={handleEditSupplier}
              >
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
  },
  iconButton: {
    padding: 8,
  },
  supplierInfo: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  supplierName: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "700",
  },
  supplierPhone: {
    color: colors.textMuted,
    fontSize: 16,
    marginTop: 4,
  },
  balanceCard: {
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
  },
  balanceLabel: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 36,
    fontWeight: "700",
  },
  payableBalance: { color: colors.danger },
  receivableBalance: { color: colors.accent },
  addButton: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },
  transactionCard: {
    backgroundColor: colors.inputBackground,
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  transactionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  creditIcon: { backgroundColor: colors.danger },
  debitIcon: { backgroundColor: colors.accent },
  transactionInfo: {
    flex: 1,
  },
  transactionNote: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  transactionDate: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  transactionRight: {
    alignItems: "flex-end",
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "700",
  },
  creditText: { color: colors.danger },
  debitText: { color: colors.accent },
  separator: { height: 12 },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: "center",
  },
  errorText: {
    color: colors.danger,
    fontSize: 16,
    textAlign: "center",
    marginTop: 40,
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
  typeSelector: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.inputBackground,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  typeTextActive: {
    color: "white",
  },
  input: {
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
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  cancelButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  cancelText: { color: colors.textMuted, fontSize: 15 },
  saveText: { color: "white", fontSize: 15, fontWeight: "600" },
});
