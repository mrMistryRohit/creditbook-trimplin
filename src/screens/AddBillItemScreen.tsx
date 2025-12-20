import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { colors, radius, spacing } from "../../constants/theme";
import Screen from "../components/Screen";
import { useBill } from "../context/BillContext";
import { useBusiness } from "../context/BusinessContext";
import {
  getInventoryByBusiness,
  InventoryItem,
  TAX_TYPES,
  UNIT_OPTIONS,
} from "../database/inventoryRepo";

export default function AddBillItemScreen() {
  const { customerId } = useLocalSearchParams<{ customerId: string }>();
  const router = useRouter();
  const { currentBusiness } = useBusiness();
  const { addDraftItem } = useBill();

  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("Nos");
  const [mrp, setMrp] = useState("0");
  const [rate, setRate] = useState("0");
  const [taxType, setTaxType] = useState("No Tax");
  const [hsn, setHsn] = useState("");
  const [note, setNote] = useState("");
  const [inventoryId, setInventoryId] = useState<number | undefined>();

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  
  // Dropdown states
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [showTaxDropdown, setShowTaxDropdown] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!currentBusiness) return;
      const list = await getInventoryByBusiness(currentBusiness.id);
      setInventory(list);
    };
    load();
  }, [currentBusiness]);

  const total = (Number(quantity) || 0) * (Number(rate) || 0);

  const buildItem = () => {
    const q = Number(quantity) || 0;
    const r = Number(rate) || 0;
    const m = Number(mrp) || 0;

    if (!itemName.trim() || q <= 0 || r < 0) {
      Alert.alert("Validation", "Please enter valid name, quantity and rate.");
      return null;
    }

    return {
      inventoryId,
      itemName: itemName.trim(),
      quantity: q,
      unit,
      mrp: m,
      rate: r,
      taxType,
      hsn: hsn.trim() || undefined,
      note: note.trim() || undefined,
    };
  };

  const finish = () => {
    const item = buildItem();
    if (!item) return;

    addDraftItem(item);
    router.back();
  };

  const selectFromStock = (inv: InventoryItem) => {
    setInventoryId(inv.id);
    setItemName(inv.item_name);
    setQuantity("1");
    setUnit(inv.unit);
    setMrp(String(inv.mrp));
    setRate(String(inv.rate));
    setTaxType(inv.tax_type);
    setShowItemDropdown(false);
  };

  // Quantity handlers
  const incrementQuantity = () => {
    const current = Number(quantity) || 0;
    setQuantity(String(current + 1));
  };

  const decrementQuantity = () => {
    const current = Number(quantity) || 0;
    if (current > 1) {
      setQuantity(String(current - 1));
    }
  };

  return (
    <Screen>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.pageTitle}>Add New Item</Text>

          {/* Item Name with Dropdown */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Item Name *</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowItemDropdown(true)}
            >
              <Text
                style={[
                  styles.dropdownText,
                  !itemName && styles.placeholderText,
                ]}
              >
                {itemName || "Select or enter item name"}
              </Text>
              <Ionicons
                name="chevron-down"
                size={20}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          {/* Quantity with +/- buttons */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Quantity *</Text>
              <View style={styles.quantityContainer}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={decrementQuantity}
                >
                  <Ionicons name="remove" size={20} color={colors.primary} />
                </TouchableOpacity>
                <TextInput
                  placeholder="0"
                  keyboardType="numeric"
                  value={quantity}
                  onChangeText={setQuantity}
                  style={styles.quantityInput}
                  placeholderTextColor={colors.textMuted}
                />
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={incrementQuantity}
                >
                  <Ionicons name="add" size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Unit Dropdown */}
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Unit</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowUnitDropdown(true)}
              >
                <Text style={styles.dropdownText}>{unit}</Text>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Rate + MRP */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Rate *</Text>
              <TextInput
                placeholder="0"
                keyboardType="numeric"
                value={rate}
                onChangeText={setRate}
                style={styles.input}
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>MRP</Text>
              <TextInput
                placeholder="0"
                keyboardType="numeric"
                value={mrp}
                onChangeText={setMrp}
                style={styles.input}
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          {/* Tax Type Dropdown */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tax Type</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowTaxDropdown(true)}
            >
              <Text style={styles.dropdownText}>{taxType}</Text>
              <Ionicons
                name="chevron-down"
                size={20}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          {/* HSN */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>HSN Code (optional)</Text>
            <TextInput
              placeholder="Enter HSN code"
              value={hsn}
              onChangeText={setHsn}
              style={styles.input}
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {/* Notes */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              placeholder="Add any notes..."
              value={note}
              onChangeText={setNote}
              multiline
              style={[styles.input, styles.textArea]}
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {/* Total */}
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Item Total</Text>
            <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
          </View>

          {/* Done button */}
          <TouchableOpacity onPress={finish} style={styles.doneButton}>
            <Text style={styles.doneButtonText}>Add Item</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Item Dropdown Modal */}
      <Modal
        visible={showItemDropdown}
        transparent
        animationType="slide"
        onRequestClose={() => setShowItemDropdown(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Item from Stock</Text>
              <TouchableOpacity onPress={() => setShowItemDropdown(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {inventory.length === 0 ? (
                <Text style={styles.emptyText}>No items in stock</Text>
              ) : (
                inventory.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.modalItem}
                    onPress={() => selectFromStock(item)}
                  >
                    <View style={styles.modalItemContent}>
                      <Text style={styles.modalItemName}>{item.item_name}</Text>
                      <Text style={styles.modalItemDetails}>
                        Qty: {item.quantity} {item.unit} · Rate: ₹{item.rate}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Unit Dropdown Modal */}
      <Modal
        visible={showUnitDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUnitDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowUnitDropdown(false)}
        >
          <View style={styles.pickerModal}>
            <Text style={styles.pickerTitle}>Select Unit</Text>
            <ScrollView style={styles.pickerList}>
              {UNIT_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.pickerItem,
                    unit === option && styles.pickerItemActive,
                  ]}
                  onPress={() => {
                    setUnit(option);
                    setShowUnitDropdown(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      unit === option && styles.pickerItemTextActive,
                    ]}
                  >
                    {option}
                  </Text>
                  {unit === option && (
                    <Ionicons name="checkmark" size={20} color={colors.accent} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Tax Type Dropdown Modal */}
      <Modal
        visible={showTaxDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTaxDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowTaxDropdown(false)}
        >
          <View style={styles.pickerModal}>
            <Text style={styles.pickerTitle}>Select Tax Type</Text>
            <ScrollView style={styles.pickerList}>
              {TAX_TYPES.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.pickerItem,
                    taxType === option && styles.pickerItemActive,
                  ]}
                  onPress={() => {
                    setTaxType(option);
                    setShowTaxDropdown(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      taxType === option && styles.pickerItemTextActive,
                    ]}
                  >
                    {option}
                  </Text>
                  {taxType === option && (
                    <Ionicons name="checkmark" size={20} color={colors.accent} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 12,
    borderColor: colors.border,
    fontSize: 16,
    color: colors.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: spacing.md,
  },
  dropdownButton: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 12,
    borderColor: colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownText: {
    fontSize: 16,
    color: colors.text,
  },
  placeholderText: {
    color: colors.textMuted,
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderRadius: radius.md,
    borderColor: colors.border,
    overflow: "hidden",
  },
  quantityButton: {
    padding: 12,
    backgroundColor: colors.card,
    borderColor: colors.border,
  },
  quantityInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    textAlign: "center",
    backgroundColor: colors.inputBackground,
  },
  totalCard: {
    backgroundColor: colors.accent + "20",
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.accent + "40",
  },
  totalLabel: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.accent,
  },
  doneButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.lg,
    alignItems: "center",
    marginBottom: 40,
  },
  doneButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  modalList: {
    maxHeight: 400,
  },
  modalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalItemContent: {
    flex: 1,
  },
  modalItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  modalItemDetails: {
    fontSize: 13,
    color: colors.textMuted,
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: "center",
    padding: spacing.lg,
    fontSize: 14,
  },
  pickerModal: {
    backgroundColor: colors.card,
    borderRadius: 16,
    marginHorizontal: 24,
    marginVertical: "auto",
    maxHeight: "60%",
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerList: {
    maxHeight: 300,
  },
  pickerItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerItemActive: {
    backgroundColor: colors.accent + "20",
  },
  pickerItemText: {
    fontSize: 16,
    color: colors.text,
  },
  pickerItemTextActive: {
    fontWeight: "600",
    color: colors.accent,
  },
});
