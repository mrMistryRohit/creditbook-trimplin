import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { BusinessProvider } from "../src/context/BusinessContext";
import { getDatabaseStats, initDB } from "../src/database/db";

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!user && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (user && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [user, segments, isLoading]);

  return <Slot />;
}

export default function RootLayout() {
  // Initialize database on app start
  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        console.log("🔄 Initializing database...");
        await initDB();

        // Log database statistics (helpful for debugging)
        await getDatabaseStats();

        console.log("✅ App initialization complete");
      } catch (error) {
        console.error("❌ App initialization failed:", error);
      }
    };

    initializeDatabase();
  }, []);

  return (
    <AuthProvider>
      <BusinessProvider>
        <RootLayoutNav />
      </BusinessProvider>
    </AuthProvider>
  );
}
