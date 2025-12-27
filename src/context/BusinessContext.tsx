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

  // ✅ FIX: Use ref to track current business ID to prevent infinite loop
  const currentBusinessIdRef = useRef<number | null>(null);

  // ✅ FIX: Remove currentBusiness from dependencies
  const refreshBusinesses = useCallback(async () => {
    if (!user?.id || typeof user.id !== "number") {
      console.log("⚠️ BusinessContext: Invalid user ID:", user?.id);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      console.log("🔄 BusinessContext: Loading businesses for user:", user.id);
      const list = await getBusinessesByUser(user.id);
      console.log("✅ BusinessContext: Loaded", list.length, "businesses");
      setBusinesses(list);

      if (list.length > 0) {
        const defaultBiz = list.find((b) => b.is_default === 1) || list[0];

        // ✅ FIX: Use ref to check current business
        if (currentBusinessIdRef.current) {
          // Update current business data if it changed
          const updatedCurrent = list.find(
            (b) => b.id === currentBusinessIdRef.current
          );
          if (updatedCurrent) {
            setCurrentBusinessState(updatedCurrent);
          } else {
            // Current business was deleted
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
  }, [user?.id]); // ✅ REMOVED currentBusiness dependency

  const setCurrentBusiness = useCallback((business: Business) => {
    console.log("🔄 BusinessContext: Switching to business:", business.name);
    setCurrentBusinessState(business);
    currentBusinessIdRef.current = business.id; // ✅ Update ref
    appEvents.emit("businessSwitched");
  }, []);

  useEffect(() => {
    refreshBusinesses();

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
