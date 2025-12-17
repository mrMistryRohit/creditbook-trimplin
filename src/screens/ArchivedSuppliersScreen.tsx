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
import { Supplier, getSuppliersByUser } from "../database/supplierRepo";
import { appEvents } from "../utils/events";

export default function ArchivedSuppliersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentBusiness } = useBusiness();
  const [archivedSuppliers, setArchivedSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  const loadArchivedSuppliers = async () => {
    if (!user || !currentBusiness) return;
    setLoading(true);
    const all = await getSuppliersByUser(user.id, currentBusiness.id, true);
    const archived = all.filter((s) => s.archived === 1);
    setArchivedSuppliers(archived);
    setLoading(false);
  };

  useEffect(() => {
    loadArchivedSuppliers();

    const handler = () => {
      loadArchivedSuppliers();
    };

    appEvents.on("supplierUpdated", handler);
    appEvents.on("businessSwitched", handler);

    return () => {
      appEvents.off("supplierUpdated", handler);
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

  const handleSupplierPress = (supplier: Supplier) => {
    router.push({
      pathname: "/supplier-detail",
      params: { supplier: JSON.stringify(supplier) },
    });
  };

  const renderSupplier = ({ item }: { item: Supplier }) => {
    const isPayable = item.balance > 0;
    return (
      <TouchableOpacity
        style={styles.itemRow}
        onPress={() => handleSupplierPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemSubtitle}>
            {item.phone || item.last_activity || "No activity"}
          </Text>
        </View>
        <View style={styles.balanceContainer}>
          <Text
            style={[
              styles.balance,
              isPayable ? styles.payable : styles.receivable,
            ]}
          >
            ₹ {Math.abs(item.balance).toLocaleString("en-IN")}
          </Text>
          <Text style={styles.balanceLabel}>
            {isPayable ? "You will pay" : "You will get"}
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
          <Text style={styles.title}>Archived Suppliers</Text>
          <View style={styles.placeholder} />
        </View>

        {/* List */}
        <FlatList
          data={archivedSuppliers}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderSupplier}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No archived suppliers.</Text>
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
  payable: { color: colors.danger },
  receivable: { color: colors.accent },
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
