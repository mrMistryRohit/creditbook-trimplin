import { StatusBar } from "expo-status-bar";
import React from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../constants/theme";

interface ScreenProps {
  children: React.ReactNode;
  edges?: ("top" | "bottom" | "left" | "right")[];
}

export default function Screen({
  children,
  edges = ["top", "left", "right"],
}: ScreenProps) {
  return (
    <>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea} edges={edges}>
        <View style={styles.container}>{children}</View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
});
