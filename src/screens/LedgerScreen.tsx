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
import {
  Customer,
  getCustomersByUser,
} from "../database/customerRepo";
import { appEvents } from "../utils/events";

type SortOption = "date" | "name" | "amount";
type SortOrder = "asc" | "desc";

export default function LedgerScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc"); // Default: recent first

  const loadCustomers = async () => {
    if (!user) return;
    setLoading(true);
    const list = await getCustomersByUser(user.id);
    setCustomers(list);
    setLoading(false);
  };

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

  // Apply search and sort
  useEffect(() => {
    let result = [...customers];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          (c.phone && c.phone.toLowerCase().includes(query))
      );
    }

    // Sort
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
        // For date, keep original DB order (recent first) if desc
        // For asc, reverse it (oldest first)
        if (sortOrder === "asc") {
          result.reverse();
        }
        break;
    }

    setFilteredCustomers(result);
  }, [customers, searchQuery, sortBy, sortOrder]);

  const handleSortPress = (column: SortOption) => {
    if (sortBy === column) {
      // Toggle order if same column
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // New column: start with ascending
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const handleCustomerPress = (customer: Customer) => {
    router.push({
      pathname: "/customer-detail",
      params: { customer: JSON.stringify(customer) },
    });
  };

  const renderSortArrow = (column: SortOption) => {
    if (sortBy !== column) return null;
    return sortOrder === "asc" ? " ↓" : " ↑";
  };

  const renderCustomer = ({ item }: { item: Customer }) => {
    const isDue = item.balance > 0;
    return (
      <TouchableOpacity
        style={styles.customerRow}
        onPress={() => handleCustomerPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>{item.name}</Text>
          <Text style={styles.customerSubtitle}>
            {item.phone || item.last_activity || "No activity"}
          </Text>
        </View>
        <View style={styles.balanceContainer}>
          <Text style={[styles.balance, isDue ? styles.credit : styles.debit]}>
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
          <Text style={styles.title}>Ledger</Text>
          <Text style={styles.subtitle}>All customer accounts</Text>
        </View>

        {/* Search Bar */}
        <TextInput
          style={styles.searchInput}
          placeholder="Search customers by name or phone..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {/* Sort Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, sortBy === "date" && styles.tabActive]}
            onPress={() => handleSortPress("date")}
          >
            <Text
              style={[
                styles.tabText,
                sortBy === "date" && styles.tabTextActive,
              ]}
            >
              Date{renderSortArrow("date")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, sortBy === "name" && styles.tabActive]}
            onPress={() => handleSortPress("name")}
          >
            <Text
              style={[
                styles.tabText,
                sortBy === "name" && styles.tabTextActive,
              ]}
            >
              Name{renderSortArrow("name")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, sortBy === "amount" && styles.tabActive]}
            onPress={() => handleSortPress("amount")}
          >
            <Text
              style={[
                styles.tabText,
                sortBy === "amount" && styles.tabTextActive,
              ]}
            >
              Amount{renderSortArrow("amount")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Section Title */}
        <Text style={styles.sectionTitle}>
          {loading ? "Loading..." : `${filteredCustomers.length} Customers`}
        </Text>

        {/* Customer List */}
        <FlatList
          data={filteredCustomers}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderCustomer}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {searchQuery
                    ? "No customers found for your search."
                    : "No customers yet. Add customers from Home screen."}
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
  container: {
    flex: 1,
  },
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
  tabRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: colors.inputBackground,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  tabTextActive: {
    color: "white",
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: spacing.md,
  },
  listContent: {
    paddingBottom: 120,
  },
  customerRow: {
    backgroundColor: colors.inputBackground,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  customerSubtitle: {
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
  credit: { color: colors.accent },
  debit: { color: colors.danger },
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
