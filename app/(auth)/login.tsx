import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";
import { useAuth } from "../../src/context/AuthContext";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      router.replace("/(tabs)");
    } else {
      Alert.alert("Login Failed", result.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>M A Financial Services</Text>
          {/* <Text style={styles.subtitle}>by Trimplin</Text> */}
          <Text style={styles.tagline}>Sign in to continue</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Signing in..." : "Sign In"}
            </Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don&apos;t have an account? </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
              <Text style={styles.link}>Register</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  title: {
    alignItems: "center",
    fontSize: 28,
    fontWeight: "900",
    color: colors.accent,
  },
  // subtitle: { fontSize: 16, color: colors.textMuted, marginTop: 4 },
  tagline: { fontSize: 14, color: colors.text, marginTop: spacing.md },
  form: { width: "100%" },
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
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "white", fontSize: typography.body, fontWeight: "600" },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.lg,
  },
  footerText: { color: colors.textMuted, fontSize: typography.small },
  link: { color: colors.accent, fontSize: typography.small, fontWeight: "600" },
});
