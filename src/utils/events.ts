// src/utils/events.ts
import EventEmitter from "eventemitter3";

export const appEvents = new EventEmitter<{
  customerUpdated: void;
  supplierUpdated: void;
  businessUpdated: void;
  businessSwitched: void;
  inventoryUpdated: void;
  transactionUpdated: void; // ✅ ADD THIS
  supplierTransactionUpdated: void; // ✅ ADD THIS
  billUpdated: void; // ✅ ADD THIS
  syncCompleted: void;
}>();
