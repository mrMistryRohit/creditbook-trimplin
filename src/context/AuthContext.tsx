import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  collection,
  doc,
  Firestore,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { auth, firestore } from "../config/firebase";
import db from "../database/db";
import SyncService from "../services/SyncService";

interface User {
  id: number;
  firebaseUid: string;
  email: string;
  name: string;
  phone?: string;
  shop_name?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; message: string }>;
  register: (
    name: string,
    email: string,
    password: string,
    shopName?: string
  ) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ FIXED: Check Firestore before creating businesses
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        console.log("🔐 Firebase user logged in:", firebaseUser.uid);

        try {
          // Fetch Firestore user data
          const userDocRef = doc(firestore, "users", firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const firestoreData = userDoc.data();

            // ✅ Check if SQLite user exists
            let sqliteUser = await db.getFirstAsync<{
              id: number;
              name: string;
              email: string;
              phone: string | null;
              shop_name: string | null;
            }>(
              `SELECT id, name, email, phone, shop_name FROM users WHERE email = ?`,
              [firebaseUser.email?.toLowerCase() || ""]
            );

            // ✅ If SQLite user doesn't exist, create it
            if (!sqliteUser) {
              console.log("⚠️ SQLite user not found, creating...");

              try {
                const result = await db.runAsync(
                  `INSERT INTO users (name, email, phone, shop_name) VALUES (?, ?, ?, ?)`,
                  [
                    firestoreData.name || "",
                    firebaseUser.email?.toLowerCase() || "",
                    firestoreData.phone || "",
                    firestoreData.shop_name || "",
                  ]
                );

                const newUserId = result.lastInsertRowId;
                console.log("✅ SQLite user created with ID:", newUserId);

                // Fetch the new user
                sqliteUser = await db.getFirstAsync<{
                  id: number;
                  name: string;
                  email: string;
                  phone: string | null;
                  shop_name: string | null;
                }>(
                  `SELECT id, name, email, phone, shop_name FROM users WHERE id = ?`,
                  [newUserId]
                );
              } catch (error: any) {
                if (error.message?.includes("UNIQUE constraint failed")) {
                  console.log(
                    "⚠️ User already exists (race condition), fetching..."
                  );
                  sqliteUser = await db.getFirstAsync<{
                    id: number;
                    name: string;
                    email: string;
                    phone: string | null;
                    shop_name: string | null;
                  }>(
                    `SELECT id, name, email, phone, shop_name FROM users WHERE email = ?`,
                    [firebaseUser.email?.toLowerCase() || ""]
                  );
                } else {
                  console.error("❌ Error creating SQLite user:", error);
                  throw error;
                }
              }
            } else {
              console.log("✅ SQLite user found with ID:", sqliteUser.id);
            }

            // ✅ NEW: Check Firestore for existing businesses FIRST
            const businessesRef = collection(firestore, "businesses");
            const q = query(
              businessesRef,
              where("user_id", "==", firebaseUser.uid)
            );
            const businessesSnapshot = await getDocs(q);

            console.log(
              `📊 Found ${businessesSnapshot.size} businesses in Firestore`
            );

            if (sqliteUser) {
              // ✅ Only create default business if none exist in Firestore
              if (businessesSnapshot.empty) {
                const localBusiness = await db.getFirstAsync<{ id: number }>(
                  `SELECT id FROM businesses WHERE user_id = ?`,
                  [sqliteUser.id]
                );

                if (!localBusiness) {
                  console.log(
                    "⚠️ No businesses found anywhere, creating default..."
                  );
                  const businessName =
                    firestoreData.shop_name?.trim() ||
                    `${firestoreData.name?.trim()}'s Business`;

                  await db.runAsync(
                    `INSERT INTO businesses (user_id, name, description, is_default, sync_status, updated_at) VALUES (?, ?, ?, 1, 'pending', ?)`,
                    [
                      sqliteUser.id,
                      businessName,
                      "Default business account",
                      new Date().toISOString(),
                    ]
                  );
                  console.log("✅ Default business created in SQLite");
                }
              } else {
                console.log(
                  "✅ Businesses exist in Firestore, will sync from cloud"
                );
              }

              setUser({
                id: sqliteUser.id,
                firebaseUid: firebaseUser.uid,
                email: sqliteUser.email,
                name: sqliteUser.name,
                phone: sqliteUser.phone || undefined,
                shop_name: sqliteUser.shop_name || undefined,
              });

              // ✅ CHANGED: Use reset() instead of just initializeSync()
              SyncService.reset(); // Clears shutdown flag
              await SyncService.initializeSync(firebaseUser.uid);
            }
          }
        } catch (error) {
          console.error("❌ Error in auth state change:", error);
        }
      } else {
        console.log("🔐 No Firebase user");
        setUser(null);
        SyncService.cleanup();
      }

      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const register = async (
    name: string,
    email: string,
    password: string,
    shopName?: string
  ) => {
    try {
      // ✅ Create Firebase user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const uid = userCredential.user.uid;

      const userData = {
        email: email.toLowerCase(),
        name,
        phone: "",
        shop_name: shopName || "",
        created_at: new Date().toISOString(),
      };

      // ✅ Save user to Firestore
      await setDoc(doc(firestore as Firestore, "users", uid), userData);

      // ✅ Save user to SQLite with error handling
      let newUserId: number;

      try {
        const result = await db.runAsync(
          `INSERT INTO users (name, email, phone, shop_name) VALUES (?, ?, ?, ?)`,
          [name, email.toLowerCase(), "", shopName || ""]
        );
        newUserId = result.lastInsertRowId;
        console.log("✅ SQLite user created with ID:", newUserId);
      } catch (dbError: any) {
        // ✅ Handle race condition - user already created by onAuthStateChanged
        if (dbError.message?.includes("UNIQUE constraint failed")) {
          console.log(
            "⚠️ User already exists (race condition), fetching existing..."
          );
          const existingUser = await db.getFirstAsync<{ id: number }>(
            `SELECT id FROM users WHERE email = ?`,
            [email.toLowerCase()]
          );

          if (!existingUser) {
            throw new Error("Failed to create or find user");
          }

          newUserId = existingUser.id;
          console.log("✅ Using existing SQLite user ID:", newUserId);
        } else {
          throw dbError;
        }
      }

      // ✅ Check if business already exists (might have been created by onAuthStateChanged)
      const existingBusiness = await db.getFirstAsync<{
        id: number;
        firestore_id: string | null;
      }>(`SELECT id, firestore_id FROM businesses WHERE user_id = ?`, [
        newUserId,
      ]);

      if (existingBusiness) {
        console.log("✅ Business already exists, skipping creation");
      } else {
        // ✅ Create default business name
        const businessName = shopName?.trim() || `${name.trim()}'s Business`;

        // ✅ Create business in Firestore FIRST with auto-generated ID
        const firestoreBusinessRef = doc(
          collection(firestore as Firestore, "businesses")
        );
        const businessData = {
          user_id: uid,
          name: businessName,
          description: "Default business account",
          phone: "",
          address: "",
          is_default: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        await setDoc(firestoreBusinessRef, businessData);
        console.log(
          "✅ Business created in Firestore:",
          firestoreBusinessRef.id
        );

        // ✅ Create business in SQLite with Firestore ID (synced status)
        await db.runAsync(
          `INSERT INTO businesses (user_id, name, description, is_default, firestore_id, sync_status, updated_at) VALUES (?, ?, ?, 1, ?, 'synced', ?)`,
          [
            newUserId,
            businessName,
            "Default business account",
            firestoreBusinessRef.id,
            new Date().toISOString(),
          ]
        );
        console.log("✅ Business created in SQLite");
      }

      // ✅ Fetch the final user state
      const finalUser = await db.getFirstAsync<{
        id: number;
        name: string;
        email: string;
        phone: string | null;
        shop_name: string | null;
      }>(`SELECT id, name, email, phone, shop_name FROM users WHERE id = ?`, [
        newUserId,
      ]);

      if (finalUser) {
        setUser({
          id: finalUser.id,
          firebaseUid: uid,
          email: finalUser.email,
          name: finalUser.name,
          phone: finalUser.phone || undefined,
          shop_name: finalUser.shop_name || undefined,
        });
      }

      return { success: true, message: "Registration successful" };
    } catch (error: any) {
      console.error("❌ Register error:", error);

      let message = "Registration failed";
      if (error.code === "auth/email-already-in-use") {
        message = "This email is already registered";
      } else if (error.code === "auth/weak-password") {
        message = "Password should be at least 6 characters";
      } else if (error.code === "auth/invalid-email") {
        message = "Invalid email address";
      } else if (error.message) {
        message = error.message;
      }

      return {
        success: false,
        message,
      };
    }
  };

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true, message: "Login successful" };
    } catch (error: any) {
      console.error("❌ Login error:", error);

      let message = "Login failed";
      if (
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password" ||
        error.code === "auth/invalid-credential"
      ) {
        message = "Invalid email or password";
      } else if (error.code === "auth/too-many-requests") {
        message = "Too many attempts. Please try again later";
      } else if (error.code === "auth/network-request-failed") {
        message = "Network error. Please check your connection";
      }

      return {
        success: false,
        message,
      };
    }
  };

  const refreshUser = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const userDocRef = doc(firestore as Firestore, "users", currentUser.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const sqliteUser = await db.getFirstAsync<{
        id: number;
        name: string;
        email: string;
        phone: string | null;
        shop_name: string | null;
      }>(
        `SELECT id, name, email, phone, shop_name FROM users WHERE email = ?`,
        [currentUser.email?.toLowerCase() || ""]
      );

      if (sqliteUser) {
        setUser({
          id: sqliteUser.id,
          firebaseUid: currentUser.uid,
          email: sqliteUser.email,
          name: sqliteUser.name,
          phone: sqliteUser.phone || undefined,
          shop_name: sqliteUser.shop_name || undefined,
        });
      }
    }
  };

  const logout = async () => {
    try {
      console.log("🔄 Starting logout...");

      // ✅ STEP 1: Final sync before logout (optional - if you want to save pending changes)
      if (user) {
        await SyncService.syncNow(user.firebaseUid);
      }

      // ✅ STEP 2: Cleanup sync service
      SyncService.cleanup();

      // ✅ STEP 3: Wait a moment for cleanup to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // ✅ STEP 4: Sign out from Firebase
      await signOut(auth);

      // ✅ STEP 5: Clear user state
      setUser(null);

      console.log("✅ Logged out");
    } catch (error) {
      console.error("❌ Logout error:", error);
    }
  };

  const value = useMemo(
    () => ({ user, isLoading, login, register, logout, refreshUser }),
    [user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
