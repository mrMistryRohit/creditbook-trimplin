import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { colors } from "../../constants/theme";
import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";
import Screen from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import {
  addCustomer,
  Customer,
  getCustomersByUser,
} from "../database/customerRepo";
import { appEvents } from "../utils/events";

type SortOption = "date" | "name" | "amount";
type SortOrder = "asc" | "desc";


export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc"); // Default: recent first


  const [addVisible, setAddVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

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

  const totalDue = customers
    .filter((c) => c.balance > 0)
    .reduce((sum, c) => sum + c.balance, 0);

  const totalAdvance = customers
    .filter((c) => c.balance < 0)
    .reduce((sum, c) => sum + c.balance, 0);

  const handleCustomerPress = (customer: Customer) => {
    router.push({
      pathname: "/customer-detail",
      params: { customer: JSON.stringify(customer) },
    });
  };

  const handleAddCustomer = async () => {
    if (!user || !newName.trim()) return;
    await addCustomer(user.id, newName.trim(), newPhone.trim());
    setNewName("");
    setNewPhone("");
    setAddVisible(false);
    await loadCustomers();
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

  const renderSortArrow = (column: SortOption) => {
    if (sortBy !== column) return null;
    return sortOrder === "asc" ? " ↓" : " ↑";
  };


  return (
    <Screen>
      <View style={styles.container}>
        {/* Custom Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appName}>CreditBook</Text>
            <Text style={styles.brandName}>by Trimplin</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>Dashboard</Text>
            <Text style={styles.headerSubtitle}>
              Simple digital udhar bahi khata
            </Text>
          </View>
        </View>

        {/* Summary Card */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total you will get</Text>
              <Text style={[styles.summaryValue, styles.due]}>
                ₹ {totalDue.toLocaleString("en-IN")}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total you will give</Text>
              <Text style={[styles.summaryValue, styles.advance]}>
                ₹ {Math.abs(totalAdvance).toLocaleString("en-IN")}
              </Text>
            </View>
          </View>
          <PrimaryButton
            label="+ Add customer"
            onPress={() => setAddVisible(true)}
            style={styles.addCustomerButton}
          />
        </Card>

        {/* Search Bar */}
        <TextInput
          style={styles.searchInput}
          placeholder="Search customers by name or phone..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {/* Sort Options */}
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


        {/* Section Title */}
        <Text style={styles.sectionTitle}>
          {loading ? "Loading..." : `Customers (${filteredCustomers.length})`}
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
                    : 'No customers yet. Tap "+ Add customer" to create one.'}
                </Text>
              </View>
            ) : null
          }
        />

        {/* Add Customer Modal */}
        <Modal
          visible={addVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setAddVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add Customer</Text>
              <TextInput
                style={styles.input}
                placeholder="Customer name"
                placeholderTextColor={colors.textMuted}
                value={newName}
                onChangeText={setNewName}
              />
              <TextInput
                style={styles.input}
                placeholder="Phone (optional)"
                placeholderTextColor={colors.textMuted}
                value={newPhone}
                onChangeText={setNewPhone}
                keyboardType="phone-pad"
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setAddVisible(false)}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleAddCustomer}
                >
                  <Text style={styles.saveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Screen>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingTop: 12,
    paddingBottom: 16,
  },
  appName: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  brandName: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  headerTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  summaryCard: {
    marginTop: 8,
    marginBottom: 16,
    padding: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  due: { color: colors.accent },
  advance: { color: colors.danger },
  addCustomerButton: {
    marginTop: 4,
  },
  searchInput: {
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  sortButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
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
    fontSize: 12,
    fontWeight: "600",
  },
  sortTextActive: {
    color: "white",
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
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
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },
  input: {
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
    gap: 10,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  cancelButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  cancelText: { color: colors.textMuted, fontSize: 15 },
  saveText: { color: "white", fontSize: 15, fontWeight: "600" },
});
