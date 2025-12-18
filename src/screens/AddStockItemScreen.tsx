import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
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
import PrimaryButton from "../components/PrimaryButton";
import Screen from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { useBusiness } from "../context/BusinessContext";
import {
  addInventoryItem,
  TAX_INCLUDED_OPTIONS,
  TAX_TYPES,
  UNIT_OPTIONS,
} from "../database/inventoryRepo";
import { appEvents } from "../utils/events";

export default function AddStockItemScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentBusiness } = useBusiness();

  const [itemName, setItemName] = useState("");
  const [mrp, setMrp] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("Nos");
  const [rate, setRate] = useState("");
  const [productCode, setProductCode] = useState("");
  const [taxType, setTaxType] = useState("No Tax");
  const [taxIncluded, setTaxIncluded] = useState("Included");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const [unitModalVisible, setUnitModalVisible] = useState(false);
  const [taxTypeModalVisible, setTaxTypeModalVisible] = useState(false);
  const [taxIncludedModalVisible, setTaxIncludedModalVisible] = useState(false);

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
    if (!user || !currentBusiness) return;

    if (!itemName.trim()) {
      Alert.alert("Error", "Please enter item name");
      return;
    }

    const mrpValue = parseFloat(mrp) || 0;
    const quantityValue = parseFloat(quantity) || 0;
    const rateValue = parseFloat(rate) || mrpValue;

    try {
      await addInventoryItem(
        currentBusiness.id,
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
      Alert.alert("Success", "Item added successfully", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error("Error adding item:", error);
      Alert.alert("Error", "Failed to add item");
    }
  };

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>New Item</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Photo Upload */}
          <TouchableOpacity style={styles.photoContainer} onPress={pickImage}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photo} />
            ) : (
              <>
                <Ionicons name="camera" size={32} color={colors.accent} />
                <Text style={styles.photoText}>Add Item Photo</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Item Name */}
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

          {/* MRP and Quantity */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>MRP</Text>
              <TextInput
                style={styles.input}
                placeholder="MRP-"
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
                placeholder="1"
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

          {/* Toggle Details */}
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setShowDetails(!showDetails)}
          >
            <Text style={styles.toggleText}>
              {showDetails ? "View less Details" : "View more Details"}
            </Text>
            <Ionicons
              name={showDetails ? "chevron-up" : "chevron-down"}
              size={16}
              color={colors.accent}
            />
          </TouchableOpacity>

          {/* Additional Details */}
          {showDetails && (
            <>
              {/* Rate and Date */}
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
                    {new Date().toLocaleDateString("en-IN")}
                  </Text>
                </View>
              </View>

              {/* Tax Type and Included */}
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

              {/* Product Code */}
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
            </>
          )}

          <PrimaryButton
            label="Save Item"
            onPress={handleSave}
            style={styles.saveButton}
          />
        </ScrollView>

        {/* Unit Modal */}
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

        {/* Tax Type Modal */}
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

        {/* Tax Included Modal */}
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

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginBottom: 12,
  },
  toggleText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "600",
    marginRight: 4,
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
  saveButton: {
    marginTop: 24,
    marginBottom: 40,
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
