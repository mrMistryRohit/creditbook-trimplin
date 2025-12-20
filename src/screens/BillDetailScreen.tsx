import * as Print from "expo-print";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { colors } from "../../constants/theme";
import PrimaryButton from "../components/PrimaryButton";
import Screen from "../components/Screen";
import { useBusiness } from "../context/BusinessContext";
import { getBillWithItems } from "../database/billRepo";
import { getCustomerById } from "../database/customerRepo";

export default function BillDetailScreen() {
  const { billId } = useLocalSearchParams<{ billId: string }>();
  const router = useRouter();
  const { currentBusiness } = useBusiness();
  const [state, setState] = useState<Awaited<
    ReturnType<typeof getBillWithItems>
  > | null>(null);
  const [customerName, setCustomerName] = useState("");

  useEffect(() => {
    if (!billId) return;
    (async () => {
      const data = await getBillWithItems(Number(billId));
      setState(data);
      if (data) {
        const customer = await getCustomerById(data.bill.customer_id);
        if (customer) setCustomerName(customer.name);
      }
    })();
  }, [billId]);

  const handleDownloadPDF = async () => {
    if (!state || !currentBusiness) return;

    const { bill, items } = state;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    h1 { color: #2c3e50; text-align: center; }
    .header { margin-bottom: 20px; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
    .info { display: flex; justify-content: space-between; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #3498db; color: white; }
    .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; }
  </style>
</head>
<body>
  <h1>${currentBusiness.name}</h1>
  <div class="header">
    <div class="info">
      <div><strong>Bill Number:</strong> ${bill.bill_number}</div>
      <div><strong>Date:</strong> ${bill.bill_date}</div>
    </div>
    <div class="info">
      <div><strong>Customer:</strong> ${customerName}</div>
    </div>
  </div>

  <table>
    <tr>
      <th>S.No</th>
      <th>Item</th>
      <th>Qty</th>
      <th>Unit</th>
      <th>Rate</th>
      <th>Total</th>
    </tr>
    ${items
      .map(
        (it, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${it.item_name}</td>
        <td>${it.quantity}</td>
        <td>${it.unit}</td>
        <td>₹${it.rate.toFixed(2)}</td>
        <td>₹${it.total.toFixed(2)}</td>
      </tr>
    `
      )
      .join("")}
  </table>

  <div class="total">
    Total: ₹${bill.total.toFixed(2)}
  </div>

  ${bill.notes ? `<p><strong>Notes:</strong> ${bill.notes}</p>` : ""}
</body>
</html>
`;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: `${bill.bill_number}.pdf`,
      });
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to generate PDF.");
    }
  };

  if (!state) {
    return (
      <Screen>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ color: colors.text }}>Loading bill...</Text>
        </View>
      </Screen>
    );
  }

  const { bill, items } = state;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Card */}
        <View
          style={{
            backgroundColor: colors.primary,
            padding: 20,
            borderRadius: 16,
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontSize: 28,
              fontWeight: "700",
              color: "white",
              marginBottom: 12,
            }}
          >
            {bill.bill_number}
          </Text>
          <Text
            style={{
              color: "white",
              fontSize: 16,
              fontWeight: "500",
              marginBottom: 4,
            }}
          >
            {customerName}
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 13 }}>
            Date: {bill.bill_date}
          </Text>
        </View>

        {/* Items Section */}
        <View
          style={{
            backgroundColor: "#1a1a2e",
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontWeight: "700",
              marginBottom: 12,
              fontSize: 16,
              color: "white",
            }}
          >
            Items
          </Text>
          {items.map((it, idx) => (
            <View
              key={it.id}
              style={{
                paddingVertical: 12,
                borderBottomWidth: idx < items.length - 1 ? 1 : 0,
                borderBottomColor: "rgba(255,255,255,0.1)",
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
                  <Text
                    style={{
                      fontWeight: "600",
                      fontSize: 15,
                      color: "white",
                      marginBottom: 4,
                    }}
                  >
                    {it.item_name}
                  </Text>
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.6)",
                      fontSize: 13,
                    }}
                  >
                    {it.quantity} {it.unit} × ₹{it.rate.toFixed(2)}
                  </Text>
                </View>
                <Text
                  style={{
                    fontWeight: "600",
                    fontSize: 16,
                    color: "white",
                  }}
                >
                  ₹{it.total.toFixed(2)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Total Amount Card */}
        <View
          style={{
            backgroundColor: "white", // Changed from #d4e9f7
            padding: 20,
            borderRadius: 16,
            marginBottom: 16,
            borderWidth: 2,
            borderColor: colors.primary,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 14,
              color: colors.textMuted,
              marginBottom: 8,
            }}
          >
            Total Amount
          </Text>
          <Text
            style={{
              fontSize: 36, // Increased from 32
              fontWeight: "700",
              color: colors.primaryDark, // Dark text instead of muted
            }}
          >
            ₹{bill.total.toFixed(2)}
          </Text>
        </View>

        {/* Notes */}
        {bill.notes && (
          <View
            style={{
              backgroundColor: "#f8f9fa",
              padding: 16,
              borderRadius: 12,
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                fontWeight: "600",
                marginBottom: 6,
                color: colors.text,
              }}
            >
              Notes:
            </Text>
            <Text style={{ color: colors.textMuted, lineHeight: 20 }}>
              {bill.notes}
            </Text>
          </View>
        )}

        {/* Download PDF Button */}
        <TouchableOpacity
          onPress={handleDownloadPDF}
          style={{
            backgroundColor: colors.accent,
            paddingVertical: 16,
            borderRadius: 28,
            marginBottom: 12,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
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
            Download PDF
          </Text>
        </TouchableOpacity>

        {/* Back Button */}
        <PrimaryButton label="Back to customer" onPress={() => router.back()} />
      </ScrollView>
    </Screen>
  );
}
