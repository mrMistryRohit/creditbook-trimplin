// src/context/BusinessContext.tsx

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Business, getBusinessesByUser } from "../database/businessRepo";
import { appEvents } from "../utils/events";
import { useAuth } from "./AuthContext";

interface BusinessContextType {
  businesses: Business[];
  currentBusiness: Business | null;
  setCurrentBusiness: (business: Business) => void;
  refreshBusinesses: () => Promise<void>;
  loading: boolean;
}

const BusinessContext = createContext<BusinessContextType | undefined>(
  undefined
);

export const BusinessProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [currentBusiness, setCurrentBusinessState] = useState<Business | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  // ✅ Use ref to track current business ID to prevent infinite loop
  const currentBusinessIdRef = useRef<number | null>(null);

  const refreshBusinesses = useCallback(async () => {
    // ✅ ADD: Check if user exists
    if (!user) {
      console.log("⚠️ BusinessContext: No user, skipping business refresh");
      setBusinesses([]);
      setCurrentBusinessState(null);
      currentBusinessIdRef.current = null;
      setLoading(false);
      return;
    }

    if (!user.id || typeof user.id !== "number") {
      console.log("⚠️ BusinessContext: Invalid user ID:", user?.id);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      console.log("🔄 BusinessContext: Loading businesses for user:", user.id);
      const list = await getBusinessesByUser(user.id);

      // Deduplicate businesses by firestore_id or id
      const uniqueBusinesses = list.reduce((acc, business) => {
        const key = business.firestore_id || `local-${business.id}`;
        if (!acc.has(key)) {
          acc.set(key, business);
        } else {
          const existing = acc.get(key);
          if (business.firestore_id && !existing?.firestore_id) {
            acc.set(key, business);
          }
        }
        return acc;
      }, new Map<string, Business>());

      const deduplicatedList = Array.from(uniqueBusinesses.values());

      if (deduplicatedList.length !== list.length) {
        console.log(
          `⚠️ Duplicates found! ${list.length} → ${deduplicatedList.length} businesses`
        );
      }

      console.log(
        "✅ BusinessContext: Loaded",
        deduplicatedList.length,
        "businesses"
      );
      setBusinesses(deduplicatedList);

      if (deduplicatedList.length > 0) {
        const defaultBiz =
          deduplicatedList.find((b) => b.is_default === 1) ||
          deduplicatedList[0];

        if (currentBusinessIdRef.current) {
          const updatedCurrent = deduplicatedList.find(
            (b) => b.id === currentBusinessIdRef.current
          );
          if (updatedCurrent) {
            setCurrentBusinessState(updatedCurrent);
          } else {
            console.log(
              "⚠️ BusinessContext: Current business not found, switching to:",
              defaultBiz.name
            );
            setCurrentBusinessState(defaultBiz);
            currentBusinessIdRef.current = defaultBiz.id;
          }
        } else {
          console.log(
            "✅ BusinessContext: Setting default business:",
            defaultBiz.name
          );
          setCurrentBusinessState(defaultBiz);
          currentBusinessIdRef.current = defaultBiz.id;
        }
      } else {
        console.log("⚠️ BusinessContext: No businesses found for user");
        setCurrentBusinessState(null);
        currentBusinessIdRef.current = null;
      }
    } catch (error) {
      console.error("❌ BusinessContext: Failed to load businesses:", error);
    } finally {
      setLoading(false);
    }
  }, [user]); // ✅ CHANGED: Depend on entire user object

  const setCurrentBusiness = useCallback((business: Business) => {
    console.log("🔄 BusinessContext: Switching to business:", business.name);
    setCurrentBusinessState(business);
    currentBusinessIdRef.current = business.id;
    appEvents.emit("businessSwitched");
  }, []);

  // ✅ ADD: Clear businesses on logout
  useEffect(() => {
    if (!user) {
      console.log("🚪 BusinessContext: User logged out, clearing businesses");
      setBusinesses([]);
      setCurrentBusinessState(null);
      currentBusinessIdRef.current = null;
      setLoading(false);
      return; // Don't refresh if no user
    }

    // Only refresh if we have a user
    refreshBusinesses();
  }, [user, refreshBusinesses]);

  // ✅ KEEP: Event listeners
  useEffect(() => {
    const handler = () => {
      console.log("📣 BusinessContext: businessUpdated event received");
      refreshBusinesses();
    };

    const syncHandler = () => {
      console.log("📣 BusinessContext: Sync completed, refreshing businesses");
      refreshBusinesses();
    };

    appEvents.on("businessUpdated", handler);
    appEvents.on("syncCompleted", syncHandler);

    return () => {
      appEvents.off("businessUpdated", handler);
      appEvents.off("syncCompleted", syncHandler);
    };
  }, [refreshBusinesses]);

  const contextValue = useMemo(
    () => ({
      businesses,
      currentBusiness,
      setCurrentBusiness,
      refreshBusinesses,
      loading,
    }),
    [
      businesses,
      currentBusiness,
      setCurrentBusiness,
      refreshBusinesses,
      loading,
    ]
  );

  return (
    <BusinessContext.Provider value={contextValue}>
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusiness = () => {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error("useBusiness must be used within BusinessProvider");
  }
  return context;
};
