import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  BackHandler,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing, typography } from "../../constants/theme";
import PrimaryButton from "../components/PrimaryButton";
import Screen from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { useBusiness } from "../context/BusinessContext";
import {
  getInventoryByBusiness,
  InventoryItem,
  updateInventoryQuantity,
} from "../database/inventoryRepo";
import { appEvents } from "../utils/events";

export default function StockScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentBusiness } = useBusiness();
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const loadData = useCallback(async () => {
    console.log("🔄 StockScreen loadData called");
    console.log(
      "Current Business:",
      currentBusiness?.name,
      "ID:",
      currentBusiness?.id
    );

    if (!user || !currentBusiness) {
      console.log("⚠️ Missing user or business");
      return;
    }

    setItems([]);
    setFilteredItems([]);
    setLoading(true);

    try {
      const inventoryItems = await getInventoryByBusiness(currentBusiness.id);
      console.log(
        "✅ Loaded:",
        inventoryItems.length,
        "items for business:",
        currentBusiness.id
      );
      setItems(inventoryItems);
      setFilteredItems(inventoryItems);
    } catch (error) {
      console.error("❌ Error loading inventory:", error);
    } finally {
      setLoading(false);
    }
  }, [user, currentBusiness]);

  useEffect(() => {
    loadData();
  }, [loadData, reloadTrigger]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        router.replace("/settings");
        return true;
      }
    );
    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    const handler = () => {
      console.log("📣 Stock: Event received, triggering reload");
      setReloadTrigger((prev) => prev + 1);
    };

    appEvents.on("inventoryUpdated", handler);
    appEvents.on("businessSwitched", handler);

    return () => {
      appEvents.off("inventoryUpdated", handler);
      appEvents.off("businessSwitched", handler);
    };
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const filtered = items.filter(
        (item) =>
          item.item_name.toLowerCase().includes(query) ||
          (item.product_code && item.product_code.toLowerCase().includes(query))
      );
      setFilteredItems(filtered);
    } else {
      setFilteredItems(items);
    }
  }, [searchQuery, items]);

  const handleAddItem = () => {
    router.push("/add-stock-item" as any);
  };

  const handleItemPress = (item: InventoryItem) => {
    router.push({
      pathname: "/stock-item-detail" as any,
      params: { itemId: item.id.toString() },
    });
  };

  const handleQuantityChange = async (
    item: InventoryItem,
    increment: boolean
  ) => {
    const newQuantity = increment
      ? item.quantity + 1
      : Math.max(0, item.quantity - 1);

    try {
      await updateInventoryQuantity(item.id, newQuantity);
      appEvents.emit("inventoryUpdated");
    } catch (error) {
      console.error("Error updating quantity:", error);
      Alert.alert("Error", "Failed to update quantity");
    }
  };

  const renderItem = ({ item }: { item: InventoryItem }) => {
    const lowStock = item.quantity < 10;
    const outOfStock = item.quantity <= 0;

    return (
      <TouchableOpacity
        style={styles.itemCard}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.itemContent}>
          {item.photo_uri ? (
            <Image source={{ uri: item.photo_uri }} style={styles.itemImage} />
          ) : (
            <View style={[styles.itemImage, styles.placeholderImage]}>
              <Ionicons
                name="cube-outline"
                size={32}
                color={colors.textMuted}
              />
            </View>
          )}

          <View style={styles.itemInfo}>
            <Text style={styles.itemName} numberOfLines={1}>
              {item.item_name}
            </Text>
            {item.product_code && (
              <Text style={styles.itemCode} numberOfLines={1}>
                Code: {item.product_code}
              </Text>
            )}
            <Text style={styles.itemPrice}>
              MRP: ₹{item.mrp.toLocaleString("en-IN")} | Rate: ₹
              {item.rate.toLocaleString("en-IN")}
            </Text>
          </View>

          <View style={styles.quantityContainer}>
            <View
              style={[
                styles.quantityBadge,
                outOfStock && styles.outOfStockBadge,
                lowStock && !outOfStock && styles.lowStockBadge,
              ]}
            >
              <Text
                style={[
                  styles.quantityText,
                  outOfStock && styles.outOfStockText,
                  lowStock && !outOfStock && styles.lowStockText,
                ]}
              >
                {item.quantity}
              </Text>
              <Text style={styles.unitText}>{item.unit}</Text>
            </View>
            <View style={styles.quantityActions}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleQuantityChange(item, false);
                }}
              >
                <Ionicons name="remove" size={16} color={colors.danger} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleQuantityChange(item, true);
                }}
              >
                <Ionicons name="add" size={16} color={colors.accent} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {outOfStock && (
          <View style={styles.stockWarning}>
            <Ionicons name="warning" size={14} color={colors.danger} />
            <Text style={styles.stockWarningText}>Out of Stock</Text>
          </View>
        )}
        {lowStock && !outOfStock && (
          <View style={[styles.stockWarning, styles.lowStockWarning]}>
            <Ionicons name="alert-circle" size={14} color="#FF9800" />
            <Text style={[styles.stockWarningText, { color: "#FF9800" }]}>
              Low Stock
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.replace("/settings")}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Stock Management</Text>
            <Text style={styles.subtitle}>{currentBusiness?.name}</Text>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color={colors.textMuted}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search items by name or code..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <FlatList
          data={filteredItems}
          keyExtractor={(item) => `item-${item.id}`}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="cube-outline"
                  size={64}
                  color={colors.textMuted}
                />
                <Text style={styles.emptyText}>
                  {searchQuery
                    ? "No items found for your search."
                    : "No items in stock yet."}
                </Text>
                <Text style={styles.emptySubtext}>
                  {/* ✅ Fixed: Escaped quotes */}
                  Tap &quot;+ Add New Item&quot; to add your first item
                </Text>
              </View>
            ) : null
          }
        />

        <PrimaryButton
          label="+ Add New Item"
          onPress={handleAddItem}
          style={[styles.addButton, { bottom: insets.bottom + 20 }]}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 16,
  },
  backButton: {
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
  },
  listContent: {
    paddingBottom: 100,
  },
  itemCard: {
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    padding: 12,
  },
  itemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginRight: 12,
  },
  placeholderImage: {
    backgroundColor: colors.card,
    justifyContent: "center",
    alignItems: "center",
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  itemCode: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
  itemPrice: {
    color: colors.textMuted,
    fontSize: 13,
  },
  quantityContainer: {
    alignItems: "flex-end",
  },
  quantityBadge: {
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 8,
    minWidth: 60,
  },
  outOfStockBadge: {
    backgroundColor: "#FFE5E5",
  },
  lowStockBadge: {
    backgroundColor: "#FFF3E0",
  },
  quantityText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  outOfStockText: {
    color: colors.danger,
  },
  lowStockText: {
    color: "#FF9800",
  },
  unitText: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  quantityActions: {
    flexDirection: "row",
    gap: 8,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.card,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  stockWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  lowStockWarning: {
    borderTopColor: "#FF9800",
  },
  stockWarningText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "600",
  },
  separator: { height: 12 },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.body,
    textAlign: "center",
    marginTop: 16,
  },
  emptySubtext: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
  },
  addButton: {
    position: "absolute",
    // bottom: 20,
    left: 16,
    right: 16,
  },
});
