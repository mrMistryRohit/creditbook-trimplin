import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
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
import { Business, getBusinessesByUser } from "../database/businessRepo";
import {
  addCustomerFull,
  Customer,
  getCustomersByUser,
} from "../database/customerRepo";
import db from "../database/db";
import {
  addSupplier,
  getSuppliersByUser,
  Supplier,
} from "../database/supplierRepo";
import { appEvents } from "../utils/events";
import { compressImageToBase64 } from "../utils/imageHelper";

type SortOption = "date" | "name" | "amount";
type SortOrder = "asc" | "desc";
type HomeTab = "customers" | "suppliers";

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentBusiness, setCurrentBusiness } = useBusiness();

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
  const [businessSwitcherVisible, setBusinessSwitcherVisible] = useState(false);

  // Supplier fields (simple)
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierPhone, setNewSupplierPhone] = useState("");

  // ✅ Full customer creation fields
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");
  const [newCustomerPhotoUri, setNewCustomerPhotoUri] = useState<string | null>(
    null
  );
  const [newCustomerSmsEnabled, setNewCustomerSmsEnabled] = useState(true);
  const [isCompressingNewCustomerImage, setIsCompressingNewCustomerImage] =
    useState(false);

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // ✅ Image picker for customer creation
  const pickNewCustomerImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "Please allow access to your photos");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        setIsCompressingNewCustomerImage(true);
        const base64Image = await compressImageToBase64(result.assets[0].uri);
        setNewCustomerPhotoUri(base64Image);
        console.log("✅ Customer image compressed");
      } catch (error) {
        console.error("Error compressing image:", error);
        Alert.alert("Error", "Failed to process image");
      } finally {
        setIsCompressingNewCustomerImage(false);
      }
    }
  };

  const removeNewCustomerImage = () => {
    setNewCustomerPhotoUri(null);
  };

  const loadBusinesses = useCallback(async () => {
    if (!user?.id || typeof user.id !== "number") {
      console.log("⚠️ HomeScreen: Invalid user ID:", user?.id);
      return;
    }

    try {
      console.log("🔄 HomeScreen: Loading businesses for user:", user.id);
      const businessList = await getBusinessesByUser(user.id);
      console.log("✅ HomeScreen: Loaded", businessList.length, "businesses");
      setBusinesses(businessList);
    } catch (error) {
      console.error("❌ HomeScreen: Error loading businesses:", error);
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

    if (!user?.id || typeof user.id !== "number") {
      console.log("⚠️ HomeScreen: Invalid user ID:", user?.id);
      return;
    }

    if (!currentBusiness?.id) {
      console.log("⚠️ HomeScreen: No business selected");
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
    loadBusinesses();
  }, [loadData, loadBusinesses, reloadTrigger]);

  useEffect(() => {
    const testSyncColumns = async () => {
      try {
        const customerColumns = await db.getAllAsync(
          "PRAGMA table_info(customers)"
        );
        console.log("📊 Customer table columns:", customerColumns);

        const hasSyncColumns = customerColumns.some(
          (col: any) =>
            col.name === "firestore_id" || col.name === "sync_status"
        );

        if (hasSyncColumns) {
          console.log("✅ Sync columns verified in customers table");
        } else {
          console.log("❌ Sync columns NOT found in customers table");
        }
      } catch (error) {
        console.error("Error checking sync columns:", error);
      }
    };

    testSyncColumns();
  }, []);

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

  // ✅ Full customer creation with all fields
  const handleAddCustomer = async () => {
    if (!user?.id || typeof user.id !== "number" || !currentBusiness) {
      console.log("⚠️ Cannot add customer - missing data");
      return;
    }

    if (!newCustomerName.trim()) {
      Alert.alert("Validation", "Customer name is required");
      return;
    }

    try {
      await addCustomerFull(
        user.id,
        currentBusiness.id,
        newCustomerName.trim(),
        newCustomerPhone.trim() || undefined,
        newCustomerEmail.trim() || undefined,
        newCustomerAddress.trim() || undefined,
        newCustomerPhotoUri || undefined,
        newCustomerSmsEnabled ? 1 : 0
      );

      appEvents.emit("customerUpdated");
      setAddCustomerVisible(false);

      // Reset all fields
      setNewCustomerName("");
      setNewCustomerPhone("");
      setNewCustomerEmail("");
      setNewCustomerAddress("");
      setNewCustomerPhotoUri(null);
      setNewCustomerSmsEnabled(true);

      Alert.alert("Success", "Customer added successfully!");
      await loadData();
    } catch (error) {
      console.error("Error adding customer:", error);
      Alert.alert("Error", "Failed to add customer");
    }
  };

  const handleAddSupplier = async () => {
    if (!user?.id || typeof user.id !== "number" || !currentBusiness) {
      console.log("⚠️ Cannot add supplier - missing data");
      return;
    }

    if (!newSupplierName.trim()) {
      Alert.alert("Validation", "Supplier name is required");
      return;
    }

    await addSupplier(
      user.id,
      currentBusiness.id,
      newSupplierName.trim(),
      newSupplierPhone.trim()
    );
    appEvents.emit("supplierUpdated");
    setNewSupplierName("");
    setNewSupplierPhone("");
    setAddSupplierVisible(false);
  };

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

    const todayStr = new Date().toLocaleDateString("en-IN");
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

  const renderBusinessItem = ({ item }: { item: Business }) => {
    const isActive = item.id === currentBusiness?.id;

    return (
      <TouchableOpacity
        style={[styles.businessItem, isActive && styles.businessItemActive]}
        onPress={() => handleBusinessSwitch(item)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.businessItemIcon,
            isActive && styles.businessItemIconActive,
          ]}
        >
          <Ionicons
            name="briefcase"
            size={20}
            color={isActive ? "white" : colors.accent}
          />
        </View>
        <View style={styles.businessItemInfo}>
          <Text
            style={[
              styles.businessItemName,
              isActive && styles.businessItemNameActive,
            ]}
          >
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
        {/* Header with Business Switcher */}
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
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color={colors.textMuted}
                />
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.profileIcon}
            onPress={() => router.push("/settings")}
            activeOpacity={0.7}
          >
            <Ionicons name="person-circle" size={40} color={colors.accent} />
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Summary Card */}
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

        {/* Tab Switcher */}
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

        {/* Business Switcher Modal */}
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
                <TouchableOpacity
                  onPress={() => setBusinessSwitcherVisible(false)}
                >
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <FlatList
                data={businesses}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderBusinessItem}
                ItemSeparatorComponent={() => (
                  <View style={styles.businessSeparator} />
                )}
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

        {/* ✅ Full Customer Creation Modal */}
        <Modal
          visible={addCustomerVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setAddCustomerVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Add New Customer</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setAddCustomerVisible(false);
                      setNewCustomerName("");
                      setNewCustomerPhone("");
                      setNewCustomerEmail("");
                      setNewCustomerAddress("");
                      setNewCustomerPhotoUri(null);
                      setNewCustomerSmsEnabled(true);
                    }}
                  >
                    <Ionicons name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                {/* Photo Picker */}
                <TouchableOpacity
                  style={styles.imagePickerButton}
                  onPress={pickNewCustomerImage}
                  disabled={isCompressingNewCustomerImage}
                >
                  {isCompressingNewCustomerImage ? (
                    <View style={styles.imagePickerPlaceholder}>
                      <ActivityIndicator size="large" color={colors.accent} />
                      <Text style={styles.imagePickerText}>Compressing...</Text>
                    </View>
                  ) : newCustomerPhotoUri ? (
                    <View>
                      <Image
                        source={{ uri: newCustomerPhotoUri }}
                        style={styles.pickedImage}
                      />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={removeNewCustomerImage}
                      >
                        <Ionicons
                          name="close-circle"
                          size={24}
                          color={colors.danger}
                        />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.imagePickerPlaceholder}>
                      <Ionicons
                        name="camera"
                        size={32}
                        color={colors.textMuted}
                      />
                      <Text style={styles.imagePickerText}>
                        Add Photo (Optional)
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Name - Required */}
                <TextInput
                  style={styles.input}
                  value={newCustomerName}
                  onChangeText={setNewCustomerName}
                  placeholder="Customer Name *"
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                />

                {/* Phone */}
                <TextInput
                  style={styles.input}
                  value={newCustomerPhone}
                  onChangeText={setNewCustomerPhone}
                  placeholder="Phone Number (Optional)"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  maxLength={15}
                />

                {/* Email */}
                <TextInput
                  style={styles.input}
                  value={newCustomerEmail}
                  onChangeText={setNewCustomerEmail}
                  placeholder="Email Address (Optional)"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                {/* Address */}
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={newCustomerAddress}
                  onChangeText={setNewCustomerAddress}
                  placeholder="Address (Optional)"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={3}
                />

                {/* SMS Toggle */}
                <View style={styles.smsSettingRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.smsLabel}>SMS Notifications</Text>
                    <Text style={styles.smsSubLabel}>
                      Send payment reminders via SMS
                    </Text>
                  </View>
                  <Switch
                    value={newCustomerSmsEnabled}
                    onValueChange={setNewCustomerSmsEnabled}
                    trackColor={{ false: colors.border, true: colors.accent }}
                    thumbColor={
                      newCustomerSmsEnabled ? colors.primary : colors.textMuted
                    }
                  />
                </View>

                {/* Buttons */}
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => {
                      setAddCustomerVisible(false);
                      setNewCustomerName("");
                      setNewCustomerPhone("");
                      setNewCustomerEmail("");
                      setNewCustomerAddress("");
                      setNewCustomerPhotoUri(null);
                      setNewCustomerSmsEnabled(true);
                    }}
                  >
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      styles.saveButton,
                      (!newCustomerName.trim() ||
                        isCompressingNewCustomerImage) &&
                        styles.saveButtonDisabled,
                    ]}
                    onPress={handleAddCustomer}
                    disabled={
                      isCompressingNewCustomerImage || !newCustomerName.trim()
                    }
                  >
                    <Text style={styles.saveText}>Add Customer</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Add Supplier Modal (Simple) */}
        <Modal
          visible={addSupplierVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setAddSupplierVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Supplier</Text>
                <TouchableOpacity onPress={() => setAddSupplierVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Supplier name"
                placeholderTextColor={colors.textMuted}
                value={newSupplierName}
                onChangeText={setNewSupplierName}
              />
              <TextInput
                style={styles.input}
                placeholder="Phone (optional)"
                placeholderTextColor={colors.textMuted}
                value={newSupplierPhone}
                onChangeText={setNewSupplierPhone}
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
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 20,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  businessIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.inputBackground,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  businessNameContainer: { flex: 1 },
  businessLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "500",
    marginBottom: 2,
  },
  businessNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  businessName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
  },
  profileIcon: { marginLeft: 12 },
  summaryCard: { marginTop: 8, marginBottom: 16, padding: 16 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  summaryItem: { flex: 1 },
  summaryLabel: { color: colors.textMuted, fontSize: 13, marginBottom: 6 },
  summaryValue: { fontSize: 24, fontWeight: "700" },
  summaryBreakdown: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  due: { color: colors.accent },
  advance: { color: colors.danger },
  payable: { color: colors.danger },
  receivable: { color: colors.accent },
  buttonRow: { flexDirection: "row", gap: 8 },
  addButton: { flex: 1, marginTop: 4 },
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
  sortRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
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
  sortText: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
  sortTextActive: { color: "white" },
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
  tabButtonActive: { borderBottomColor: colors.accent },
  tabButtonText: { color: colors.textMuted, fontSize: 15, fontWeight: "600" },
  tabButtonTextActive: { color: colors.accent, fontWeight: "700" },
  listContent: { paddingBottom: 120 },
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
  itemName: { color: colors.text, fontSize: 16, fontWeight: "600" },
  balanceContainer: { alignItems: "flex-end", marginLeft: 16 },
  balance: { fontSize: 16, fontWeight: "700" },
  balanceLabel: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  separator: { height: 12 },
  emptyContainer: { paddingVertical: 60, alignItems: "center" },
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
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: "700" },
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
  textArea: { height: 80, textAlignVertical: "top" },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
    gap: 10,
  },
  modalButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  cancelButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveButton: { backgroundColor: colors.primary },
  saveButtonDisabled: { opacity: 0.5 },
  cancelText: { color: colors.textMuted, fontSize: 15 },
  saveText: { color: "white", fontSize: 15, fontWeight: "600" },
  businessList: { maxHeight: 400 },
  businessItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    gap: 12,
  },
  businessItemActive: {
    backgroundColor: colors.primary + "15",
    borderWidth: 1,
    borderColor: colors.accent,
  },
  businessItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.card,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  businessItemIconActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  businessItemInfo: { flex: 1 },
  businessItemName: { color: colors.text, fontSize: 16, fontWeight: "600" },
  businessItemNameActive: { color: colors.accent, fontWeight: "700" },
  businessItemPhone: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  businessSeparator: { height: 12 },
  itemSubtitleDue: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "700",
    color: "#FF4D4F",
  },
  itemSubtitleLast: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "700",
    color: "#5AC8FA",
  },
  itemSubtitleNone: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "700",
    color: "#F39C12",
  },
  // ✅ Image picker styles
  imagePickerButton: { alignItems: "center", marginBottom: 16 },
  imagePickerPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.inputBackground,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: "dashed",
  },
  imagePickerText: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },
  pickedImage: { width: 100, height: 100, borderRadius: 50 },
  removeImageButton: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: colors.card,
    borderRadius: 12,
  },
  smsSettingRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  smsLabel: { color: colors.text, fontSize: 15, fontWeight: "600" },
  smsSubLabel: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
});
