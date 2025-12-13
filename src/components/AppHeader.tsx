import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, typography } from "../../constants/theme";

interface Props {
  title: string;
  subtitle?: string;
}

export default function AppHeader({ title, subtitle }: Props) {
  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.appName}>CreditBook</Text>
        <Text style={styles.brand}>by Trimplin</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  appName: { color: colors.accent, fontSize: 18, fontWeight: "700" },
  brand: { color: colors.textMuted, fontSize: 12 },
  right: { alignItems: "flex-end" },
  title: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: "700",
  },
  subtitle: { color: colors.textMuted, fontSize: typography.small },
});
