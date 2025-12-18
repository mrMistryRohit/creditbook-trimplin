import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { colors, spacing } from "../../constants/theme";
import Screen from "../components/Screen";
import {
  deleteInventoryItem,
  getInventoryItem,
  InventoryItem,
  TAX_INCLUDED_OPTIONS,
  TAX_TYPES,
  UNIT_OPTIONS,
  updateInventoryItem,
} from "../database/inventoryRepo";
import { appEvents } from "../utils/events";

export default function StockItemDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const itemId = parseInt(params.itemId as string);

  const [item, setItem] = useState<InventoryItem | null>(null);
  const [editing, setEditing] = useState(false);

  const [itemName, setItemName] = useState("");
  const [mrp, setMrp] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("Nos");
  const [rate, setRate] = useState("");
  const [productCode, setProductCode] = useState("");
  const [taxType, setTaxType] = useState("No Tax");
  const [taxIncluded, setTaxIncluded] = useState("Included");
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const [unitModalVisible, setUnitModalVisible] = useState(false);
  const [taxTypeModalVisible, setTaxTypeModalVisible] = useState(false);
  const [taxIncludedModalVisible, setTaxIncludedModalVisible] = useState(false);

  useEffect(() => {
    loadItem();
  }, [itemId]);

  const loadItem = async () => {
    const data = await getInventoryItem(itemId);
    if (data) {
      setItem(data);
      setItemName(data.item_name);
      setMrp(data.mrp.toString());
      setQuantity(data.quantity.toString());
      setUnit(data.unit);
      setRate(data.rate.toString());
      setProductCode(data.product_code || "");
      setTaxType(data.tax_type);
      setTaxIncluded(data.tax_included);
      setPhotoUri(data.photo_uri || null);
    }
  };

  const pickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(
        "Permission Required",
        "Permission to access camera roll is required!"
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!itemName.trim()) {
      Alert.alert("Error", "Please enter item name");
      return;
    }

    const mrpValue = parseFloat(mrp) || 0;
    const quantityValue = parseFloat(quantity) || 0;
    const rateValue = parseFloat(rate) || mrpValue;

    try {
      await updateInventoryItem(
        itemId,
        itemName.trim(),
        quantityValue,
        unit,
        mrpValue,
        rateValue,
        productCode.trim() || undefined,
        taxType,
        taxIncluded,
        photoUri || undefined
      );

      appEvents.emit("inventoryUpdated");
      setEditing(false);
      loadItem();
      Alert.alert("Success", "Item updated successfully");
    } catch (error) {
      console.error("Error updating item:", error);
      Alert.alert("Error", "Failed to update item");
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete Item", "Are you sure you want to delete this item?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteInventoryItem(itemId);
            appEvents.emit("inventoryUpdated");
            router.back();
          } catch (error) {
            Alert.alert("Error", "Failed to delete item");
          }
        },
      },
    ]);
  };

  if (!item) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </Screen>
    );
  }

  if (editing) {
    return (
      <Screen>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setEditing(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Edit Item</Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.saveHeaderText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <TouchableOpacity style={styles.photoContainer} onPress={pickImage}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photo} />
              ) : (
                <>
                  <Ionicons name="camera" size={32} color={colors.accent} />
                  <Text style={styles.photoText}>Edit Photo</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <Ionicons
                name="pricetag-outline"
                size={20}
                color={colors.textMuted}
              />
              <TextInput
                style={styles.input}
                placeholder="Item Name"
                placeholderTextColor={colors.textMuted}
                value={itemName}
                onChangeText={setItemName}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>MRP</Text>
                <TextInput
                  style={styles.input}
                  placeholder="MRP"
                  placeholderTextColor={colors.textMuted}
                  value={mrp}
                  onChangeText={setMrp}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Ionicons
                  name="cube-outline"
                  size={20}
                  color={colors.textMuted}
                />
                <TextInput
                  style={[styles.input, { flex: 0.5 }]}
                  placeholder="Quantity"
                  placeholderTextColor={colors.textMuted}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="decimal-pad"
                />
                <TouchableOpacity
                  style={styles.unitButton}
                  onPress={() => setUnitModalVisible(true)}
                >
                  <Text style={styles.unitButtonText}>{unit}</Text>
                  <Ionicons
                    name="chevron-down"
                    size={16}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Ionicons
                  name="cash-outline"
                  size={20}
                  color={colors.textMuted}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Rate"
                  placeholderTextColor={colors.textMuted}
                  value={rate}
                  onChangeText={setRate}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={colors.textMuted}
                />
                <Text style={styles.dateText}>
                  {new Date(item.last_updated).toLocaleDateString("en-IN")}
                </Text>
              </View>
            </View>

            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.inputGroup, styles.halfWidth]}
                onPress={() => setTaxTypeModalVisible(true)}
              >
                <Ionicons
                  name="receipt-outline"
                  size={20}
                  color={colors.textMuted}
                />
                <Text style={styles.selectText}>{taxType}</Text>
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color={colors.textMuted}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.inputGroup, styles.halfWidth]}
                onPress={() => setTaxIncludedModalVisible(true)}
              >
                <Text style={styles.selectText}>{taxIncluded}</Text>
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Ionicons
                name="barcode-outline"
                size={20}
                color={colors.textMuted}
              />
              <TextInput
                style={styles.input}
                placeholder="Product Code"
                placeholderTextColor={colors.textMuted}
                value={productCode}
                onChangeText={setProductCode}
              />
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>

          {/* Modals */}
          <Modal
            visible={unitModalVisible}
            transparent
            animationType="slide"
            onRequestClose={() => setUnitModalVisible(false)}
          >
            <View style={styles.modalBackdrop}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select Unit</Text>
                <ScrollView style={styles.optionsList}>
                  {UNIT_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={styles.optionItem}
                      onPress={() => {
                        setUnit(option);
                        setUnitModalVisible(false);
                      }}
                    >
                      <Text style={styles.optionText}>{option}</Text>
                      {unit === option && (
                        <Ionicons
                          name="checkmark"
                          size={20}
                          color={colors.accent}
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>

          <Modal
            visible={taxTypeModalVisible}
            transparent
            animationType="slide"
            onRequestClose={() => setTaxTypeModalVisible(false)}
          >
            <View style={styles.modalBackdrop}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select Tax Type</Text>
                <ScrollView style={styles.optionsList}>
                  {TAX_TYPES.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={styles.optionItem}
                      onPress={() => {
                        setTaxType(option);
                        setTaxTypeModalVisible(false);
                      }}
                    >
                      <Text style={styles.optionText}>{option}</Text>
                      {taxType === option && (
                        <Ionicons
                          name="checkmark"
                          size={20}
                          color={colors.accent}
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>

          <Modal
            visible={taxIncludedModalVisible}
            transparent
            animationType="slide"
            onRequestClose={() => setTaxIncludedModalVisible(false)}
          >
            <View style={styles.modalBackdrop}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Tax Status</Text>
                {TAX_INCLUDED_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={styles.optionItem}
                    onPress={() => {
                      setTaxIncluded(option);
                      setTaxIncludedModalVisible(false);
                    }}
                  >
                    <Text style={styles.optionText}>{option}</Text>
                    {taxIncluded === option && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={colors.accent}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Modal>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Item Details</Text>
          <TouchableOpacity onPress={() => setEditing(true)}>
            <Ionicons name="create-outline" size={24} color={colors.accent} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {item.photo_uri && (
            <Image
              source={{ uri: item.photo_uri }}
              style={styles.detailPhoto}
            />
          )}

          <View style={styles.detailCard}>
            <Text style={styles.detailItemName}>{item.item_name}</Text>
            {item.product_code && (
              <Text style={styles.detailCode}>Code: {item.product_code}</Text>
            )}

            <View style={styles.detailRow}>
              <View style={styles.detailCol}>
                <Text style={styles.detailLabel}>Quantity</Text>
                <Text style={styles.detailValue}>
                  {item.quantity} {item.unit}
                </Text>
              </View>
              <View style={styles.detailCol}>
                <Text style={styles.detailLabel}>MRP</Text>
                <Text style={styles.detailValue}>
                  ₹{item.mrp.toLocaleString("en-IN")}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailCol}>
                <Text style={styles.detailLabel}>Rate</Text>
                <Text style={styles.detailValue}>
                  ₹{item.rate.toLocaleString("en-IN")}
                </Text>
              </View>
              <View style={styles.detailCol}>
                <Text style={styles.detailLabel}>Tax</Text>
                <Text style={styles.detailValue}>
                  {item.tax_type} ({item.tax_included})
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailCol}>
                <Text style={styles.detailLabel}>Added</Text>
                <Text style={styles.detailValueSmall}>
                  {new Date(item.date_added).toLocaleDateString("en-IN")}
                </Text>
              </View>
              <View style={styles.detailCol}>
                <Text style={styles.detailLabel}>Last Updated</Text>
                <Text style={styles.detailValueSmall}>
                  {new Date(item.last_updated).toLocaleDateString("en-IN")}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={20} color="white" />
            <Text style={styles.deleteButtonText}>Delete Item</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  saveHeaderText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: "600",
  },
  photoContainer: {
    width: 140,
    height: 140,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.accent,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: spacing.lg,
  },
  photo: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  photoText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
  },
  detailPhoto: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  detailCard: {
    backgroundColor: colors.inputBackground,
    padding: 16,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  detailItemName: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  detailCode: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    marginTop: 12,
    gap: 16,
  },
  detailCol: {
    flex: 1,
  },
  detailLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
  detailValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  detailValueSmall: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    marginLeft: 8,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    marginRight: 8,
  },
  unitButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    gap: 4,
  },
  unitButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  dateText: {
    color: colors.text,
    fontSize: 15,
    marginLeft: 8,
  },
  selectText: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    marginLeft: 8,
  },
  deleteButton: {
    flexDirection: "row",
    backgroundColor: colors.danger,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
  },
  deleteButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
    maxHeight: "70%",
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  optionsList: {
    maxHeight: 300,
  },
  optionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionText: {
    color: colors.text,
    fontSize: 16,
  },
});
