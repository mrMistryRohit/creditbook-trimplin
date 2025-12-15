import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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
import { Customer, getCustomersByUser } from "../database/customerRepo";
import { Supplier, getSuppliersByUser } from "../database/supplierRepo";
import { appEvents } from "../utils/events";

type SortOption = "date" | "name" | "amount";
type SortOrder = "asc" | "desc";
type LedgerTab = "customers" | "suppliers";

export default function LedgerScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // Tab state
  const [activeTab, setActiveTab] = useState<LedgerTab>("customers");

  // Customers
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);

  // Suppliers
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [showArchived, setShowArchived] = useState(false);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    const [customerList, supplierList] = await Promise.all([
      getCustomersByUser(user.id, showArchived),
      getSuppliersByUser(user.id, showArchived),
    ]);
    setCustomers(customerList);
    setSuppliers(supplierList);
    setLoading(false);
  };

  useEffect(() => {
    loadData();

    const handler = () => {
      loadData();
    };

    appEvents.on("customerUpdated", handler);
    appEvents.on("supplierUpdated", handler);
    return () => {
      appEvents.off("customerUpdated", handler);
      appEvents.off("supplierUpdated", handler);
    };
  }, [user?.id, showArchived]);

  // Apply search and sort for customers
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

  // Apply search and sort for suppliers
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
      />
    );
  };

  const renderItem = ({ item }: { item: Customer | Supplier }) => {
    const isCustomer = activeTab === "customers";
    const isDue = item.balance > 0;

    return (
      <TouchableOpacity
        style={styles.itemRow}
        onPress={() => handleItemPress(item)}
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
  const currentCount =
    activeTab === "customers" ? customers.length : suppliers.length;

  return (
    <Screen>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Ledger</Text>
          <Text style={styles.subtitle}>All customer & supplier accounts</Text>
        </View>

        {/* Search Bar */}
        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${activeTab} by name or phone...`}
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {/* View Archived Toggle */}
        <TouchableOpacity
          style={styles.archivedToggle}
          onPress={() => setShowArchived(!showArchived)}
        >
          <Ionicons
            name={showArchived ? "eye-off-outline" : "eye-outline"}
            size={20}
            color={colors.textMuted}
          />
          <Text style={styles.archivedToggleText}>
            {showArchived ? "Hide Archived" : "Show Archived"}
          </Text>
        </TouchableOpacity>

        {/* Sort Tabs */}
        <View style={styles.sortRow}>
          <TouchableOpacity
            style={[
              styles.sortButton,
              sortBy === "date" && styles.sortButtonActive,
            ]}
            onPress={() => handleSortPress("date")}
          >
            <Text
              style={[
                styles.sortText,
                sortBy === "date" && styles.sortTextActive,
              ]}
            >
              Date{renderSortArrow("date")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sortButton,
              sortBy === "name" && styles.sortButtonActive,
            ]}
            onPress={() => handleSortPress("name")}
          >
            <Text
              style={[
                styles.sortText,
                sortBy === "name" && styles.sortTextActive,
              ]}
            >
              Name{renderSortArrow("name")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sortButton,
              sortBy === "amount" && styles.sortButtonActive,
            ]}
            onPress={() => handleSortPress("amount")}
          >
            <Text
              style={[
                styles.sortText,
                sortBy === "amount" && styles.sortTextActive,
              ]}
            >
              Amount{renderSortArrow("amount")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Customer/Supplier Tab Switcher */}
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

        {/* List */}
        <FlatList
          data={currentData}
          keyExtractor={(item) => `${activeTab}-${item.id}`}
          renderItem={renderItem}
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
  archivedToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    marginBottom: 12,
    gap: 8,
  },
  archivedToggleText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "600",
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
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
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
});
