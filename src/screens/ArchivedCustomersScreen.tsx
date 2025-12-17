import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  BackHandler,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { colors, typography } from "../../constants/theme";
import Screen from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { useBusiness } from "../context/BusinessContext";
import { Customer, getCustomersByUser } from "../database/customerRepo";
import { appEvents } from "../utils/events";

export default function ArchivedCustomersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentBusiness } = useBusiness();
  const [archivedCustomers, setArchivedCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const loadArchivedCustomers = async () => {
    if (!user || !currentBusiness) return;
    setLoading(true);
    const all = await getCustomersByUser(user.id, currentBusiness.id, true);
    const archived = all.filter((c) => c.archived === 1);
    setArchivedCustomers(archived);
    setLoading(false);
  };

  useEffect(() => {
    loadArchivedCustomers();

    const handler = () => {
      loadArchivedCustomers();
    };

    appEvents.on("customerUpdated", handler);
    appEvents.on("businessSwitched", handler);

    return () => {
      appEvents.off("customerUpdated", handler);
      appEvents.off("businessSwitched", handler);
    };
  }, [user?.id, currentBusiness?.id]);

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

  const handleCustomerPress = (customer: Customer) => {
    router.push({
      pathname: "/customer-detail",
      params: { customer: JSON.stringify(customer) },
    });
  };

  const renderCustomer = ({ item }: { item: Customer }) => {
    const isDue = item.balance > 0;
    return (
      <TouchableOpacity
        style={styles.itemRow}
        onPress={() => handleCustomerPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemSubtitle}>
            {item.phone || item.last_activity || "No activity"}
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
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.replace("/(tabs)/ledger")}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Archived Customers</Text>
          <View style={styles.placeholder} />
        </View>

        {/* List */}
        <FlatList
          data={archivedCustomers}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderCustomer}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No archived customers.</Text>
              </View>
            ) : null
          }
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    marginBottom: 16,
  },
  backButton: { padding: 8 },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  placeholder: { width: 40 },
  listContent: { paddingBottom: 40 },
  itemRow: {
    backgroundColor: colors.inputBackground,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemInfo: { flex: 1 },
  itemName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  itemSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  balanceContainer: {
    alignItems: "flex-end",
    marginLeft: 16,
  },
  balance: {
    fontSize: 16,
    fontWeight: "700",
  },
  due: { color: colors.accent },
  advance: { color: colors.danger },
  balanceLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  separator: { height: 12 },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.body,
    textAlign: "center",
  },
});
