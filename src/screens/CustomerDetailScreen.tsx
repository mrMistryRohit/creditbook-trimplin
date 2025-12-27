// src/screens/CustomerDetailScreen.tsx
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  BackHandler,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { colors, spacing, typography } from "../../constants/theme";
import Card from "../components/Card";
import Screen from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { useBusiness } from "../context/BusinessContext";
import {
  Customer,
  archiveCustomer,
  deleteCustomer,
  unarchiveCustomer,
  updateCustomerDueDate,
  updateCustomerFull,
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
  email?: string | null;
  address?: string | null;
  photo_uri?: string | null;
  balance: number;
  last_activity?: string | null;
  archived?: number;
  due_date?: string | null;
  sms_enabled?: number;
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
        sms_enabled: 1,
      };

  const [customerData, setCustomerData] = useState<Customer>(
    customer as Customer
  );
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // View Profile Modal
  const [viewProfileVisible, setViewProfileVisible] = useState(false);

  // Edit customer modal
  const [editCustomerVisible, setEditCustomerVisible] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editPhotoUri, setEditPhotoUri] = useState<string | null>(null);
  const [editSmsEnabled, setEditSmsEnabled] = useState(true);

  // You Gave modal
  const [showGivenModal, setShowGivenModal] = useState(false);
  const [givenAmount, setGivenAmount] = useState("");
  const [givenNote, setGivenNote] = useState("");
  const [givenDate, setGivenDate] = useState(new Date());

  // You Received modal
  const [showReceivedModal, setShowReceivedModal] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState("");
  const [receivedNote, setReceivedNote] = useState("");
  const [receivedDate, setReceivedDate] = useState(new Date());

  // Due date
  const [showDueDateModal, setShowDueDateModal] = useState(false);
  const [tempDueDate, setTempDueDate] = useState<Date | null>(null);

  const [showTxnDatePicker, setShowTxnDatePicker] = useState(false);
  const [txnDateTarget, setTxnDateTarget] = useState<"given" | "received">(
    "given"
  );

  const loadTransactions = useCallback(async () => {
    if (!user || !customer.id) return;
    const list = await getTransactionsForCustomer(user.id, customer.id);
    setTransactions(list ?? []);
  }, [user, customer.id]);

  useEffect(() => {
    loadTransactions();
  }, [user, customer.id, loadTransactions]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        router.replace("/(tabs)/ledger");
        return true;
      }
    );
    return () => backHandler.remove();
  }, [router]);

  const balance = useMemo(
    () =>
      transactions.reduce((bal, t) => {
        return t.type === "credit" ? bal + t.amount : bal - t.amount;
      }, 0),
    [transactions]
  );

  const isDue = balance > 0;

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

  // Image Picker for Customer Photo
  const pickCustomerImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "Please allow access to your photos");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setEditPhotoUri(result.assets[0].uri);
    }
  };

  const removeCustomerImage = () => {
    setEditPhotoUri(null);
  };

  const handleViewProfile = () => {
    setViewProfileVisible(true);
  };

  const handleEditCustomer = () => {
    setEditName(customerData.name);
    setEditPhone(customerData.phone || "");
    setEditEmail(customerData.email || "");
    setEditAddress(customerData.address || "");
    setEditPhotoUri(customerData.photo_uri || null);
    setEditSmsEnabled(customerData.sms_enabled === 1);
    setEditCustomerVisible(true);
  };

  const handleSaveCustomer = async () => {
    if (!user || !customerData.id) return;
    if (!editName.trim()) {
      Alert.alert("Error", "Customer name is required");
      return;
    }

    await updateCustomerFull(user.id, customerData.id, {
      name: editName.trim(),
      phone: editPhone.trim(),
      email: editEmail.trim(),
      address: editAddress.trim(),
      photo_uri: editPhotoUri || undefined, // ✅ FIXED

      sms_enabled: editSmsEnabled ? 1 : 0,
    });

    setCustomerData({
      ...customerData,
      name: editName.trim(),
      phone: editPhone.trim(),
      email: editEmail.trim(),
      address: editAddress.trim(),
      photo_uri: editPhotoUri,
      sms_enabled: editSmsEnabled ? 1 : 0,
    });

    appEvents.emit("customerUpdated");
    setEditCustomerVisible(false);
    Alert.alert("Success", "Customer details updated successfully");
  };

  const handleDeleteCustomer = () => {
    if (!transactions.length) {
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
      <Card style={styles.txnCard}>
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

  const handleClearDueDate = async () => {
    if (!user || !customerData.id) return;
    await updateCustomerDueDate(user.id, customerData.id, null);
    setCustomerData({ ...customerData, due_date: null });
    appEvents.emit("customerUpdated");
  };

  const parseEnInDate = (value: string | null | undefined): Date => {
    if (!value) return new Date();
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
            <TouchableOpacity onPress={handleViewProfile}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                {customerData.photo_uri && (
                  <Image
                    source={{ uri: customerData.photo_uri }}
                    style={styles.customerPhotoSmall}
                  />
                )}
                <Text style={styles.customerName}>{customerData.name}</Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.customerTag}>Customer ledger</Text>
          </View>
          <TouchableOpacity
            onPress={handleEditCustomer}
            style={styles.iconButton}
          >
            <Ionicons name="pencil" size={20} color={colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleArchiveCustomer}
            style={styles.archiveButton}
          >
            <Ionicons
              name={customerData.archived ? "archive" : "archive-outline"}
              size={20}
              color={colors.textMuted}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDeleteCustomer}
            style={styles.iconButton}
          >
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
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

        {/* Due date row */}
        <Card style={styles.balanceCard}>
          <View style={styles.dueRow}>
            <View>
              <Text style={styles.balanceLabel}>Due Date</Text>
              <Text style={styles.dueDateText}>
                {customerData.due_date || "No due date set"}
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
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
          </View>
        </Card>

        {/* Action buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            onPress={() => setShowGivenModal(true)}
            style={styles.gaveButton}
          >
            <Text style={styles.buttonText}>You Gave</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowReceivedModal(true)}
            style={styles.receivedButton}
          >
            <Text style={styles.buttonText}>You Received</Text>
          </TouchableOpacity>
        </View>

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

        {/* View Customer Profile Modal */}
        <Modal
          visible={viewProfileVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setViewProfileVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>Customer Profile</Text>

                {customerData.photo_uri && (
                  <Image
                    source={{ uri: customerData.photo_uri }}
                    style={styles.customerPhotoLarge}
                  />
                )}

                <View style={styles.profileDetailRow}>
                  <Ionicons name="person" size={20} color={colors.accent} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.profileLabel}>Name</Text>
                    <Text style={styles.profileValue}>{customerData.name}</Text>
                  </View>
                </View>

                {customerData.phone && (
                  <View style={styles.profileDetailRow}>
                    <Ionicons name="call" size={20} color={colors.accent} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.profileLabel}>Phone</Text>
                      <Text style={styles.profileValue}>
                        {customerData.phone}
                      </Text>
                    </View>
                  </View>
                )}

                {customerData.email && (
                  <View style={styles.profileDetailRow}>
                    <Ionicons name="mail" size={20} color={colors.accent} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.profileLabel}>Email</Text>
                      <Text style={styles.profileValue}>
                        {customerData.email}
                      </Text>
                    </View>
                  </View>
                )}

                {customerData.address && (
                  <View style={styles.profileDetailRow}>
                    <Ionicons name="location" size={20} color={colors.accent} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.profileLabel}>Address</Text>
                      <Text style={styles.profileValue}>
                        {customerData.address}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.profileDetailRow}>
                  <Ionicons
                    name="chatbubbles"
                    size={20}
                    color={colors.accent}
                  />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.profileLabel}>SMS Notifications</Text>
                    <Text style={styles.profileValue}>
                      {customerData.sms_enabled ? "Enabled" : "Disabled"}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setViewProfileVisible(false)}
                  >
                    <Text style={styles.cancelText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Edit Customer Modal */}
        <Modal
          visible={editCustomerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setEditCustomerVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>Edit Customer</Text>

                {/* Photo Picker */}
                <TouchableOpacity
                  style={styles.imagePickerButton}
                  onPress={pickCustomerImage}
                >
                  {editPhotoUri ? (
                    <View>
                      <Image
                        source={{ uri: editPhotoUri }}
                        style={styles.pickedImage}
                      />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={removeCustomerImage}
                      >
                        <Ionicons
                          name="close-circle"
                          size={24}
                          color={colors.danger}
                        />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.imagePickerPlaceholder}>
                      <Ionicons
                        name="camera"
                        size={32}
                        color={colors.textMuted}
                      />
                      <Text style={styles.imagePickerText}>Add Photo</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TextInput
                  style={styles.modalInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Customer Name *"
                  placeholderTextColor={colors.textMuted}
                />
                <TextInput
                  style={styles.modalInput}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="Phone Number"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                />
                <TextInput
                  style={styles.modalInput}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  placeholder="Email Address"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TextInput
                  style={[styles.modalInput, styles.textArea]}
                  value={editAddress}
                  onChangeText={setEditAddress}
                  placeholder="Address"
                  placeholderTextColor={colors.textMuted}
                  multiline
                />

                {/* <View style={styles.smsSettingRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.smsLabel}>SMS Notifications</Text>
                    <Text style={styles.smsSubLabel}>
                      Send transaction updates via SMS
                    </Text>
                  </View>
                  <Switch
                    value={editSmsEnabled}
                    onValueChange={setEditSmsEnabled}
                    trackColor={{ false: colors.border, true: colors.accent }}
                    thumbColor={
                      editSmsEnabled ? colors.primary : colors.textMuted
                    }
                  />
                </View> */}

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
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* You Gave Modal */}
        <Modal
          visible={showGivenModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowGivenModal(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Send</Text>
              <TextInput
                style={styles.modalInput}
                value={givenAmount}
                onChangeText={setGivenAmount}
                placeholder="Amount"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.modalInput}
                value={givenNote}
                onChangeText={setGivenNote}
                placeholder="Note (optional)"
                placeholderTextColor={colors.textMuted}
              />
              <TouchableOpacity
                style={styles.modalInput}
                onPress={() => {
                  setTxnDateTarget("given");
                  setShowTxnDatePicker(true);
                }}
              >
                <Text style={{ color: colors.text }}>
                  {givenDate.toLocaleDateString("en-IN")}
                </Text>
              </TouchableOpacity>

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
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleAddGivenEntryOnly}
                >
                  <Text style={styles.saveText}>Entry</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={() => {
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
        <Modal
          visible={showReceivedModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowReceivedModal(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>You Received</Text>
              <TextInput
                style={styles.modalInput}
                value={receivedAmount}
                onChangeText={setReceivedAmount}
                placeholder="Amount"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.modalInput}
                value={receivedNote}
                onChangeText={setReceivedNote}
                placeholder="Note (optional)"
                placeholderTextColor={colors.textMuted}
              />
              <TouchableOpacity
                style={styles.modalInput}
                onPress={() => {
                  setTxnDateTarget("received");
                  setShowTxnDatePicker(true);
                }}
              >
                <Text style={{ color: colors.text }}>
                  {receivedDate.toLocaleDateString("en-IN")}
                </Text>
              </TouchableOpacity>

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

        {/* Due Date Picker */}
        {showDueDateModal && (
          <DateTimePicker
            value={tempDueDate || new Date()}
            mode="date"
            display="default"
            onChange={async (event, selectedDate) => {
              if (event.type === "dismissed") {
                setShowDueDateModal(false);
                return;
              }

              if (!selectedDate || !user || !customerData.id) {
                setShowDueDateModal(false);
                return;
              }

              const stored = selectedDate.toLocaleDateString("en-IN");
              setTempDueDate(selectedDate);
              await updateCustomerDueDate(user.id, customerData.id, stored);
              setCustomerData({ ...customerData, due_date: stored });
              appEvents.emit("customerUpdated");
              setShowDueDateModal(false);
            }}
          />
        )}

        {/* Transaction Date Picker */}
        {showTxnDatePicker && (
          <DateTimePicker
            value={txnDateTarget === "given" ? givenDate : receivedDate}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={(event, selectedDate) => {
              if (!selectedDate) {
                setShowTxnDatePicker(false);
                return;
              }

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
  backButton: { marginRight: 12, padding: 4 },
  iconButton: { padding: 4, marginLeft: 8 },
  archiveButton: { padding: 4, marginLeft: 8 },
  headerText: { flex: 1 },
  customerName: { color: colors.text, fontSize: 28, fontWeight: "700" },
  customerTag: {
    color: colors.textMuted,
    fontSize: typography.small,
    marginTop: 2,
  },
  customerPhotoSmall: { width: 40, height: 40, borderRadius: 20 },
  customerPhotoLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: "center",
    marginBottom: 16,
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
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: spacing.md,
  },

  gaveButton: {
    flex: 1,
    backgroundColor: colors.accent, // Green color
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  receivedButton: {
    flex: 1,
    backgroundColor: colors.danger, // Red color
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },

  // Remove or update these old styles if they exist:
  smallButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
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
    maxHeight: "80%",
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
  textArea: { height: 80, textAlignVertical: "top" },
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
  dueSetText: { color: colors.accent, fontWeight: "600" },
  dueClearText: { color: colors.danger, fontWeight: "600" },
  imagePickerButton: { alignItems: "center", marginBottom: 16 },
  imagePickerPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.inputBackground,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: "dashed",
  },
  imagePickerText: { color: colors.textMuted, fontSize: 12, marginTop: 8 },
  pickedImage: { width: 100, height: 100, borderRadius: 50 },
  removeImageButton: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: colors.card,
    borderRadius: 12,
  },
  smsSettingRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  smsLabel: { color: colors.text, fontSize: 15, fontWeight: "600" },
  smsSubLabel: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  profileDetailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  profileLabel: { color: colors.textMuted, fontSize: 12, marginBottom: 4 },
  profileValue: { color: colors.text, fontSize: 15, fontWeight: "500" },
});
