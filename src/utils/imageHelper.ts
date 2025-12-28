// src/utils/imageHelper.ts
import { File } from "expo-file-system"; // ✅ NEW API
import * as ImageManipulator from "expo-image-manipulator";

/**
 * Compress and convert image to base64 for storage in SQLite + Firestore
 * @param imageUri - Local image URI (file://)
 * @returns Base64 string with data URI prefix
 */
export async function compressImageToBase64(imageUri: string): Promise<string> {
  try {
    // Step 1: Resize and compress image
    const manipResult = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 200, height: 200 } }], // Small profile photo
      {
        compress: 0.7, // 70% quality
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    // Step 2: Convert to base64 using NEW API
    const file = new File(manipResult.uri);
    const base64 = await file.base64();

    // Step 3: Return with data URI prefix
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error("Error compressing image:", error);
    throw error;
  }
}

/**
 * Get image size in KB
 */
export function getBase64Size(base64: string): number {
  const sizeInBytes = (base64.length * 3) / 4;
  return Math.round(sizeInBytes / 1024);
}

/**
 * Validate base64 image size (max 100 KB recommended)
 */
export function validateImageSize(
  base64: string,
  maxKB: number = 100
): boolean {
  const sizeKB = getBase64Size(base64);
  return sizeKB <= maxKB;
}
