import React from "react";
import { StyleSheet, View } from "react-native";
import { colors, radius } from "../../constants/theme";

interface Props {
  children: React.ReactNode;
  style?: any;
}

export default function Card({ children, style }: Props) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
