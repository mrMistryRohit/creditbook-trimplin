import { Ionicons } from "@expo/vector-icons";
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
import {
  addSupplier,
  getSuppliersByUser,
  Supplier,
} from "../database/supplierRepo";
import { appEvents } from "../utils/events";

type SortOption = "date" | "name" | "amount";
type SortOrder = "asc" | "desc";
type HomeTab = "customers" | "suppliers";

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // Tab state
  const [activeTab, setActiveTab] = useState<HomeTab>("customers");

  // Customers
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);

  // Suppliers
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Modals
  const [addCustomerVisible, setAddCustomerVisible] = useState(false);
  const [addSupplierVisible, setAddSupplierVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    const [customerList, supplierList] = await Promise.all([
      getCustomersByUser(user.id),
      getSuppliersByUser(user.id),
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
  }, [user?.id]);

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

  // Calculate totals
  const totalDue = customers
    .filter((c) => c.balance > 0)
    .reduce((sum, c) => sum + c.balance, 0);

  const totalAdvance = customers
    .filter((c) => c.balance < 0)
    .reduce((sum, c) => sum + c.balance, 0);

  const totalPayable = suppliers
    .filter((s) => s.balance > 0)
    .reduce((sum, s) => sum + s.balance, 0);

  const totalReceivable = suppliers
    .filter((s) => s.balance < 0)
    .reduce((sum, s) => sum + s.balance, 0);

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

  const handleAddCustomer = async () => {
    if (!user || !newName.trim()) return;
    await addCustomer(user.id, newName.trim(), newPhone.trim());
    setNewName("");
    setNewPhone("");
    setAddCustomerVisible(false);
    await loadData();
  };

  const handleAddSupplier = async () => {
    if (!user || !newName.trim()) return;
    await addSupplier(user.id, newName.trim(), newPhone.trim());
    setNewName("");
    setNewPhone("");
    setAddSupplierVisible(false);
    await loadData();
  };

  const handleSortPress = (column: SortOption) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  // const renderSortArrow = (column: SortOption) => {
  //   if (sortBy !== column) return null;
  //   return sortOrder === "asc" ? " ↓" : " ↑";
  // };

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
                  ? styles.due
                  : styles.advance
                : isDue
                ? styles.payable
                : styles.receivable,
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

        {/* Unified Summary Card */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total you will get</Text>
              <Text style={[styles.summaryValue, styles.due]}>
                ₹{" "}
                {(totalDue + Math.abs(totalReceivable)).toLocaleString("en-IN")}
              </Text>
              <Text style={styles.summaryBreakdown}>
                Customers: ₹{totalDue.toLocaleString("en-IN")}
                {"\n"}
                Suppliers: ₹{Math.abs(totalReceivable).toLocaleString("en-IN")}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total you will give</Text>
              <Text style={[styles.summaryValue, styles.advance]}>
                ₹{" "}
                {(Math.abs(totalAdvance) + totalPayable).toLocaleString(
                  "en-IN"
                )}
              </Text>
              <Text style={styles.summaryBreakdown}>
                Customers: ₹{Math.abs(totalAdvance).toLocaleString("en-IN")}
                {"\n"}
                Suppliers: ₹{totalPayable.toLocaleString("en-IN")}
              </Text>
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <PrimaryButton
              label="+ Add customer"
              onPress={() => setAddCustomerVisible(true)}
              style={styles.addButton}
            />
            <PrimaryButton
              label="+ Add supplier"
              onPress={() => setAddSupplierVisible(true)}
              style={styles.addButton}
            />
          </View>
        </Card>

        {/* Search Bar */}
        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${activeTab} by name or phone...`}
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
                    : `No ${activeTab} yet. Tap "+ Add ${
                        activeTab === "customers" ? "customer" : "supplier"
                      }" to create one.`}
                </Text>
              </View>
            ) : null
          }
        />

        {/* Add Customer Modal */}
        <Modal
          visible={addCustomerVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setAddCustomerVisible(false)}
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
                  onPress={() => setAddCustomerVisible(false)}
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

        {/* Add Supplier Modal */}
        <Modal
          visible={addSupplierVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setAddSupplierVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add Supplier</Text>
              <TextInput
                style={styles.input}
                placeholder="Supplier name"
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
                  onPress={() => setAddSupplierVisible(false)}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleAddSupplier}
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
  summaryBreakdown: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },

  due: { color: colors.accent },
  advance: { color: colors.danger },
  payable: { color: colors.danger },
  receivable: { color: colors.accent },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
  },
  addButton: {
    flex: 1,
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
  tabSwitcher: {
    flexDirection: "row",
    marginBottom: 16,
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
  itemInfo: {
    flex: 1,
  },
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
