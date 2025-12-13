import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import React, { createContext, useContext, useEffect, useState } from "react";
import db from "../database/db";

interface User {
  id: number;
  name: string;
  email: string;
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

// Hash password using expo-crypto
const hashPassword = async (password: string): Promise<string> => {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    password
  );
  return hash;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userId = await SecureStore.getItemAsync("userId");
      if (userId) {
        const result = await db.getFirstAsync<User>(
          "SELECT id, name, email, phone, shop_name FROM users WHERE id = ?",
          [parseInt(userId)]
        );
        if (result) {
          setUser(result);
        }
      }
    } catch (error) {
      console.error("Load user error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    shopName?: string
  ) => {
    try {
      // Check if user exists
      const existing = await db.getFirstAsync(
        "SELECT id FROM users WHERE email = ?",
        [email.toLowerCase()]
      );

      if (existing) {
        return { success: false, message: "Email already registered" };
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Insert user
      const result = await db.runAsync(
        "INSERT INTO users (name, email, password_hash, shop_name) VALUES (?, ?, ?, ?)",
        [name, email.toLowerCase(), passwordHash, shopName || ""]
      );

      const newUser: User = {
        id: result.lastInsertRowId,
        name,
        email: email.toLowerCase(),
        shop_name: shopName,
      };

      await SecureStore.setItemAsync("userId", newUser.id.toString());
      setUser(newUser);

      return { success: true, message: "Registration successful" };
    } catch (error) {
      console.error("Register error:", error);
      return { success: false, message: "Registration failed" };
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const result = await db.getFirstAsync<User & { password_hash: string }>(
        "SELECT id, name, email, phone, shop_name, password_hash FROM users WHERE email = ?",
        [email.toLowerCase()]
      );

      if (!result) {
        return { success: false, message: "Invalid email or password" };
      }

      // Hash the input password and compare
      const passwordHash = await hashPassword(password);

      if (passwordHash !== result.password_hash) {
        return { success: false, message: "Invalid email or password" };
      }

      const userData: User = {
        id: result.id,
        name: result.name,
        email: result.email,
        phone: result.phone,
        shop_name: result.shop_name,
      };

      await SecureStore.setItemAsync("userId", userData.id.toString());
      setUser(userData);

      return { success: true, message: "Login successful" };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, message: "Login failed" };
    }
  };

  const refreshUser = async () => {
    try {
      const userId = await SecureStore.getItemAsync("userId");
      if (!userId) return;
      const result = await db.getFirstAsync<User>(
        "SELECT id, name, email, phone, shop_name FROM users WHERE id = ?",
        [parseInt(userId)]
      );
      if (result) setUser(result);
    } catch (e) {
      console.error("Refresh user error:", e);
    }
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync("userId");
    setUser(null);
  };

  // return (
  //   <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
  //     {children}
  //   </AuthContext.Provider>
  // );
  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
