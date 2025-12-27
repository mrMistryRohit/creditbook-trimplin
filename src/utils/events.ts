import EventEmitter from "eventemitter3";

export const appEvents = new EventEmitter<{
  customerUpdated: void;
  supplierUpdated: void;
  businessUpdated: void;
  businessSwitched: void;
  inventoryUpdated: void;
  syncCompleted: void;
}>();
