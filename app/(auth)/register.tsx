import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";
import { useAuth } from "../../src/context/AuthContext";

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [shopName, setShopName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    const result = await register(name, email, password, shopName);
    setLoading(false);

    if (result.success) {
      router.replace("/(tabs)");
    } else {
      Alert.alert("Registration Failed", result.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join M A Financial Services</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Full Name *"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          <TextInput
            style={styles.input}
            placeholder="Email *"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            placeholder="Shop/Business Name (optional)"
            placeholderTextColor={colors.textMuted}
            value={shopName}
            onChangeText={setShopName}
          />

          <TextInput
            style={styles.input}
            placeholder="Password *"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TextInput
            style={styles.input}
            placeholder="Confirm Password *"
            placeholderTextColor={colors.textMuted}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Creating Account..." : "Create Account"}
            </Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.link}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl * 2,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.accent,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  form: {
    width: "100%",
  },
  input: {
    backgroundColor: colors.inputBackground,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
    fontSize: typography.body,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "white",
    fontSize: typography.body,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.lg,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: typography.small,
  },
  link: {
    color: colors.accent,
    fontSize: typography.small,
    fontWeight: "600",
  },
});
