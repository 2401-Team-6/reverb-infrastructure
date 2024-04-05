import { ObjectId } from "mongodb";

export interface QueryTimestamp {
  startTime?: Date;
  endTime?: Date;
}

export interface QueryFilter {
  message?: string | { $in: string[] };
  count?: string;
  level?: "info" | "warn" | "debug" | "error" | "silly" | "http" | "verbose";
  _id?: { $gt: ObjectId };
  "meta.eventId"?: string;
  timestamp?: { $gte: Date; $lte: Date };
  "meta.taskType"?: "event" | "function";
  "meta.funcId"?: string | { $in: string[] };
  "meta.funcName"?: string;
  "meta.eventName"?: string;
}

export interface AggregateGroup {
  _id: string;
  message?: { $last: "$message" };
  timestamp?: { $last: "$meta.timestamp" };
  level?: { $last: "$level" };
  name?: { $first: "$meta.funcName" };
  invoked?: { $first: "$meta.timestamp" };
}

export interface HateoasLog {
  event?: { [key: string]: any };
  function?: { [key: string]: any };
  error?: { [key: string]: any };
  links?: {
    functions?: string;
    logs?: string;
    function?: string;
    event?: string;
  };
}

export interface HateoasLogCollection {
  logs: HateoasLog[];
  links?: {
    previous?: string;
    next?: string;
  };
}

export type DeadLetterType = "event" | "function" | "all";
