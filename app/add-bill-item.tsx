import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { colors } from "../constants/theme";
import Screen from "../src/components/Screen";
import { useBill } from "../src/context/BillContext"; // ADD THIS
import { useBusiness } from "../src/context/BusinessContext";
import {
  getInventoryByBusiness,
  InventoryItem,
  TAX_TYPES,
  UNIT_OPTIONS,
} from "../src/database/inventoryRepo";

export default function AddBillItemScreen() {
  const { customerId } = useLocalSearchParams<{ customerId: string }>();
  const router = useRouter();
  const { currentBusiness } = useBusiness();
  const { addDraftItem } = useBill(); // ADD THIS

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
  const [showInventoryList, setShowInventoryList] = useState(false);

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

    addDraftItem(item); // Add to context
    router.back(); // Simply go back
  };

  const selectFromStock = (inv: InventoryItem) => {
    setInventoryId(inv.id);
    setItemName(inv.item_name);
    setQuantity("1");
    setUnit(inv.unit);
    setMrp(String(inv.mrp));
    setRate(String(inv.rate));
    setShowInventoryList(false);
  };

  if (showInventoryList) {
    return (
      <Screen>
        <View style={{ flex: 1, padding: 16, backgroundColor: "white" }}>
          <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 16 }}>
            Select from Stock
          </Text>
          <FlatList
            data={inventory}
            keyExtractor={(it) => it.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => selectFromStock(item)}
                style={{
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: "600" }}>
                  {item.item_name}
                </Text>
                <Text style={{ color: colors.textMuted, marginTop: 4 }}>
                  Qty: {item.quantity} {item.unit} · Rate: ₹{item.rate}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text
                style={{
                  color: colors.textMuted,
                  textAlign: "center",
                  marginTop: 20,
                }}
              >
                No items in stock.
              </Text>
            }
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView style={{ flex: 1, backgroundColor: "white" }}>
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 16 }}>
            Add New Item
          </Text>

          {/* Item name */}
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 6 }}>
              Item Name *
            </Text>
            <TextInput
              placeholder="Enter item name"
              value={itemName}
              onChangeText={setItemName}
              style={{
                borderWidth: 1,
                borderRadius: 8,
                padding: 12,
                borderColor: colors.border,
                backgroundColor: "#f8f9fa",
                fontSize: 16,
              }}
            />
          </View>

          {/* Quantity + Unit */}
          <View style={{ flexDirection: "row", marginBottom: 12, gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontSize: 14, fontWeight: "600", marginBottom: 6 }}
              >
                Quantity *
              </Text>
              <TextInput
                placeholder="Qty"
                keyboardType="numeric"
                value={quantity}
                onChangeText={setQuantity}
                style={{
                  borderWidth: 1,
                  borderRadius: 8,
                  padding: 12,
                  borderColor: colors.border,
                  backgroundColor: "#f8f9fa",
                  fontSize: 16,
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontSize: 14, fontWeight: "600", marginBottom: 6 }}
              >
                Unit
              </Text>
              <TouchableOpacity
                style={{
                  borderWidth: 1,
                  borderRadius: 8,
                  padding: 12,
                  borderColor: colors.border,
                  backgroundColor: "#f8f9fa",
                  justifyContent: "center",
                }}
                onPress={() => {
                  const idx = UNIT_OPTIONS.indexOf(unit);
                  const next = UNIT_OPTIONS[(idx + 1) % UNIT_OPTIONS.length];
                  setUnit(next);
                }}
              >
                <Text style={{ fontSize: 16 }}>{unit}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Rate + MRP */}
          <View style={{ flexDirection: "row", marginBottom: 12, gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontSize: 14, fontWeight: "600", marginBottom: 6 }}
              >
                Rate *
              </Text>
              <TextInput
                placeholder="0"
                keyboardType="numeric"
                value={rate}
                onChangeText={setRate}
                style={{
                  borderWidth: 1,
                  borderRadius: 8,
                  padding: 12,
                  borderColor: colors.border,
                  backgroundColor: "#f8f9fa",
                  fontSize: 16,
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontSize: 14, fontWeight: "600", marginBottom: 6 }}
              >
                MRP
              </Text>
              <TextInput
                placeholder="0"
                keyboardType="numeric"
                value={mrp}
                onChangeText={setMrp}
                style={{
                  borderWidth: 1,
                  borderRadius: 8,
                  padding: 12,
                  borderColor: colors.border,
                  backgroundColor: "#f8f9fa",
                  fontSize: 16,
                }}
              />
            </View>
          </View>

          {/* Tax type */}
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 6 }}>
              Tax Type
            </Text>
            <TouchableOpacity
              style={{
                borderWidth: 1,
                borderRadius: 8,
                padding: 12,
                borderColor: colors.border,
                backgroundColor: "#f8f9fa",
              }}
              onPress={() => {
                const idx = TAX_TYPES.indexOf(taxType);
                const next = TAX_TYPES[(idx + 1) % TAX_TYPES.length];
                setTaxType(next);
              }}
            >
              <Text style={{ fontSize: 16 }}>{taxType}</Text>
            </TouchableOpacity>
          </View>

          {/* HSN */}
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 6 }}>
              HSN Code (optional)
            </Text>
            <TextInput
              placeholder="Enter HSN code"
              value={hsn}
              onChangeText={setHsn}
              style={{
                borderWidth: 1,
                borderRadius: 8,
                padding: 12,
                borderColor: colors.border,
                backgroundColor: "#f8f9fa",
                fontSize: 16,
              }}
            />
          </View>

          {/* Notes */}
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 6 }}>
              Notes (optional)
            </Text>
            <TextInput
              placeholder="Add any notes..."
              value={note}
              onChangeText={setNote}
              multiline
              style={{
                borderWidth: 1,
                borderRadius: 8,
                padding: 12,
                borderColor: colors.border,
                backgroundColor: "#f8f9fa",
                minHeight: 80,
                fontSize: 16,
                textAlignVertical: "top",
              }}
            />
          </View>

          {/* Total */}
          <View
            style={{
              backgroundColor: "#e3f2fd",
              padding: 12,
              borderRadius: 8,
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 14, color: colors.textMuted }}>
              Item Total
            </Text>
            <Text style={{ fontSize: 24, fontWeight: "700", marginTop: 4 }}>
              ₹{total.toFixed(2)}
            </Text>
          </View>

          {/* Select from stock */}
          <TouchableOpacity
            onPress={() => setShowInventoryList(true)}
            style={{ marginBottom: 20 }}
          >
            <Text
              style={{
                color: colors.accent,
                fontSize: 16,
                fontWeight: "600",
              }}
            >
              Select from stock
            </Text>
          </TouchableOpacity>

          {/* Done button */}
          <TouchableOpacity
            onPress={finish}
            style={{
              backgroundColor: colors.primary,
              paddingVertical: 14,
              borderRadius: 24,
              marginBottom: 20,
            }}
          >
            <Text
              style={{
                color: "white",
                textAlign: "center",
                fontWeight: "600",
                fontSize: 16,
              }}
            >
              Done
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
}
