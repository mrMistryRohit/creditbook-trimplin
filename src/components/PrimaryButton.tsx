import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { colors, radius, typography } from "../../constants/theme";

interface Props {
  label: string;
  onPress: () => void;
  style?: any;
}

export default function PrimaryButton({ label, onPress, style }: Props) {
  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: "white",
    fontSize: typography.body,
    fontWeight: "600",
  },
});
