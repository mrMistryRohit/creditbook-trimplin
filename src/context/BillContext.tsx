import React, { createContext, ReactNode, useContext, useState } from "react";

export type BillItemDraft = {
  inventoryId?: number;
  itemName: string;
  quantity: number;
  unit: string;
  mrp: number;
  rate: number;
  taxType?: string;
  hsn?: string;
  note?: string;
};

type BillContextType = {
  draftItems: BillItemDraft[];
  addDraftItem: (item: BillItemDraft) => void;
  clearDraftItems: () => void;
};

const BillContext = createContext<BillContextType | undefined>(undefined);

export const BillProvider = ({ children }: { children: ReactNode }) => {
  const [draftItems, setDraftItems] = useState<BillItemDraft[]>([]);

  const addDraftItem = (item: BillItemDraft) => {
    setDraftItems((prev) => [...prev, item]);
  };

  const clearDraftItems = () => {
    setDraftItems([]);
  };

  return (
    <BillContext.Provider value={{ draftItems, addDraftItem, clearDraftItems }}>
      {children}
    </BillContext.Provider>
  );
};

export const useBill = () => {
  const context = useContext(BillContext);
  if (!context) {
    throw new Error("useBill must be used within BillProvider");
  }
  return context;
};
