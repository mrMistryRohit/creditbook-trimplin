import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
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
  updateBusiness,
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
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(
    null
  );
  const [menuVisibleForId, setMenuVisibleForId] = useState<number | null>(null);

  // Business form states
  const [businessName, setBusinessName] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");

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

  // Business Management Functions
  const handleAddBusiness = async () => {
    if (!user || !businessName.trim()) {
      Alert.alert("Validation", "Business name is required");
      return;
    }

    try {
      await addBusiness(
        user.id,
        businessName.trim(),
        businessDescription.trim(),
        businessPhone.trim(),
        businessAddress.trim()
      );
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

  const openEditBusiness = (business: Business) => {
    setSelectedBusiness(business);
    setBusinessName(business.name);
    setBusinessDescription(business.description || "");
    setBusinessPhone(business.phone || "");
    setBusinessAddress(business.address || "");
    setEditBusinessVisible(true);
    setMenuVisibleForId(null);
  };

  const handleEditBusiness = async () => {
    if (!selectedBusiness || !businessName.trim()) {
      Alert.alert("Validation", "Business name is required");
      return;
    }

    try {
      await updateBusiness(
        selectedBusiness.id,
        businessName.trim(),
        businessDescription.trim(),
        businessPhone.trim(),
        businessAddress.trim()
      );
      await refreshBusinesses();
      appEvents.emit("businessUpdated");
      setEditBusinessVisible(false);
      clearBusinessForm();
      Alert.alert("Success", "Business has been updated");
    } catch (error) {
      Alert.alert("Error", "Failed to update business");
      console.error(error);
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

    // Switch to this business if not already current
    if (currentBusiness?.id !== business.id) {
      setCurrentBusiness(business);
    }

    // Navigate to stock screen
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
      <View
        style={[styles.businessCard, isActive && styles.businessCardActive]}
      >
        <View style={styles.businessHeader}>
          <View style={styles.businessInfo}>
            <Text style={styles.businessName}>{item.name}</Text>
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
            style={styles.menuButton}
            onPress={() => toggleMenu(item.id)}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Dropdown Menu */}
        {menuOpen && (
          <View style={styles.dropdownMenu}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => openEditBusiness(item)}
            >
              <Ionicons name="create-outline" size={18} color={colors.accent} />
              <Text style={styles.menuItemText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleStockManagement(item)}
            >
              <Ionicons name="cube-outline" size={18} color={colors.primary} />
              <Text style={styles.menuItemText}>Stock Management</Text>
            </TouchableOpacity>

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
      </View>
    );
  };

  return (
    <Screen>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
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
              <Ionicons name="add-circle" size={24} color={colors.accent} />
              <Text style={styles.addBusinessText}>Add Business</Text>
            </TouchableOpacity>
          </View>

          {currentBusiness && (
            <View style={styles.currentBusinessBanner}>
              <Ionicons name="business" size={20} color={colors.accent} />
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

      {/* Add Business Modal */}
      <Modal
        visible={addBusinessVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddBusinessVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Business</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Business Name *"
              placeholderTextColor={colors.textMuted}
              value={businessName}
              onChangeText={setBusinessName}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Description (optional)"
              placeholderTextColor={colors.textMuted}
              value={businessDescription}
              onChangeText={setBusinessDescription}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Phone (optional)"
              placeholderTextColor={colors.textMuted}
              value={businessPhone}
              onChangeText={setBusinessPhone}
              keyboardType="phone-pad"
            />
            <TextInput
              style={[styles.modalInput, styles.textArea]}
              placeholder="Address (optional)"
              placeholderTextColor={colors.textMuted}
              value={businessAddress}
              onChangeText={setBusinessAddress}
              multiline
              numberOfLines={3}
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
          </View>
        </View>
      </Modal>

      {/* Edit Business Modal */}
      <Modal
        visible={editBusinessVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditBusinessVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Business</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Business Name *"
              placeholderTextColor={colors.textMuted}
              value={businessName}
              onChangeText={setBusinessName}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Description (optional)"
              placeholderTextColor={colors.textMuted}
              value={businessDescription}
              onChangeText={setBusinessDescription}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Phone (optional)"
              placeholderTextColor={colors.textMuted}
              value={businessPhone}
              onChangeText={setBusinessPhone}
              keyboardType="phone-pad"
            />
            <TextInput
              style={[styles.modalInput, styles.textArea]}
              placeholder="Address (optional)"
              placeholderTextColor={colors.textMuted}
              value={businessAddress}
              onChangeText={setBusinessAddress}
              multiline
              numberOfLines={3}
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
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingVertical: spacing.md },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
  },
  profileCard: { marginVertical: spacing.md },
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
  email: {
    color: colors.text,
    fontSize: typography.body,
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  saveDisabled: { opacity: 0.6 },
  saveText: {
    color: "white",
    fontSize: typography.body,
    fontWeight: "600",
  },
  section: {
    marginVertical: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  addBusinessButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  addBusinessText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "600",
  },
  currentBusinessBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.inputBackground,
    padding: 12,
    borderRadius: 10,
    marginBottom: spacing.md,
    gap: 8,
  },
  currentBusinessText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  currentBusinessName: {
    color: colors.accent,
    fontWeight: "600",
  },
  businessCard: {
    backgroundColor: colors.inputBackground,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  businessCardActive: {
    borderColor: colors.accent,
  },
  businessHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  businessDescription: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  defaultBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  defaultBadgeText: {
    color: "white",
    fontSize: 11,
    fontWeight: "600",
  },
  menuButton: {
    padding: 6,
  },
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
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 12,
  },
  menuItemTextDanger: {
    color: colors.danger,
  },
  businessDetails: {
    marginTop: 8,
    gap: 4,
  },
  businessDetailText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  businessFooter: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  switchButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  switchButtonText: {
    color: "white",
    fontSize: 13,
    fontWeight: "600",
  },
  defaultButton: {
    flex: 1,
    backgroundColor: colors.card,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  defaultButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
  },
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
  logoutText: {
    color: "white",
    fontSize: typography.body,
    fontWeight: "600",
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
  textArea: {
    height: 80,
    textAlignVertical: "top",
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
  modalSaveButton: {
    backgroundColor: colors.primary,
  },
  cancelText: { color: colors.textMuted, fontSize: 15 },
  modalSaveText: { color: "white", fontSize: 15, fontWeight: "600" },
});
