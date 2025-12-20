import { Ionicons } from "@expo/vector-icons";
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
import { colors, radius, spacing, typography } from "../../constants/theme";
import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";
import Screen from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { useBusiness } from "../context/BusinessContext";
import {
  Customer,
  archiveCustomer,
  deleteCustomer,
  unarchiveCustomer,
  updateCustomer,
} from "../database/customerRepo";
import {
  Transaction,
  addTransactionForCustomer,
  getTransactionsForCustomer,
} from "../database/transactionRepo";
import { appEvents } from "../utils/events";

interface CustomerParam {
  id: number;
  user_id: number;
  business_id: number | null;
  name: string;
  phone?: string | null;
  balance: number;
  last_activity?: string | null;
  archived?: number;
}

type DateFilter = "all" | "today" | "week" | "month";

export default function CustomerDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { currentBusiness } = useBusiness();

  const customer: CustomerParam = params.customer
    ? JSON.parse(params.customer as string)
    : {
        id: 0,
        user_id: 0,
        business_id: null,
        name: "Unknown Customer",
        phone: null,
        balance: 0,
        archived: 0,
      };

  const [customerData, setCustomerData] = useState<Customer>(customer);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<
    Transaction[]
  >([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  // Edit customer modal state
  const [editCustomerVisible, setEditCustomerVisible] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");

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
      "hardwareBackPress",
      () => {
        router.replace("/(tabs)/ledger");
        return true;
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
    if (!user || !currentBusiness || !customer) return;
    if (!amount.trim() || isNaN(parseFloat(amount))) {
      Alert.alert("Validation", "Please enter a valid amount");
      return;
    }

    const amt = parseFloat(amount);
    if (Number.isNaN(amt) || amt <= 0) {
      Alert.alert("Validation", "Amount must be greater than 0");
      return;
    }

    try {
      await addTransactionForCustomer(
        user.id,
        currentBusiness.id,
        customer.id,
        type,
        amt,
        note || (type === "credit" ? "Udhar given" : "Payment received"),
        new Date().toLocaleString("en-IN")
      );

      appEvents.emit("customerUpdated");

      setAmount("");
      setNote("");
      await loadTransactions();
    } catch (error) {
      Alert.alert("Error", "Failed to add transaction");
      console.error(error);
    }
  };

  const handleArchiveCustomer = () => {
    Alert.alert(
      customerData.archived ? "Unarchive Customer" : "Archive Customer",
      customerData.archived
        ? "Do you want to unarchive this customer?"
        : "Are you sure you want to archive this customer?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: customerData.archived ? "Unarchive" : "Archive",
          onPress: async () => {
            if (!user || !customerData.id) return;

            if (customerData.archived) {
              await unarchiveCustomer(user.id, customerData.id);
              setCustomerData({ ...customerData, archived: 0 });
              Alert.alert("Success", "Customer has been unarchived.");
            } else {
              await archiveCustomer(user.id, customerData.id);
              setCustomerData({ ...customerData, archived: 1 });
              Alert.alert("Success", "Customer has been archived.");
            }

            appEvents.emit("customerUpdated");
          },
        },
      ]
    );
  };

  const handleEditCustomer = () => {
    setEditName(customerData.name);
    setEditPhone(customerData.phone || "");
    setEditCustomerVisible(true);
  };

  const handleSaveCustomer = async () => {
    if (!user || !customerData.id) return;
    if (!editName.trim()) {
      Alert.alert("Error", "Customer name is required");
      return;
    }

    await updateCustomer(
      user.id,
      customerData.id,
      editName.trim(),
      editPhone.trim()
    );
    setCustomerData({
      ...customerData,
      name: editName.trim(),
      phone: editPhone.trim(),
    });
    appEvents.emit("customerUpdated");
    setEditCustomerVisible(false);
    Alert.alert("Success", "Customer details updated successfully");
  };

  const handleDeleteCustomer = () => {
    // Calculate current balance
    const currentBalance = transactions.reduce((bal, t) => {
      return t.type === "credit" ? bal + t.amount : bal - t.amount;
    }, 0);

    // Check if balance is not zero
    if (currentBalance !== 0) {
      const absBalance = Math.abs(currentBalance);
      const message =
        currentBalance > 0
          ? `Customer still owes ₹${absBalance.toLocaleString("en-IN")} to you`
          : `You still owe ₹${absBalance.toLocaleString(
              "en-IN"
            )} to the customer`;

      Alert.alert("Cannot Delete", message);
      return;
    }

    // Proceed with delete if balance is zero
    Alert.alert(
      "Delete Customer",
      "Are you sure you want to delete this customer? This will also delete all transactions.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!user || !customerData.id) return;
            await deleteCustomer(user.id, customerData.id);
            appEvents.emit("customerUpdated");
            Alert.alert("Deleted", "Customer has been deleted", [
              {
                text: "OK",
                onPress: () => router.replace("/(tabs)/ledger"),
              },
            ]);
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
      </Card>
    );
  };

  return (
    <Screen>
      <View style={styles.container}>
        {/* Back Button Header */}
        <View style={styles.headerContainer}>
          <TouchableOpacity
            onPress={() => router.replace("/(tabs)/ledger")}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.customerName}>{customerData.name}</Text>
            <Text style={styles.customerTag}>Customer ledger</Text>
          </View>
          <TouchableOpacity
            onPress={handleEditCustomer}
            style={styles.iconButton}
          >
            <Ionicons name="create-outline" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleArchiveCustomer}
            style={styles.archiveButton}
          >
            <Ionicons
              name={
                customerData.archived ? "arrow-undo-outline" : "archive-outline"
              }
              size={22}
              color={customerData.archived ? colors.accent : colors.text}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDeleteCustomer}
            style={styles.iconButton}
          >
            <Ionicons name="trash-outline" size={22} color={colors.danger} />
          </TouchableOpacity>
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

        {/* Create Bill button */}
        <PrimaryButton
          label="Create Bill"
          onPress={() =>
            router.push({
              pathname: "./create-bill",
              params: { customerId: customerData.id.toString() },
            })
          }
          style={{ marginBottom: spacing.md }}
        />

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

        {/* Edit Customer Modal */}
        <Modal visible={editCustomerVisible} transparent animationType="slide">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Customer</Text>

              <TextInput
                style={styles.modalInput}
                placeholder="Customer Name *"
                placeholderTextColor={colors.textMuted}
                value={editName}
                onChangeText={setEditName}
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Phone Number (optional)"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                value={editPhone}
                onChangeText={setEditPhone}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setEditCustomerVisible(false)}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleSaveCustomer}
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
  iconButton: {
    padding: 4,
    marginLeft: 8,
  },
  archiveButton: {
    padding: 4,
    marginLeft: 8,
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
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.small,
    marginTop: spacing.sm,
    textAlign: "center",
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
