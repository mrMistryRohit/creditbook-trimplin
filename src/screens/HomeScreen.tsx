import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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
import { useBusiness } from "../context/BusinessContext";
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
import { Business, getBusinessesByUser } from "../database/businessRepo"; // ✅ ADD THIS
import { appEvents } from "../utils/events";

type SortOption = "date" | "name" | "amount";
type SortOrder = "asc" | "desc";
type HomeTab = "customers" | "suppliers";

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentBusiness, setCurrentBusiness } = useBusiness(); // ✅ ADD setCurrentBusiness

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
  const [businessSwitcherVisible, setBusinessSwitcherVisible] = useState(false); // ✅ ADD THIS
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  // ✅ ADD: Business list state
  const [businesses, setBusinesses] = useState<Business[]>([]);

  const [reloadTrigger, setReloadTrigger] = useState(0);

  // ✅ ADD: Load businesses function
  const loadBusinesses = useCallback(async () => {
    if (!user) return;
    try {
      const businessList = await getBusinessesByUser(user.id);
      setBusinesses(businessList);
    } catch (error) {
      console.error("Error loading businesses:", error);
    }
  }, [user?.id]);

  const loadData = useCallback(async () => {
    console.log("🔄 HomeScreen loadData called");
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

    setCustomers([]);
    setSuppliers([]);
    setFilteredCustomers([]);
    setFilteredSuppliers([]);

    setLoading(true);

    try {
      const [customerList, supplierList] = await Promise.all([
        getCustomersByUser(user.id, currentBusiness.id),
        getSuppliersByUser(user.id, currentBusiness.id),
      ]);

      console.log(
        "✅ Loaded:",
        customerList.length,
        "customers,",
        supplierList.length,
        "suppliers for business:",
        currentBusiness.id
      );

      setCustomers(customerList);
      setSuppliers(supplierList);
    } catch (error) {
      console.error("❌ Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, currentBusiness?.id]);

  useEffect(() => {
    loadData();
    loadBusinesses(); // ✅ ADD THIS
  }, [loadData, loadBusinesses, reloadTrigger]);

  useEffect(() => {
    const handler = () => {
      console.log("📣 Home: Event received, triggering reload");
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
  }, []);

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
    if (!user || !currentBusiness || !newName.trim()) return;
    await addCustomer(
      user.id,
      currentBusiness.id,
      newName.trim(),
      newPhone.trim()
    );
    appEvents.emit("customerUpdated");
    setNewName("");
    setNewPhone("");
    setAddCustomerVisible(false);
  };

  const handleAddSupplier = async () => {
    if (!user || !currentBusiness || !newName.trim()) return;
    await addSupplier(
      user.id,
      currentBusiness.id,
      newName.trim(),
      newPhone.trim()
    );
    appEvents.emit("supplierUpdated");
    setNewName("");
    setNewPhone("");
    setAddSupplierVisible(false);
  };

  // ✅ ADD: Handle business switch
  const handleBusinessSwitch = (business: Business) => {
    setCurrentBusiness(business);
    setBusinessSwitcherVisible(false);
    appEvents.emit("businessSwitched");
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

  // ✅ ADD: Render business item in switcher
  const renderBusinessItem = ({ item }: { item: Business }) => {
    const isActive = item.id === currentBusiness?.id;

    return (
      <TouchableOpacity
        style={[styles.businessItem, isActive && styles.businessItemActive]}
        onPress={() => handleBusinessSwitch(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.businessItemIcon, isActive && styles.businessItemIconActive]}>
          <Ionicons
            name="briefcase"
            size={20}
            color={isActive ? "white" : colors.accent}
          />
        </View>
        <View style={styles.businessItemInfo}>
          <Text style={[styles.businessItemName, isActive && styles.businessItemNameActive]}>
            {item.name}
          </Text>
          {item.phone && (
            <Text style={styles.businessItemPhone}>{item.phone}</Text>
          )}
        </View>
        {isActive && (
          <Ionicons name="checkmark-circle" size={24} color={colors.accent} />
        )}
      </TouchableOpacity>
    );
  };

  const currentData =
    activeTab === "customers" ? filteredCustomers : filteredSuppliers;

  return (
    <Screen>
      <View style={styles.container}>
        {/* ✅ UPDATED: Custom Header with Business Switcher */}
        <TouchableOpacity
          style={styles.header}
          onPress={() => setBusinessSwitcherVisible(true)}
          activeOpacity={0.7}
        >
          <View style={styles.headerLeft}>
            <View style={styles.businessIconContainer}>
              <Ionicons name="briefcase" size={20} color={colors.accent} />
            </View>
            <View style={styles.businessNameContainer}>
              <Text style={styles.businessLabel}>Business</Text>
              <View style={styles.businessNameRow}>
                <Text
                  style={styles.businessName}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {currentBusiness?.name || "Select Business"}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.profileIcon}
            onPress={() => router.push('/settings')}
            activeOpacity={0.7}
          >
            <Ionicons name="person-circle" size={40} color={colors.accent} />
          </TouchableOpacity>
        </TouchableOpacity>

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
                    : `No ${activeTab} yet. Tap "+ Add ${activeTab === "customers" ? "customer" : "supplier"
                    }" to create one.`}
                </Text>
              </View>
            ) : null
          }
        />

        {/* ✅ ADD: Business Switcher Modal */}
        <Modal
          visible={businessSwitcherVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setBusinessSwitcherVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Switch Business</Text>
                <TouchableOpacity onPress={() => setBusinessSwitcherVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <FlatList
                data={businesses}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderBusinessItem}
                ItemSeparatorComponent={() => <View style={styles.businessSeparator} />}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No businesses found</Text>
                  </View>
                }
                style={styles.businessList}
              />
            </View>
          </View>
        </Modal>

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
  // ✅ UPDATED: Header styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  businessIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  businessNameContainer: {
    flex: 1,
  },
  businessLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  businessNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  businessName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  profileIcon: {
    marginLeft: 12,
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
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
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

  // ✅ ADD: Business switcher styles
  businessList: {
    maxHeight: 400,
  },
  businessItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    gap: 12,
  },
  businessItemActive: {
    backgroundColor: colors.primary + '15',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  businessItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  businessItemIconActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  businessItemInfo: {
    flex: 1,
  },
  businessItemName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  businessItemNameActive: {
    color: colors.accent,
    fontWeight: '700',
  },
  businessItemPhone: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  businessSeparator: {
    height: 12,
  },
});
