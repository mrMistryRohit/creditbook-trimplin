import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
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
import { updateUserProfile } from "../database/userRepo";

export default function SettingsScreen() {
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();

  const [name, setName] = useState(user?.name || "");
  const [shopName, setShopName] = useState(user?.shop_name || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(user?.name || "");
    setShopName(user?.shop_name || "");
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    if (!name.trim()) {
      Alert.alert("Validation", "Name cannot be empty");
      return;
    }
    setSaving(true);
    try {
      await updateUserProfile(user.id, name.trim(), shopName.trim());
      await refreshUser();
      Alert.alert("Profile updated", "Your profile has been saved.");
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

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

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

        <Text style={styles.label}>Shop / Business name</Text>
        <TextInput
          style={styles.input}
          value={shopName}
          onChangeText={setShopName}
          placeholder="Shop name"
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

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingVertical: spacing.md },
  title: {
    fontSize: typography.heading,
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
  logoutButton: {
    backgroundColor: colors.danger,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  logoutText: {
    color: "white",
    fontSize: typography.body,
    fontWeight: "600",
  },
});
