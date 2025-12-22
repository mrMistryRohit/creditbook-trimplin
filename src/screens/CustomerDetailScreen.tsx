import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
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
import { colors, spacing, typography } from "../../constants/theme";
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
  updateCustomerDueDate,
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
  due_date?: string | null;
}

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

  const [customerData, setCustomerData] = useState<Customer>(
    customer as Customer
  );

  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Edit customer modal
  const [editCustomerVisible, setEditCustomerVisible] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");

  // You Gave modal
  const [showGivenModal, setShowGivenModal] = useState(false);
  const [givenAmount, setGivenAmount] = useState("");
  const [givenNote, setGivenNote] = useState("");
  const [givenDate, setGivenDate] = useState<Date>(new Date());

  // You Received modal
  const [showReceivedModal, setShowReceivedModal] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState("");
  const [receivedNote, setReceivedNote] = useState("");
  const [receivedDate, setReceivedDate] = useState<Date>(new Date());

  // Due date UI placeholder
  // const [showDueDateModal, setShowDueDateModal] = useState(false);
  // const [selectedDueDate, setSelectedDueDate] = useState<Date | null>(null);

  const loadTransactions = async () => {
    if (!user || !customer.id) return;
    const list = await getTransactionsForCustomer(user.id, customer.id);
    setTransactions(list ?? []);
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

  const balance = useMemo(
    () =>
      transactions.reduce((bal, t) => {
        return t.type === "credit" ? bal + t.amount : bal - t.amount;
      }, 0),
    [transactions]
  );

  const isDue = balance > 0;

  // Build list with running remaining amount (from oldest to newest)
  const transactionsWithRunning = useMemo(() => {
    let running = 0;
    const oldestFirst = [...transactions].reverse();
    const withRunning = oldestFirst.map((t) => {
      const delta = t.type === "credit" ? t.amount : -t.amount;
      running += delta;
      return { ...t, runningBalance: running };
    });
    return withRunning.reverse();
  }, [transactions]);

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
    if (!transactions.length) {
      // Quick path
      if (!user || !customerData.id) return;
      Alert.alert(
        "Delete Customer",
        "Are you sure you want to delete this customer?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              await deleteCustomer(user!.id, customerData.id);
              appEvents.emit("customerUpdated");
              router.replace("/(tabs)/ledger");
            },
          },
        ]
      );
      return;
    }

    const currentBalance = balance;
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

  const handleAddGivenEntryOnly = async () => {
    if (!user || !currentBusiness) return;

    const amt = parseFloat(givenAmount);
    if (!givenAmount.trim() || isNaN(amt) || amt <= 0) {
      Alert.alert("Validation", "Please enter a valid amount");
      return;
    }

    await addTransactionForCustomer(
      user.id,
      currentBusiness.id,
      customer.id,
      "credit",
      amt,
      givenNote || "Udhar given",
      givenDate.toLocaleDateString("en-IN")
    );

    appEvents.emit("customerUpdated");
    setShowGivenModal(false);
    setGivenAmount("");
    setGivenNote("");
    setGivenDate(new Date());
    await loadTransactions();
  };

  const handleAddReceived = async () => {
    if (!user || !currentBusiness) return;

    const amt = parseFloat(receivedAmount);
    if (!receivedAmount.trim() || isNaN(amt) || amt <= 0) {
      Alert.alert("Validation", "Please enter a valid amount");
      return;
    }

    await addTransactionForCustomer(
      user.id,
      currentBusiness.id,
      customer.id,
      "debit",
      amt,
      receivedNote || "Payment received",
      receivedDate.toLocaleDateString("en-IN")
    );

    appEvents.emit("customerUpdated");
    setShowReceivedModal(false);
    setReceivedAmount("");
    setReceivedNote("");
    setReceivedDate(new Date());
    await loadTransactions();
  };

  const renderTransaction = ({
    item,
  }: {
    item: Transaction & { runningBalance?: number };
  }) => {
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
            {typeof item.runningBalance === "number" && (
              <Text style={styles.txnBalance}>
                Remaining: ₹
                {Math.abs(item.runningBalance).toLocaleString("en-IN")}
              </Text>
            )}
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
              {isCredit ? "Send" : "Received payment"}
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  // Due date UI
  const [showDueDateModal, setShowDueDateModal] = useState(false);
  const [tempDueDate, setTempDueDate] = useState<Date | null>(null);

  const handleClearDueDate = async () => {
    if (!user || !customerData.id) return;

    await updateCustomerDueDate(user.id, customerData.id, null);
    setCustomerData({ ...customerData, due_date: null });
    appEvents.emit("customerUpdated");
  };

  const [showTxnDatePicker, setShowTxnDatePicker] = useState(false);
  const [txnDateTarget, setTxnDateTarget] = useState<"given" | "received">(
    "given"
  );

  // helper
  const parseEnInDate = (value: string | null | undefined): Date => {
    if (!value) return new Date(); // fallback to today

    const [day, month, year] = value.split("/").map(Number);
    if (!day || !month || !year) return new Date();

    return new Date(year, month - 1, day);
  };

  return (
    <Screen>
      <View style={styles.container}>
        {/* Header */}
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

        {/* Balance */}
        <Card style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Current Balance</Text>
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

        {/* Due date row (simple text for now) */}
        <Card style={[styles.balanceCard, { marginBottom: spacing.md }]}>
          <View style={styles.dueRow}>
            <View>
              <Text style={styles.balanceLabel}>Due Date</Text>
              <Text style={styles.dueDateText}>
                {customerData.due_date || "No due date set"}
              </Text>
            </View>
            {/* Hook this to a calendar modal later */}
            {/* <TouchableOpacity onPress={() => setShowDueDateModal(true)}> */}
            <TouchableOpacity
              onPress={() => {
                const initial = parseEnInDate(customerData.due_date || null);
                setTempDueDate(initial);
                setShowDueDateModal(true);
              }}
            >
              <Text style={styles.dueSetText}>Set / Change</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClearDueDate}>
              <Text style={styles.dueClearText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Action buttons */}
        <View style={styles.buttonRow}>
          <PrimaryButton
            label="Send"
            onPress={() => setShowGivenModal(true)}
            style={[styles.smallButton, { backgroundColor: colors.accent }]}
          />
          <PrimaryButton
            label="Received"
            onPress={() => setShowReceivedModal(true)}
            style={[styles.smallButton, { backgroundColor: colors.danger }]}
          />
        </View>

        {/* Create Bill button */}
        {/* <PrimaryButton
          label="Create Bill"
          onPress={() =>
            router.push({
              pathname: "./create-bill",
              params: { customerId: customerData.id.toString() },
            })
          }
          style={{ marginBottom: spacing.md }}
        /> */}

        {/* Transactions */}
        <Text style={styles.sectionTitle}>
          Transactions ({transactionsWithRunning.length})
        </Text>
        <FlatList
          data={transactionsWithRunning}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderTransaction}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No transactions yet.</Text>
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

        {/* You Gave(Send) Modal */}
        <Modal visible={showGivenModal} transparent animationType="slide">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Send</Text>

              <TextInput
                style={styles.modalInput}
                placeholder="Amount"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={givenAmount}
                onChangeText={setGivenAmount}
              />

              <TouchableOpacity
                onPress={() => {
                  setTxnDateTarget("given");
                  setShowTxnDatePicker(true);
                }}
              >
                <TextInput
                  style={styles.modalInput}
                  placeholder="Date"
                  placeholderTextColor={colors.textMuted}
                  value={givenDate.toLocaleDateString("en-IN")}
                  editable={false}
                  pointerEvents="none"
                />
              </TouchableOpacity>

              <TextInput
                style={[styles.modalInput, { height: 80 }]}
                placeholder="Note (optional)"
                placeholderTextColor={colors.textMuted}
                value={givenNote}
                onChangeText={setGivenNote}
                multiline
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowGivenModal(false);
                    setGivenAmount("");
                    setGivenNote("");
                    setGivenDate(new Date());
                  }}
                >
                  <Text style={styles.cancelText}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={handleAddGivenEntryOnly}
                >
                  <Text style={styles.saveText}>Entry</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={() => {
                    // Navigate to bill screen with preset info
                    setShowGivenModal(false);
                    router.push({
                      pathname: "./create-bill",
                      params: {
                        customerId: customerData.id.toString(),
                        presetAmount: givenAmount || "",
                        presetNote: givenNote || "",
                      },
                    });
                  }}
                >
                  <Text style={styles.saveText}>Bill</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* You Received Modal */}
        <Modal visible={showReceivedModal} transparent animationType="slide">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>You Received</Text>

              <TextInput
                style={styles.modalInput}
                placeholder="Amount"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={receivedAmount}
                onChangeText={setReceivedAmount}
              />

              <TouchableOpacity
                onPress={() => {
                  setTxnDateTarget("received"); // ✅ use "received"
                  setShowTxnDatePicker(true);
                }}
              >
                <TextInput
                  style={styles.modalInput}
                  placeholder="Date"
                  placeholderTextColor={colors.textMuted}
                  value={receivedDate.toLocaleDateString("en-IN")} // ✅ use receivedDate
                  editable={false}
                  pointerEvents="none"
                />
              </TouchableOpacity>

              <TextInput
                style={[styles.modalInput, { height: 80 }]}
                placeholder="Note (optional)"
                placeholderTextColor={colors.textMuted}
                value={receivedNote}
                onChangeText={setReceivedNote}
                multiline
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowReceivedModal(false);
                    setReceivedAmount("");
                    setReceivedNote("");
                    setReceivedDate(new Date());
                  }}
                >
                  <Text style={styles.cancelText}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleAddReceived}
                >
                  <Text style={styles.saveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {showDueDateModal && (
          <DateTimePicker
            value={tempDueDate || new Date()}
            mode="date"
            display="calendar"
            onChange={async (event, selectedDate) => {
              // User pressed Cancel
              if (event.type === "dismissed") {
                setShowDueDateModal(false);
                return;
              }

              if (!selectedDate || !user || !customerData.id) {
                setShowDueDateModal(false);
                return;
              }

              // Update local state and DB
              const stored = selectedDate.toLocaleDateString("en-IN");
              setTempDueDate(selectedDate);
              await updateCustomerDueDate(user.id, customerData.id, stored);
              setCustomerData({ ...customerData, due_date: stored });
              appEvents.emit("customerUpdated");

              // Close picker
              setShowDueDateModal(false);
            }}
          />
        )}
        {showTxnDatePicker && (
          <DateTimePicker
            value={txnDateTarget === "given" ? givenDate : receivedDate}
            mode="date"
            display="calendar"
            maximumDate={new Date()} // cannot pick future dates
            onChange={(_, selectedDate) => {
              if (!selectedDate) {
                setShowTxnDatePicker(false);
                return;
              }

              // clamp to today if somehow future
              const today = new Date();
              if (selectedDate > today) selectedDate = today;

              if (txnDateTarget === "given") {
                setGivenDate(selectedDate);
              } else {
                setReceivedDate(selectedDate);
              }

              setShowTxnDatePicker(false);
            }}
          />
        )}
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
  balanceCard: { marginBottom: spacing.sm },
  balanceLabel: { color: colors.textMuted, fontSize: typography.small },
  balanceValue: { marginTop: 4, fontSize: 26, fontWeight: "700" },
  balanceSub: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: typography.small,
  },
  credit: { color: colors.accent },
  debit: { color: colors.danger },
  buttonRow: { flexDirection: "row", gap: 10, marginBottom: spacing.md },
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
  txnBalance: {
    color: colors.accent,
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
    flexWrap: "wrap",
  },
  modalButton: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  cancelButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveButton: { backgroundColor: colors.primary },
  cancelText: { color: colors.textMuted, fontSize: 15 },
  saveText: { color: "white", fontSize: 15, fontWeight: "600" },
  dueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dueDateText: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  dueSetText: {
    color: colors.accent,
    fontWeight: "600",
  },
  dueClearText: {
    color: colors.danger,
    fontWeight: "600",
  },
});
