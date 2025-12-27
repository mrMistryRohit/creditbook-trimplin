import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  BackHandler,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";
import Card from "../components/Card";
import Screen from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { useBusiness } from "../context/BusinessContext";
import {
  addBusiness,
  Business,
  deleteBusiness,
  setDefaultBusiness,
  updateBusinessFull,
} from "../database/businessRepo";
import { updateUserProfile } from "../database/userRepo";
import { appEvents } from "../utils/events";

export default function SettingsScreen() {
  const { user, logout, refreshUser } = useAuth();
  const { businesses, currentBusiness, setCurrentBusiness, refreshBusinesses } =
    useBusiness();
  const router = useRouter();

  // User profile states
  const [name, setName] = useState(user?.name || "");
  const [saving, setSaving] = useState(false);

  // Business modals
  const [addBusinessVisible, setAddBusinessVisible] = useState(false);
  const [editBusinessVisible, setEditBusinessVisible] = useState(false);
  const [viewBusinessVisible, setViewBusinessVisible] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(
    null
  );
  const [menuVisibleForId, setMenuVisibleForId] = useState<number | null>(null);

  // Basic business form states
  const [businessName, setBusinessName] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");

  // Enhanced business form states
  const [businessType, setBusinessType] = useState("");
  const [category, setCategory] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [upiId, setUpiId] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [bankName, setBankName] = useState("");
  const [logoUri, setLogoUri] = useState<string | null>(null);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        router.replace("/(tabs)");
        return true;
      }
    );
    return () => backHandler.remove();
  }, [router]);

  useEffect(() => {
    setName(user?.name || "");
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    if (!name.trim()) {
      Alert.alert("Validation", "Name cannot be empty");
      return;
    }

    setSaving(true);
    try {
      await updateUserProfile(user.id, name.trim(), "");
      await refreshUser();
      Alert.alert("Success", "Your profile has been updated.");
    } catch (e) {
      console.error("Profile update error", e);
      Alert.alert("Error", "Could not update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  // Image Picker for Business Logo
  const pickBusinessImage = async () => {
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
      setLogoUri(result.assets[0].uri);
    }
  };

  const removeBusinessImage = () => {
    setLogoUri(null);
  };

  // Business Management Functions
  const handleAddBusiness = async () => {
    if (!user || !businessName.trim()) {
      Alert.alert("Validation", "Business name is required");
      return;
    }

    try {
      const newBusinessId = await addBusiness(
        user.id,
        businessName.trim(),
        businessDescription.trim(),
        businessPhone.trim(),
        businessAddress.trim()
      );

      // Update with enhanced fields
      await updateBusinessFull(newBusinessId, {
        name: businessName.trim(),
        description: businessDescription.trim(),
        phone: businessPhone.trim(),
        address: businessAddress.trim(),
        business_type: businessType.trim(),
        category: category.trim(),
        gst_number: gstNumber.trim(),
        pan_number: panNumber.trim(),
        website_url: websiteUrl.trim(),
        upi_id: upiId.trim(),
        bank_account_number: bankAccountNumber.trim(),
        bank_ifsc: bankIfsc.trim(),
        bank_name: bankName.trim(),
        logo_uri: logoUri || undefined,
      });

      await refreshBusinesses();
      appEvents.emit("businessUpdated");
      setAddBusinessVisible(false);
      clearBusinessForm();
      Alert.alert("Success", "Business has been added");
    } catch (error) {
      Alert.alert("Error", "Failed to add business");
      console.error(error);
    }
  };

  const openViewBusiness = (business: Business) => {
    setSelectedBusiness(business);
    setViewBusinessVisible(true);
    setMenuVisibleForId(null);
  };

  const openEditBusiness = (business: Business) => {
    setSelectedBusiness(business);
    setBusinessName(business.name);
    setBusinessDescription(business.description || "");
    setBusinessPhone(business.phone || "");
    setBusinessAddress(business.address || "");
    setBusinessType(business.business_type || "");
    setCategory(business.category || "");
    setGstNumber(business.gst_number || "");
    setPanNumber(business.pan_number || "");
    setWebsiteUrl(business.website_url || "");
    setUpiId(business.upi_id || "");
    setBankAccountNumber(business.bank_account_number || "");
    setBankIfsc(business.bank_ifsc || "");
    setBankName(business.bank_name || "");
    setLogoUri(business.logo_uri || null);
    setEditBusinessVisible(true);
    setMenuVisibleForId(null);
  };

  const handleEditBusiness = async () => {
    if (!selectedBusiness || !businessName.trim()) {
      Alert.alert("Validation", "Business name is required");
      return;
    }

    try {
      await updateBusinessFull(selectedBusiness.id, {
        name: businessName.trim(),
        description: businessDescription.trim(),
        phone: businessPhone.trim(),
        address: businessAddress.trim(),
        business_type: businessType.trim(),
        category: category.trim(),
        gst_number: gstNumber.trim(),
        pan_number: panNumber.trim(),
        website_url: websiteUrl.trim(),
        upi_id: upiId.trim(),
        bank_account_number: bankAccountNumber.trim(),
        bank_ifsc: bankIfsc.trim(),
        bank_name: bankName.trim(),
        logo_uri: logoUri || undefined, // ✅ FIXED
      });

      await refreshBusinesses();
      appEvents.emit("businessUpdated");
      setEditBusinessVisible(false);
      clearBusinessForm();
      Alert.alert("Success", "Business has been updated");
    } catch (err) {
      Alert.alert("Error", "Failed to update business");
      console.error(err);
    }
  };

  const handleDeleteBusiness = (business: Business) => {
    setMenuVisibleForId(null);
    if (businesses.length === 1) {
      Alert.alert("Cannot Delete", "You must have at least one business");
      return;
    }

    Alert.alert(
      "Delete Business",
      `Are you sure you want to delete "${business.name}"? All customers, suppliers, transactions, and inventory will be permanently deleted.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteBusiness(business.id);
              await refreshBusinesses();
              appEvents.emit("businessUpdated");
              Alert.alert("Success", "Business has been deleted");
            } catch (err: any) {
              Alert.alert(
                "Cannot Delete",
                err.message || "Failed to delete business"
              );
            }
          },
        },
      ]
    );
  };

  const handleStockManagement = (business: Business) => {
    setMenuVisibleForId(null);
    if (currentBusiness?.id !== business.id) {
      setCurrentBusiness(business);
    }
    router.push("/stock" as any);
  };

  const handleSetDefault = async (business: Business) => {
    if (!user) return;
    try {
      await setDefaultBusiness(user.id, business.id);
      await refreshBusinesses();
      appEvents.emit("businessUpdated");
      Alert.alert("Success", `"${business.name}" is now your default business`);
    } catch (error) {
      Alert.alert("Error", "Failed to set default business");
    }
  };

  const handleSwitchBusiness = (business: Business) => {
    setCurrentBusiness(business);
    Alert.alert("Switched", `Now viewing "${business.name}"`);
  };

  const clearBusinessForm = () => {
    setBusinessName("");
    setBusinessDescription("");
    setBusinessPhone("");
    setBusinessAddress("");
    setBusinessType("");
    setCategory("");
    setGstNumber("");
    setPanNumber("");
    setWebsiteUrl("");
    setUpiId("");
    setBankAccountNumber("");
    setBankIfsc("");
    setBankName("");
    setLogoUri(null);
    setSelectedBusiness(null);
  };

  const toggleMenu = (businessId: number) => {
    setMenuVisibleForId(menuVisibleForId === businessId ? null : businessId);
  };

  const renderBusiness = ({ item }: { item: Business }) => {
    const isActive = currentBusiness?.id === item.id;
    const isDefault = item.is_default === 1;
    const menuOpen = menuVisibleForId === item.id;

    return (
      <Card
        style={[styles.businessCard, isActive && styles.businessCardActive]}
      >
        <View style={styles.businessHeader}>
          <View style={styles.businessInfo}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              {item.logo_uri && (
                <Image
                  source={{ uri: item.logo_uri }}
                  style={styles.businessLogoSmall}
                />
              )}
              <Text style={styles.businessName}>{item.name}</Text>
            </View>
            {item.description && (
              <Text style={styles.businessDescription}>{item.description}</Text>
            )}
            {isDefault && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultBadgeText}>Default</Text>
              </View>
            )}
          </View>

          {/* Three Dot Menu Button */}
          <TouchableOpacity
            onPress={() => toggleMenu(item.id)}
            style={styles.menuButton}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Dropdown Menu */}
        {menuOpen && (
          <View style={styles.dropdownMenu}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => openViewBusiness(item)}
            >
              <Ionicons name="eye-outline" size={18} color={colors.text} />
              <Text style={styles.menuItemText}>View Details</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => openEditBusiness(item)}
            >
              <Ionicons name="pencil-outline" size={18} color={colors.text} />
              <Text style={styles.menuItemText}>Edit</Text>
            </TouchableOpacity>

            {isActive && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleStockManagement(item)}
              >
                <Ionicons name="cube-outline" size={18} color={colors.text} />
                <Text style={styles.menuItemText}>Stock Management</Text>
              </TouchableOpacity>
            )}

            {businesses.length > 1 && (
              <TouchableOpacity
                style={[styles.menuItem, styles.menuItemLast]}
                onPress={() => handleDeleteBusiness(item)}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={colors.danger}
                />
                <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>
                  Delete
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {(item.phone || item.address) && (
          <View style={styles.businessDetails}>
            {item.phone && (
              <Text style={styles.businessDetailText}>📞 {item.phone}</Text>
            )}
            {item.address && (
              <Text style={styles.businessDetailText}>📍 {item.address}</Text>
            )}
          </View>
        )}

        <View style={styles.businessFooter}>
          {!isActive && (
            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => handleSwitchBusiness(item)}
            >
              <Text style={styles.switchButtonText}>Switch to this</Text>
            </TouchableOpacity>
          )}
          {!isDefault && (
            <TouchableOpacity
              style={styles.defaultButton}
              onPress={() => handleSetDefault(item)}
            >
              <Text style={styles.defaultButtonText}>Set as default</Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    );
  };

  return (
    <Screen>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <TouchableOpacity
            onPress={() => router.replace("/(tabs)")}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>Settings</Text>
            <Text style={styles.subtitle}>
              Manage your profile & businesses
            </Text>
          </View>
        </View>

        {/* Profile Section */}
        <Card style={styles.profileCard}>
          <Text style={styles.cardTitle}>Profile</Text>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={colors.textMuted}
          />
          <Text style={styles.label}>Email</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveText}>
              {saving ? "Saving..." : "Save changes"}
            </Text>
          </TouchableOpacity>
        </Card>

        {/* Business Management Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Businesses</Text>
            <TouchableOpacity
              style={styles.addBusinessButton}
              onPress={() => {
                clearBusinessForm();
                setAddBusinessVisible(true);
              }}
            >
              <Ionicons name="add-circle" size={20} color={colors.accent} />
              <Text style={styles.addBusinessText}>Add Business</Text>
            </TouchableOpacity>
          </View>

          {currentBusiness && (
            <View style={styles.currentBusinessBanner}>
              <Ionicons name="briefcase" size={16} color={colors.accent} />
              <Text style={styles.currentBusinessText}>
                Currently viewing:{" "}
                <Text style={styles.currentBusinessName}>
                  {currentBusiness.name}
                </Text>
              </Text>
            </View>
          )}

          <FlatList
            data={businesses}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderBusiness}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No businesses found</Text>
            }
          />
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* View Business Details Modal */}
      <Modal
        visible={viewBusinessVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setViewBusinessVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Business Details</Text>

              {selectedBusiness?.logo_uri && (
                <Image
                  source={{ uri: selectedBusiness.logo_uri }}
                  style={styles.businessLogoLarge}
                />
              )}

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Business Name</Text>
                <Text style={styles.detailValue}>{selectedBusiness?.name}</Text>
              </View>

              {selectedBusiness?.description && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={styles.detailValue}>
                    {selectedBusiness.description}
                  </Text>
                </View>
              )}

              {selectedBusiness?.business_type && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Business Type</Text>
                  <Text style={styles.detailValue}>
                    {selectedBusiness.business_type}
                  </Text>
                </View>
              )}

              {selectedBusiness?.category && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Category</Text>
                  <Text style={styles.detailValue}>
                    {selectedBusiness.category}
                  </Text>
                </View>
              )}

              {selectedBusiness?.phone && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Phone</Text>
                  <Text style={styles.detailValue}>
                    {selectedBusiness.phone}
                  </Text>
                </View>
              )}

              {selectedBusiness?.address && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Address</Text>
                  <Text style={styles.detailValue}>
                    {selectedBusiness.address}
                  </Text>
                </View>
              )}

              {selectedBusiness?.gst_number && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>GST Number</Text>
                  <Text style={styles.detailValue}>
                    {selectedBusiness.gst_number}
                  </Text>
                </View>
              )}

              {selectedBusiness?.pan_number && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>PAN Number</Text>
                  <Text style={styles.detailValue}>
                    {selectedBusiness.pan_number}
                  </Text>
                </View>
              )}

              {selectedBusiness?.website_url && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Website</Text>
                  <Text style={styles.detailValue}>
                    {selectedBusiness.website_url}
                  </Text>
                </View>
              )}

              {selectedBusiness?.upi_id && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>UPI ID</Text>
                  <Text style={styles.detailValue}>
                    {selectedBusiness.upi_id}
                  </Text>
                </View>
              )}

              {selectedBusiness?.bank_account_number && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Bank Account</Text>
                  <Text style={styles.detailValue}>
                    {selectedBusiness.bank_account_number}
                  </Text>
                </View>
              )}

              {selectedBusiness?.bank_ifsc && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>IFSC Code</Text>
                  <Text style={styles.detailValue}>
                    {selectedBusiness.bank_ifsc}
                  </Text>
                </View>
              )}

              {selectedBusiness?.bank_name && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Bank Name</Text>
                  <Text style={styles.detailValue}>
                    {selectedBusiness.bank_name}
                  </Text>
                </View>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setViewBusinessVisible(false)}
                >
                  <Text style={styles.cancelText}>Close</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Business Modal */}
      <Modal
        visible={addBusinessVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddBusinessVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Add Business</Text>

              {/* Logo Picker */}
              <TouchableOpacity
                style={styles.imagePickerButton}
                onPress={pickBusinessImage}
              >
                {logoUri ? (
                  <View>
                    <Image
                      source={{ uri: logoUri }}
                      style={styles.pickedImage}
                    />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={removeBusinessImage}
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
                      Add Business Logo
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TextInput
                style={styles.modalInput}
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="Business Name *"
                placeholderTextColor={colors.textMuted}
              />
              <TextInput
                style={[styles.modalInput, styles.textArea]}
                value={businessDescription}
                onChangeText={setBusinessDescription}
                placeholder="Description"
                placeholderTextColor={colors.textMuted}
                multiline
              />
              <TextInput
                style={styles.modalInput}
                value={businessType}
                onChangeText={setBusinessType}
                placeholder="Business Type (e.g., Retail, Services)"
                placeholderTextColor={colors.textMuted}
              />
              <TextInput
                style={styles.modalInput}
                value={category}
                onChangeText={setCategory}
                placeholder="Category (e.g., Financial Services)"
                placeholderTextColor={colors.textMuted}
              />
              <TextInput
                style={styles.modalInput}
                value={businessPhone}
                onChangeText={setBusinessPhone}
                placeholder="Phone Number"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
              <TextInput
                style={[styles.modalInput, styles.textArea]}
                value={businessAddress}
                onChangeText={setBusinessAddress}
                placeholder="Address"
                placeholderTextColor={colors.textMuted}
                multiline
              />
              <TextInput
                style={styles.modalInput}
                value={gstNumber}
                onChangeText={setGstNumber}
                placeholder="GST Number"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
              />
              <TextInput
                style={styles.modalInput}
                value={panNumber}
                onChangeText={setPanNumber}
                placeholder="PAN Number"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
              />
              <TextInput
                style={styles.modalInput}
                value={websiteUrl}
                onChangeText={setWebsiteUrl}
                placeholder="Website URL"
                placeholderTextColor={colors.textMuted}
                keyboardType="url"
                autoCapitalize="none"
              />
              <TextInput
                style={styles.modalInput}
                value={upiId}
                onChangeText={setUpiId}
                placeholder="UPI ID"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />
              <TextInput
                style={styles.modalInput}
                value={bankAccountNumber}
                onChangeText={setBankAccountNumber}
                placeholder="Bank Account Number"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />
              <TextInput
                style={styles.modalInput}
                value={bankIfsc}
                onChangeText={setBankIfsc}
                placeholder="Bank IFSC Code"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
              />
              <TextInput
                style={styles.modalInput}
                value={bankName}
                onChangeText={setBankName}
                placeholder="Bank Name"
                placeholderTextColor={colors.textMuted}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setAddBusinessVisible(false);
                    clearBusinessForm();
                  }}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalSaveButton]}
                  onPress={handleAddBusiness}
                >
                  <Text style={styles.modalSaveText}>Add</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Business Modal */}
      <Modal
        visible={editBusinessVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditBusinessVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Edit Business</Text>

              {/* Logo Picker */}
              <TouchableOpacity
                style={styles.imagePickerButton}
                onPress={pickBusinessImage}
              >
                {logoUri ? (
                  <View>
                    <Image
                      source={{ uri: logoUri }}
                      style={styles.pickedImage}
                    />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={removeBusinessImage}
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
                      Add Business Logo
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TextInput
                style={styles.modalInput}
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="Business Name *"
                placeholderTextColor={colors.textMuted}
              />
              <TextInput
                style={[styles.modalInput, styles.textArea]}
                value={businessDescription}
                onChangeText={setBusinessDescription}
                placeholder="Description"
                placeholderTextColor={colors.textMuted}
                multiline
              />
              <TextInput
                style={styles.modalInput}
                value={businessType}
                onChangeText={setBusinessType}
                placeholder="Business Type (e.g., Retail, Services)"
                placeholderTextColor={colors.textMuted}
              />
              <TextInput
                style={styles.modalInput}
                value={category}
                onChangeText={setCategory}
                placeholder="Category (e.g., Financial Services)"
                placeholderTextColor={colors.textMuted}
              />
              <TextInput
                style={styles.modalInput}
                value={businessPhone}
                onChangeText={setBusinessPhone}
                placeholder="Phone Number"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
              <TextInput
                style={[styles.modalInput, styles.textArea]}
                value={businessAddress}
                onChangeText={setBusinessAddress}
                placeholder="Address"
                placeholderTextColor={colors.textMuted}
                multiline
              />
              <TextInput
                style={styles.modalInput}
                value={gstNumber}
                onChangeText={setGstNumber}
                placeholder="GST Number"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
              />
              <TextInput
                style={styles.modalInput}
                value={panNumber}
                onChangeText={setPanNumber}
                placeholder="PAN Number"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
              />
              <TextInput
                style={styles.modalInput}
                value={websiteUrl}
                onChangeText={setWebsiteUrl}
                placeholder="Website URL"
                placeholderTextColor={colors.textMuted}
                keyboardType="url"
                autoCapitalize="none"
              />
              <TextInput
                style={styles.modalInput}
                value={upiId}
                onChangeText={setUpiId}
                placeholder="UPI ID"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />
              <TextInput
                style={styles.modalInput}
                value={bankAccountNumber}
                onChangeText={setBankAccountNumber}
                placeholder="Bank Account Number"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />
              <TextInput
                style={styles.modalInput}
                value={bankIfsc}
                onChangeText={setBankIfsc}
                placeholder="Bank IFSC Code"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
              />
              <TextInput
                style={styles.modalInput}
                value={bankName}
                onChangeText={setBankName}
                placeholder="Bank Name"
                placeholderTextColor={colors.textMuted}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setEditBusinessVisible(false);
                    clearBusinessForm();
                  }}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalSaveButton]}
                  onPress={handleEditBusiness}
                >
                  <Text style={styles.modalSaveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.md, // Add this if your Screen doesn't have default padding
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  backButton: { marginRight: 12, padding: 4 },
  headerText: { flex: 1 },
  title: { color: colors.text, fontSize: 28, fontWeight: "700" },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.small,
    marginTop: 2,
  },
  profileCard: { marginBottom: spacing.md },
  cardTitle: {
    fontSize: typography.subheading,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  label: {
    color: colors.textMuted,
    fontSize: typography.small,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.inputBackground,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: typography.body,
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  email: { color: colors.text, fontSize: typography.body, marginTop: 4 },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  saveDisabled: { opacity: 0.6 },
  saveText: { color: "white", fontSize: typography.body, fontWeight: "600" },
  section: { marginVertical: spacing.md },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: 20, fontWeight: "700", color: colors.text },
  addBusinessButton: { flexDirection: "row", alignItems: "center", gap: 6 },
  addBusinessText: { color: colors.accent, fontSize: 14, fontWeight: "600" },
  currentBusinessBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.inputBackground,
    padding: 12,
    borderRadius: 10,
    marginBottom: spacing.md,
    gap: 8,
  },
  currentBusinessText: { color: colors.textMuted, fontSize: 13 },
  currentBusinessName: { color: colors.accent, fontWeight: "600" },
  businessCard: {
    backgroundColor: colors.inputBackground,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  businessCardActive: { borderColor: colors.accent },
  businessHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  businessInfo: { flex: 1 },
  businessName: { color: colors.text, fontSize: 16, fontWeight: "700" },
  businessDescription: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  businessLogoSmall: { width: 32, height: 32, borderRadius: 16 },
  businessLogoLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: "center",
    marginBottom: 16,
  },
  defaultBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  defaultBadgeText: { color: "white", fontSize: 11, fontWeight: "600" },
  menuButton: { padding: 6 },
  dropdownMenu: {
    backgroundColor: colors.card,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuItemLast: { borderBottomWidth: 0 },
  menuItemText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 12,
  },
  menuItemTextDanger: { color: colors.danger },
  businessDetails: { marginTop: 8, gap: 4 },
  businessDetailText: { color: colors.textMuted, fontSize: 12 },
  businessFooter: { flexDirection: "row", gap: 8, marginTop: 12 },
  switchButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  switchButtonText: { color: "white", fontSize: 13, fontWeight: "600" },
  defaultButton: {
    flex: 1,
    backgroundColor: colors.card,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  defaultButtonText: { color: colors.text, fontSize: 13, fontWeight: "600" },
  separator: { height: 12 },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 24,
  },
  logoutButton: {
    backgroundColor: colors.danger,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: "center",
    marginTop: spacing.lg,
    marginBottom: 40,
  },
  logoutText: { color: "white", fontSize: typography.body, fontWeight: "600" },
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
    maxHeight: "80%",
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },
  modalInput: {
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
  imagePickerButton: {
    alignItems: "center",
    marginBottom: 16,
  },
  imagePickerPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.inputBackground,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: "dashed",
  },
  imagePickerText: { color: colors.textMuted, fontSize: 12, marginTop: 8 },
  pickedImage: { width: 120, height: 120, borderRadius: 60 },
  removeImageButton: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: colors.card,
    borderRadius: 12,
  },
  detailRow: { marginBottom: 16 },
  detailLabel: { color: colors.textMuted, fontSize: 12, marginBottom: 4 },
  detailValue: { color: colors.text, fontSize: 15, fontWeight: "500" },
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
  modalSaveButton: { backgroundColor: colors.primary },
  cancelText: { color: colors.textMuted, fontSize: 15 },
  modalSaveText: { color: "white", fontSize: 15, fontWeight: "600" },
});
