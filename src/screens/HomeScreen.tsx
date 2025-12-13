import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";
import AppHeader from "../components/AppHeader";
import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";
import Screen from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import {
  addCustomer,
  Customer,
  getCustomersByUser,
} from "../database/customerRepo";
import { appEvents } from "../utils/events";

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const [addVisible, setAddVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const loadCustomers = async () => {
    if (!user) return;
    setLoading(true);
    const list = await getCustomersByUser(user.id);
    setCustomers(list);
    setLoading(false);
  };

  // Load once and subscribe to "customerUpdated" events
  useEffect(() => {
    loadCustomers();

    const handler = () => {
      loadCustomers();
    };

    appEvents.on("customerUpdated", handler);
    return () => {
      appEvents.off("customerUpdated", handler);
    };
  }, [user?.id]);

  const totalDue = customers
    .filter((c) => c.balance > 0)
    .reduce((sum, c) => sum + c.balance, 0);

  const totalAdvance = customers
    .filter((c) => c.balance < 0)
    .reduce((sum, c) => sum + c.balance, 0);

  const handleCustomerPress = (customer: Customer) => {
    router.push({
      pathname: "/(tabs)/ledger",
      params: { customer: JSON.stringify(customer) },
    });
  };

  const handleAddCustomer = async () => {
    if (!user || !newName.trim()) return;
    await addCustomer(user.id, newName.trim(), newPhone.trim());
    setNewName("");
    setNewPhone("");
    setAddVisible(false);
    await loadCustomers();
  };

  const renderCustomer = ({ item }: { item: Customer }) => {
    const isDue = item.balance > 0;
    return (
      <TouchableOpacity
        style={styles.customerRow}
        onPress={() => handleCustomerPress(item)}
        activeOpacity={0.7}
      >
        <View>
          <Text style={styles.customerName}>{item.name}</Text>
          <Text style={styles.customerSubtitle}>
            {item.last_activity || "No activity"}
          </Text>
        </View>
        <View style={styles.balanceContainer}>
          <Text style={[styles.balance, isDue ? styles.due : styles.advance]}>
            ₹ {Math.abs(item.balance).toLocaleString("en-IN")}
          </Text>
          <Text style={styles.balanceLabel}>
            {isDue ? "You will get" : "You will give"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Screen>
      <AppHeader title="Dashboard" subtitle="Simple digital udhar bahi khata" />

      <Card style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.summaryLabel}>Total you will get</Text>
            <Text style={[styles.summaryValue, styles.due]}>
              ₹ {totalDue.toLocaleString("en-IN")}
            </Text>
          </View>
          <View>
            <Text style={styles.summaryLabel}>Total you will give</Text>
            <Text style={[styles.summaryValue, styles.advance]}>
              ₹ {Math.abs(totalAdvance).toLocaleString("en-IN")}
            </Text>
          </View>
        </View>
        <PrimaryButton
          label="+ Add customer"
          onPress={() => setAddVisible(true)}
          style={styles.addCustomerButton}
        />
      </Card>

      <Text style={styles.sectionTitle}>
        {loading ? "Loading customers..." : "Customers"}
      </Text>

      <FlatList
        data={customers}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderCustomer}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.emptyText}>
              No customers yet. Tap "+ Add customer" to create one.
            </Text>
          ) : null
        }
      />

      {/* Add Customer Modal */}
      <Modal
        visible={addVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Customer</Text>
            <TextInput
              style={styles.input}
              placeholder="Customer name"
              placeholderTextColor={colors.textMuted}
              value={newName}
              onChangeText={setNewName}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone (optional)"
              placeholderTextColor={colors.textMuted}
              value={newPhone}
              onChangeText={setNewPhone}
              keyboardType="phone-pad"
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
                onPress={handleAddCustomer}
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
  summaryCard: { marginTop: spacing.md, marginBottom: spacing.lg },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryLabel: { color: colors.textMuted, fontSize: typography.small },
  summaryValue: {
    marginTop: 4,
    fontSize: typography.subheading,
    fontWeight: "700",
  },
  due: { color: colors.accent },
  advance: { color: colors.danger },
  addCustomerButton: { marginTop: spacing.md },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.subheading,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  customerRow: {
    backgroundColor: colors.inputBackground,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  customerName: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "600",
  },
  customerSubtitle: {
    color: colors.textMuted,
    fontSize: typography.small,
    marginTop: 2,
  },
  balanceContainer: { alignItems: "flex-end" },
  balance: { fontSize: typography.body, fontWeight: "700" },
  balanceLabel: { color: colors.textMuted, fontSize: typography.small },
  separator: { height: 10 },
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.small,
    marginTop: spacing.sm,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "#00000080",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    color: colors.text,
    fontSize: typography.subheading,
    fontWeight: "600",
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.inputBackground,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.text,
    fontSize: typography.body,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: spacing.md,
    gap: 10,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.md,
  },
  cancelButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  cancelText: { color: colors.textMuted, fontSize: typography.body },
  saveText: { color: "white", fontSize: typography.body, fontWeight: "600" },
});
