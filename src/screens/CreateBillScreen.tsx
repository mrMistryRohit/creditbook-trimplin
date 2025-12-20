import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";
import PrimaryButton from "../components/PrimaryButton";
import Screen from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { useBill } from "../context/BillContext";
import { useBusiness } from "../context/BusinessContext";
import {
  createBillWithTransaction,
  getNextBillNumber,
} from "../database/billRepo";
import { getCustomerById } from "../database/customerRepo";

type ItemForm = {
  id: string;
  inventoryId?: number;
  itemName: string;
  quantity: number;
  unit: string;
  mrp: number;
  rate: number;
};

export default function CreateBillScreen() {
  const { customerId } = useLocalSearchParams<{ customerId: string }>();
  const { user } = useAuth();
  const { currentBusiness } = useBusiness();
  const { draftItems, removeDraftItem, clearDraftItems } = useBill();
  const router = useRouter();

  const [customerName, setCustomerName] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [billDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemForm[]>([]);

  // Load customer name and generate bill number
  useEffect(() => {
    const load = async () => {
      if (!customerId || !currentBusiness) return;

      const customer = await getCustomerById(Number(customerId));
      if (customer) setCustomerName(customer.name);

      const nextBillNo = await getNextBillNumber(currentBusiness.id);
      setBillNumber(nextBillNo);
    };
    load();
  }, [customerId, currentBusiness]);

  // Sync draft items from context
  useEffect(() => {
    setItems(
      draftItems.map((item, index) => ({
        id: `${Date.now()}-${index}`,
        inventoryId: item.inventoryId,
        itemName: item.itemName,
        quantity: item.quantity,
        unit: item.unit,
        mrp: item.mrp,
        rate: item.rate,
      }))
    );
  }, [draftItems]);

  const subtotal = items.reduce(
    (s, it) => s + (it.quantity || 0) * (it.rate || 0),
    0
  );

  const removeItem = (id: string) => {
    // Find the index of the item
    const index = items.findIndex((it) => it.id === id);
    if (index !== -1) {
      // Remove from local state
      setItems((prev) => prev.filter((it) => it.id !== id));
      // Remove from context
      removeDraftItem(index);
    }
  };

  const handleSave = async () => {
    if (!user || !currentBusiness || !customerId) {
      Alert.alert("Error", "Missing user, business or customer.");
      return;
    }
    if (!billNumber.trim()) {
      Alert.alert("Error", "Bill number is required.");
      return;
    }
    if (items.length === 0) {
      Alert.alert("Error", "Add at least one item.");
      return;
    }

    try {
      const billId = await createBillWithTransaction({
        userId: user.id,
        businessId: currentBusiness.id,
        customerId: Number(customerId),
        billNumber: billNumber.trim(),
        billDate,
        notes,
        items: items.map((it) => ({
          inventoryId: it.inventoryId,
          itemName: it.itemName,
          quantity: it.quantity,
          unit: it.unit,
          mrp: it.mrp,
          rate: it.rate,
        })),
      });

      clearDraftItems();

      Alert.alert("Bill saved", "Transaction logged in ledger.", [
        {
          text: "Preview",
          onPress: () =>
            router.push({
              pathname: "/bill-detail",
              params: { billId: billId.toString() },
            }),
        },
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to save bill.");
    }
  };

  const renderItem = ({ item }: { item: ItemForm }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemRow}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.itemName}</Text>
          <Text style={styles.itemDetails}>
            {item.quantity} {item.unit} × ₹{item.rate.toFixed(2)}
          </Text>
        </View>
        <View style={styles.itemRight}>
          <Text style={styles.itemTotal}>
            ₹{(item.quantity * item.rate).toFixed(2)}
          </Text>
          <TouchableOpacity
            onPress={() => removeItem(item.id)}
            style={styles.removeButton}
          >
            <Text style={styles.removeText}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <Screen>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.customerName}>
            {customerName || "Customer"}
          </Text>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerLabel}>Bill Number</Text>
              <TextInput
                value={billNumber}
                onChangeText={setBillNumber}
                style={styles.billNumberInput}
                placeholderTextColor="rgba(255,255,255,0.5)"
              />
            </View>
            <View>
              <Text style={styles.headerLabel}>Bill Date</Text>
              <Text style={styles.billDate}>{billDate}</Text>
            </View>
          </View>
        </View>

        {/* Items List */}
        <View style={styles.content}>
          <FlatList
            data={items}
            keyExtractor={(it) => it.id}
            renderItem={renderItem}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  Add item to bill, preview and share with customer.
                </Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
          />

          {/* Add Item Button */}
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/add-bill-item",
                params: { customerId: customerId?.toString() || "" },
              })
            }
            style={styles.addItemButton}
          >
            <Text style={styles.addItemText}>+ Add Item</Text>
          </TouchableOpacity>

          {/* Notes */}
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Notes (optional)</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder="Add any notes here..."
              placeholderTextColor={colors.textMuted}
              style={styles.notesInput}
            />
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₹{subtotal.toFixed(2)}</Text>
          </View>
          <PrimaryButton label="Save Bill" onPress={handleSave} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    paddingTop: spacing.sm,
  },
  customerName: {
    fontSize: 24,
    fontWeight: "700",
    color: "white",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  headerLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
  },
  billNumberInput: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 2,
    padding: 0,
  },
  billDate: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: spacing.md,
    paddingBottom: 0,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: "center",
  },
  itemCard: {
    backgroundColor: colors.inputBackground,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  itemDetails: {
    color: colors.textMuted,
    marginTop: 4,
    fontSize: typography.small,
  },
  itemRight: {
    alignItems: "flex-end",
  },
  itemTotal: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  removeButton: {
    marginTop: spacing.sm,
  },
  removeText: {
    color: colors.danger,
    fontSize: 12,
  },
  addItemButton: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: radius.md,
    borderStyle: "dashed",
    padding: spacing.md,
    alignItems: "center",
    marginVertical: spacing.sm,
  },
  addItemText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "600",
  },
  notesSection: {
    marginBottom: spacing.sm,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    color: colors.text,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 10,
    minHeight: 70,
    borderColor: colors.border,
    backgroundColor: colors.inputBackground,
    color: colors.text,
    textAlignVertical: "top",
  },
  footer: {
    borderTopWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    paddingBottom: 40,
    backgroundColor: colors.card,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  totalLabel: {
    fontSize: 16,
    color: colors.textMuted,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
  },
});
