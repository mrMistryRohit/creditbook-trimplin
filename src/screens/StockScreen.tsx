// src/screens/StockScreen.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  BackHandler,
  FlatList,
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
import db from "../database/db"; // ✅ ADD THIS
import {
  getInventoryByBusiness,
  InventoryItem,
  updateInventoryQuantity,
} from "../database/inventoryRepo";
import SyncService from "../services/SyncService"; // ✅ ADD THIS
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

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ✅ ADD: Debug function
  useEffect(() => {
    const checkBusinesses = async () => {
      if (!currentBusiness) return;

      const businesses = await db.getAllAsync(
        `SELECT id, name, firestore_id FROM businesses`,
        []
      );
      console.log("📊 All businesses:", JSON.stringify(businesses, null, 2));
      console.log(
        "📊 Current business:",
        JSON.stringify(currentBusiness, null, 2)
      );
    };

    checkBusinesses();
  }, [currentBusiness]);

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

    setLoading(true);

    try {
      // ✅ ADD: Check raw database
      const allItems = await db.getAllAsync(
        `SELECT id, item_name, firestore_id, business_id, 
         CASE WHEN photo_uri IS NULL THEN 'null' 
              WHEN length(photo_uri) > 50 THEN substr(photo_uri, 1, 50) || '...' 
              ELSE photo_uri 
         END as photo_preview 
         FROM inventory`,
        []
      );
      console.log("📊 ALL inventory in DB:", JSON.stringify(allItems, null, 2));

      const inventoryItems = await getInventoryByBusiness(currentBusiness.id);
      console.log(
        "✅ Loaded:",
        inventoryItems.length,
        "items for business:",
        currentBusiness.id
      );

      // ✅ ADD: Log first item details
      if (inventoryItems.length > 0) {
        console.log("📸 First item:", inventoryItems[0].item_name);
        console.log(
          "📸 First item photo_uri length:",
          inventoryItems[0].photo_uri?.length || 0
        );
        console.log(
          "📸 First item photo_uri preview:",
          inventoryItems[0].photo_uri?.substring(0, 50)
        );
      }

      // Deduplicate items by firestore_id or id
      const uniqueItems = inventoryItems.reduce((acc, item) => {
        const key = item.firestore_id || `local-${item.id}`;
        if (!acc.has(key)) {
          acc.set(key, item);
        }
        return acc;
      }, new Map<string, InventoryItem>());

      const deduplicatedItems = Array.from(uniqueItems.values());
      console.log(
        `📊 Deduplicated: ${inventoryItems.length} → ${deduplicatedItems.length} items`
      );

      setItems(deduplicatedItems);
      setFilteredItems(deduplicatedItems);
    } catch (error) {
      console.error("❌ Error loading inventory:", error);
    } finally {
      setLoading(false);
    }
  }, [user, currentBusiness]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        router.replace("/settings");
        return true;
      }
    );
    return () => backHandler.remove();
  }, [router]);

  useEffect(() => {
    const debouncedReload = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        console.log("📣 Stock: Event received, triggering reload");
        loadData();
      }, 500);
    };

    appEvents.on("inventoryUpdated", debouncedReload);
    appEvents.on("businessSwitched", loadData);
    appEvents.on("syncCompleted", debouncedReload);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      appEvents.off("inventoryUpdated", debouncedReload);
      appEvents.off("businessSwitched", loadData);
      appEvents.off("syncCompleted", debouncedReload);
    };
  }, [loadData]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const filtered = items.filter(
        (item) =>
          item.item_name.toLowerCase().includes(query) ||
          item.product_code?.toLowerCase().includes(query)
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

      // Update local state immediately for better UX
      setItems((prevItems) =>
        prevItems.map((i) =>
          i.id === item.id ? { ...i, quantity: newQuantity } : i
        )
      );

      appEvents.emit("inventoryUpdated");
    } catch (error) {
      console.error("Error updating quantity:", error);
      Alert.alert("Error", "Failed to update quantity");
      loadData();
    }
  };

  // ✅ ADD: Force sync button
  const handleForceSync = async () => {
    console.log("🔄 Force syncing...");
    if (user) {
      try {
        await SyncService.syncNow(user.firebaseUid);
        Alert.alert("Success", "Sync completed!");
        await loadData();
      } catch (error) {
        console.error("Sync error:", error);
        Alert.alert("Error", "Sync failed");
      }
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
          {/* ✅ Image rendering with base64 support */}
          {item.photo_uri ? (
            <Image
              source={{ uri: item.photo_uri }}
              style={styles.itemImage}
              resizeMode="cover"
              onError={(error) => {
                console.error("❌ Image load error:", error.nativeEvent.error);
                console.log("Photo URI length:", item.photo_uri?.length);
              }}
            />
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

  const EmptyListComponent = () =>
    loading ? null : (
      <View style={styles.emptyContainer}>
        <Ionicons name="cube-outline" size={64} color={colors.textMuted} />
        <Text style={styles.emptyText}>
          {searchQuery
            ? "No items found for your search."
            : "No items in stock yet."}
        </Text>
        <Text style={styles.emptySubtext}>
          Tap &quot;+ Add New Item&quot; to add your first item
        </Text>
      </View>
    );

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
          {/* ✅ ADD: Debug sync button */}
          <TouchableOpacity onPress={handleForceSync} style={styles.syncButton}>
            <Ionicons name="sync" size={20} color={colors.accent} />
          </TouchableOpacity>
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
          keyExtractor={(item) => `item-${item.firestore_id || item.id}`}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={EmptyListComponent}
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
  // ✅ ADD: Sync button style
  syncButton: {
    padding: 8,
    marginLeft: 8,
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
    backgroundColor: colors.card,
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
    left: 16,
    right: 16,
  },
});
