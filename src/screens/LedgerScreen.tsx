import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { colors, spacing, typography } from "../../constants/theme";
import Screen from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { useBusiness } from "../context/BusinessContext";
import { Customer, getCustomersByUser } from "../database/customerRepo";
import { Supplier, getSuppliersByUser } from "../database/supplierRepo";
import { appEvents } from "../utils/events";

type SortOption = "date" | "name" | "amount";
type SortOrder = "asc" | "desc";
type LedgerTab = "customers" | "suppliers";

export default function LedgerScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentBusiness } = useBusiness();

  const [activeTab, setActiveTab] = useState<LedgerTab>("customers");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [archivedCustomersCount, setArchivedCustomersCount] = useState(0);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [archivedSuppliersCount, setArchivedSuppliersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // ✅ Add reload trigger state
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // ✅ Wrap loadData in useCallback with proper dependencies
  const loadData = useCallback(async () => {
    console.log("🔄 LedgerScreen loadData called");
    console.log(
      "Current Business:",
      currentBusiness?.name,
      "ID:",
      currentBusiness?.id
    );

    if (!user || !currentBusiness) {
      console.log("⚠️ Missing user or business");
      return;
    }

    // Clear existing data immediately
    setCustomers([]);
    setSuppliers([]);
    setFilteredCustomers([]);
    setFilteredSuppliers([]);
    setArchivedCustomersCount(0);
    setArchivedSuppliersCount(0);

    setLoading(true);

    try {
      const [
        activeCustomers,
        archivedCustomers,
        activeSuppliers,
        archivedSuppliers,
      ] = await Promise.all([
        getCustomersByUser(user.id, currentBusiness.id, false),
        getCustomersByUser(user.id, currentBusiness.id, true),
        getSuppliersByUser(user.id, currentBusiness.id, false),
        getSuppliersByUser(user.id, currentBusiness.id, true),
      ]);

      console.log(
        "✅ Ledger loaded:",
        activeCustomers.length,
        "customers,",
        activeSuppliers.length,
        "suppliers for business:",
        currentBusiness.id
      );

      setCustomers(activeCustomers);
      setSuppliers(activeSuppliers);

      setArchivedCustomersCount(
        archivedCustomers.filter((c) => c.archived === 1).length
      );
      setArchivedSuppliersCount(
        archivedSuppliers.filter((s) => s.archived === 1).length
      );
    } catch (error) {
      console.error("❌ Error loading ledger data:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, currentBusiness?.id]);

  // ✅ Load data when dependencies change OR reloadTrigger changes
  useEffect(() => {
    loadData();
  }, [loadData, reloadTrigger]);

  // ✅ Event handlers trigger state change instead of calling loadData directly
  useEffect(() => {
    const handler = () => {
      console.log("📣 Ledger: Event received, triggering reload");
      setReloadTrigger((prev) => prev + 1);
    };

    appEvents.on("customerUpdated", handler);
    appEvents.on("supplierUpdated", handler);
    appEvents.on("businessSwitched", handler);

    return () => {
      appEvents.off("customerUpdated", handler);
      appEvents.off("supplierUpdated", handler);
      appEvents.off("businessSwitched", handler);
    };
  }, []); // ✅ Empty dependencies - handler never changes

  useEffect(() => {
    let result = [...customers];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          (c.phone && c.phone.toLowerCase().includes(query))
      );
    }

    switch (sortBy) {
      case "name":
        result.sort((a, b) => {
          const comparison = a.name.localeCompare(b.name);
          return sortOrder === "asc" ? comparison : -comparison;
        });
        break;
      case "amount":
        result.sort((a, b) => {
          const comparison = Math.abs(a.balance) - Math.abs(b.balance);
          return sortOrder === "asc" ? comparison : -comparison;
        });
        break;
      case "date":
      default:
        if (sortOrder === "asc") {
          result.reverse();
        }
        break;
    }

    setFilteredCustomers(result);
  }, [customers, searchQuery, sortBy, sortOrder]);

  useEffect(() => {
    let result = [...suppliers];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          (s.phone && s.phone.toLowerCase().includes(query))
      );
    }

    switch (sortBy) {
      case "name":
        result.sort((a, b) => {
          const comparison = a.name.localeCompare(b.name);
          return sortOrder === "asc" ? comparison : -comparison;
        });
        break;
      case "amount":
        result.sort((a, b) => {
          const comparison = Math.abs(a.balance) - Math.abs(b.balance);
          return sortOrder === "asc" ? comparison : -comparison;
        });
        break;
      case "date":
      default:
        if (sortOrder === "asc") {
          result.reverse();
        }
        break;
    }

    setFilteredSuppliers(result);
  }, [suppliers, searchQuery, sortBy, sortOrder]);

  const handleItemPress = (item: Customer | Supplier) => {
    if (activeTab === "customers") {
      router.push({
        pathname: "/customer-detail",
        params: { customer: JSON.stringify(item) },
      });
    } else {
      router.push({
        pathname: "/supplier-detail",
        params: { supplier: JSON.stringify(item) },
      });
    }
  };

  const handleArchivePress = () => {
    if (activeTab === "customers") {
      router.push("/archived-customers");
    } else {
      router.push("/archived-suppliers");
    }
  };

  const handleSortPress = (column: SortOption) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const renderSortArrow = (column: SortOption) => {
    if (sortBy !== column) return null;
    return (
      <Ionicons
        name={sortOrder === "asc" ? "arrow-down" : "arrow-up"}
        size={12}
        color={sortBy === column ? "white" : colors.textMuted}
        style={{ marginLeft: 4 }}
      />
    );
  };

  const renderArchiveCard = () => {
    const count =
      activeTab === "customers"
        ? archivedCustomersCount
        : archivedSuppliersCount;

    if (count === 0) return null;

    return (
      <TouchableOpacity
        style={styles.archiveCard}
        onPress={handleArchivePress}
        activeOpacity={0.7}
      >
        <View style={styles.archiveIcon}>
          <Ionicons name="archive" size={22} color={colors.accent} />
        </View>
        <View style={styles.archiveInfo}>
          <Text style={styles.archiveTitle}>Archived</Text>
          <Text style={styles.archiveSubtitle}>
            {count} archived{" "}
            {activeTab === "customers" ? "customer" : "supplier"}
            {count > 1 ? "s" : ""}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }: { item: Customer | Supplier }) => {
    const isCustomer = activeTab === "customers";
    const isDue = item.balance > 0;

    const today = new Date();
    const todayStr = today.toLocaleDateString("en-IN");

    const dueDate = isCustomer ? (item as Customer).due_date || null : null;
    const createdAt = (item as Customer).created_at as string | undefined;

    let createdDateStr: string | null = null;
    if (createdAt) {
      const created = new Date(createdAt);
      if (!Number.isNaN(created.getTime())) {
        createdDateStr = created.toLocaleDateString("en-IN");
      }
    }

    type SubtitleKind = "due" | "last" | "noneToday" | "none";
    let kind: SubtitleKind;
    let value: string | null = null;

    if (isCustomer && dueDate) {
      kind = "due";
      value = dueDate;
    } else if (item.last_activity) {
      kind = "last";
      value = item.last_activity === todayStr ? "Today" : item.last_activity;
    } else if (createdDateStr === todayStr) {
      kind = "noneToday";
    } else {
      kind = "none";
    }

    const renderSubtitle = () => {
      switch (kind) {
        case "due":
          return <Text style={styles.itemSubtitleDue}>Due on: {value}</Text>;
        case "last":
          return (
            <Text style={styles.itemSubtitleLast}>
              Last transaction on: {value}
            </Text>
          );
        case "noneToday":
          return (
            <Text style={styles.itemSubtitleNone}>
              No activity (created today)
            </Text>
          );
        case "none":
        default:
          return <Text style={styles.itemSubtitleNone}>No activity</Text>;
      }
    };

    return (
      <TouchableOpacity
        style={styles.itemRow}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          {renderSubtitle()}
        </View>
        <View style={styles.balanceContainer}>
          <Text
            style={[
              styles.balance,
              isCustomer
                ? isDue
                  ? styles.customerDue
                  : styles.customerAdvance
                : isDue
                ? styles.supplierPayable
                : styles.supplierReceivable,
            ]}
          >
            ₹ {Math.abs(item.balance).toLocaleString("en-IN")}
          </Text>
          <Text style={styles.balanceLabel}>
            {isCustomer
              ? isDue
                ? "You will get"
                : "You will give"
              : isDue
              ? "You will pay"
              : "You will get"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const currentData =
    activeTab === "customers" ? filteredCustomers : filteredSuppliers;

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Ledger</Text>
          <Text style={styles.subtitle}>All customer & supplier accounts</Text>
        </View>

        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${activeTab} by name or phone...`}
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        <View style={styles.sortRow}>
          <TouchableOpacity
            style={[
              styles.sortButton,
              sortBy === "date" && styles.sortButtonActive,
            ]}
            onPress={() => handleSortPress("date")}
          >
            <View style={styles.sortButtonContent}>
              <Text
                style={[
                  styles.sortText,
                  sortBy === "date" && styles.sortTextActive,
                ]}
              >
                Date
              </Text>
              {renderSortArrow("date")}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sortButton,
              sortBy === "name" && styles.sortButtonActive,
            ]}
            onPress={() => handleSortPress("name")}
          >
            <View style={styles.sortButtonContent}>
              <Text
                style={[
                  styles.sortText,
                  sortBy === "name" && styles.sortTextActive,
                ]}
              >
                Name
              </Text>
              {renderSortArrow("name")}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sortButton,
              sortBy === "amount" && styles.sortButtonActive,
            ]}
            onPress={() => handleSortPress("amount")}
          >
            <View style={styles.sortButtonContent}>
              <Text
                style={[
                  styles.sortText,
                  sortBy === "amount" && styles.sortTextActive,
                ]}
              >
                Amount
              </Text>
              {renderSortArrow("amount")}
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "customers" && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab("customers")}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "customers" && styles.tabButtonTextActive,
              ]}
            >
              Customers ({customers.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "suppliers" && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab("suppliers")}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "suppliers" && styles.tabButtonTextActive,
              ]}
            >
              Suppliers ({suppliers.length})
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={currentData}
          keyExtractor={(item) => `${activeTab}-${item.id}`}
          renderItem={renderItem}
          ListHeaderComponent={renderArchiveCard}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {searchQuery
                    ? `No ${activeTab} found for your search.`
                    : `No ${activeTab} yet. Add from Home screen.`}
                </Text>
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
    paddingTop: 12,
    paddingBottom: 16,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  searchInput: {
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: spacing.md,
  },
  sortButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: colors.inputBackground,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sortButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  sortText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  sortTextActive: {
    color: "white",
  },
  tabSwitcher: {
    flexDirection: "row",
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabButtonActive: {
    borderBottomColor: colors.accent,
  },
  tabButtonText: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: "600",
  },
  tabButtonTextActive: {
    color: colors.accent,
    fontWeight: "700",
  },
  archiveCard: {
    backgroundColor: colors.inputBackground,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  archiveIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  archiveInfo: {
    flex: 1,
  },
  archiveTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  archiveSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  listContent: {
    paddingBottom: 120,
  },
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
  // itemSubtitle: {
  //   color: colors.textMuted,
  //   fontSize: 13,
  //   marginTop: 4,
  // },
  balanceContainer: {
    alignItems: "flex-end",
    marginLeft: 16,
  },
  balance: {
    fontSize: 16,
    fontWeight: "700",
  },
  customerDue: { color: colors.accent },
  customerAdvance: { color: colors.danger },
  supplierPayable: { color: colors.danger },
  supplierReceivable: { color: colors.accent },
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
    lineHeight: 20,
  },
  itemSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  itemSubtitleDue: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "700",
    color: "#FF4D4F", // bright red
  },
  itemSubtitleLast: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "700",
    color: "#5AC8FA", // blue for full "Last transaction on: ..."
  },
  itemSubtitleNone: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "700",
    color: "#F39C12", // amber for "No activity ..."
  },
});
