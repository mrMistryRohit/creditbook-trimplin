import EventEmitter from "eventemitter3";

export const appEvents = new EventEmitter<{
  customerUpdated: void;
}>();
