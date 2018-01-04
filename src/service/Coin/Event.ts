import { EventEmitter } from "events";

export namespace Event {
  export const RawHandler = new EventEmitter()
  export const HandlerMin = new EventEmitter()
  export const HandlerHour = new EventEmitter()
  export const HandlerDay = new EventEmitter()
}