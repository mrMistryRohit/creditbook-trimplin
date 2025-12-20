import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { colors } from "../constants/theme";
import PrimaryButton from "../src/components/PrimaryButton";
import Screen from "../src/components/Screen";
import { useAuth } from "../src/context/AuthContext";
import { useBill } from "../src/context/BillContext"; // ADD THIS
import { useBusiness } from "../src/context/BusinessContext";
import { createBillWithTransaction } from "../src/database/billRepo";
import { getCustomerById } from "../src/database/customerRepo";

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
  const { customerId } = useLocalSearchParams<{
    customerId: string;
  }>();
  const { user } = useAuth();
  const { currentBusiness } = useBusiness();
  const { draftItems, clearDraftItems } = useBill(); // ADD THIS
  const router = useRouter();

  const [customerName, setCustomerName] = useState("");
  const [billNumber, setBillNumber] = useState("BILL-1");
  const [billDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemForm[]>([]);

  // Load customer name
  useEffect(() => {
    const load = async () => {
      if (!customerId) return;
      const customer = await getCustomerById(Number(customerId));
      if (customer) setCustomerName(customer.name);
    };
    load();
  }, [customerId]);

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
    setItems((prev) => prev.filter((it) => it.id !== id));
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

      clearDraftItems(); // Clear draft after saving

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

  return (
    <Screen>
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View
          style={{
            backgroundColor: colors.primary,
            padding: 16,
            paddingTop: 8,
          }}
        >
          <Text style={{ fontSize: 24, fontWeight: "700", color: "white" }}>
            {customerName || "Customer"}
          </Text>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 12,
            }}
          >
            <View>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>
                Bill Number
              </Text>
              <TextInput
                value={billNumber}
                onChangeText={setBillNumber}
                style={{
                  color: "white",
                  fontSize: 16,
                  fontWeight: "600",
                  marginTop: 2,
                }}
              />
            </View>
            <View>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>
                Bill Date
              </Text>
              <Text
                style={{
                  color: "white",
                  fontSize: 16,
                  fontWeight: "600",
                  marginTop: 2,
                }}
              >
                {billDate}
              </Text>
            </View>
          </View>
        </View>

        {/* Items section */}
        <View style={{ flex: 1, padding: 16 }}>
          <FlatList
            data={items}
            keyExtractor={(it) => it.id}
            ListEmptyComponent={
              <View
                style={{
                  alignItems: "center",
                  paddingVertical: 40,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    color: colors.textMuted,
                    textAlign: "center",
                  }}
                >
                  Add item to bill, preview and share with customer.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View
                style={{
                  backgroundColor: "#f8f9fa",
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: "600" }}>
                      {item.itemName}
                    </Text>
                    <Text style={{ color: colors.textMuted, marginTop: 4 }}>
                      {item.quantity} {item.unit} × ₹{item.rate.toFixed(2)}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontSize: 18, fontWeight: "700" }}>
                      ₹{(item.quantity * item.rate).toFixed(2)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => removeItem(item.id)}
                      style={{ marginTop: 8 }}
                    >
                      <Text style={{ color: colors.danger, fontSize: 12 }}>
                        Remove
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          />

          {/* Add Item Button */}
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/add-bill-item",
                params: {
                  customerId: customerId?.toString() || "",
                },
              })
            }
            style={{
              borderWidth: 2,
              borderColor: colors.primary,
              borderRadius: 12,
              borderStyle: "dashed",
              padding: 16,
              alignItems: "center",
              marginVertical: 12,
            }}
          >
            <Text
              style={{
                color: colors.primary,
                fontSize: 16,
                fontWeight: "600",
              }}
            >
              + Add Item
            </Text>
          </TouchableOpacity>

          {/* Notes */}
          <View style={{ marginBottom: 12 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                marginBottom: 6,
                color: colors.text,
              }}
            >
              Notes (optional)
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder="Add any notes here..."
              style={{
                borderWidth: 1,
                borderRadius: 8,
                padding: 10,
                minHeight: 70,
                borderColor: colors.border,
                backgroundColor: "#f8f9fa",
              }}
            />
          </View>
        </View>

        {/* Footer with total and save */}
        <View
          style={{
            borderTopWidth: 1,
            borderColor: colors.border,
            padding: 16,
            backgroundColor: "white",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Text style={{ fontSize: 16, color: colors.textMuted }}>
              Total Amount
            </Text>
            <Text style={{ fontSize: 24, fontWeight: "700" }}>
              ₹{subtotal.toFixed(2)}
            </Text>
          </View>

          <PrimaryButton label="Save Bill" onPress={handleSave} />
        </View>
      </View>
    </Screen>
  );
}
