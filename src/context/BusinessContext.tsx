import React, { createContext, useContext, useEffect, useState } from "react";
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

  const refreshBusinesses = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const list = await getBusinessesByUser(user.id);
      setBusinesses(list);

      if (list.length > 0) {
        const defaultBiz = list.find((b) => b.is_default === 1) || list[0];
        if (
          !currentBusiness ||
          !list.find((b) => b.id === currentBusiness.id)
        ) {
          setCurrentBusinessState(defaultBiz);
        }
      }
    } catch (error) {
      console.error("Failed to load businesses:", error);
    } finally {
      setLoading(false);
    }
  };

  const setCurrentBusiness = (business: Business) => {
    setCurrentBusinessState(business);
    appEvents.emit("businessSwitched");
  };

  useEffect(() => {
    refreshBusinesses();

    const handler = () => {
      refreshBusinesses();
    };

    appEvents.on("businessUpdated", handler);
    return () => {
      appEvents.off("businessUpdated", handler);
    };
  }, [user?.id]);

  return (
    <BusinessContext.Provider
      value={{
        businesses,
        currentBusiness,
        setCurrentBusiness,
        refreshBusinesses,
        loading,
      }}
    >
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
