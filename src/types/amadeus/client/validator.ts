import { HOSTS, RECOGNIZED_OPTIONS } from "../../../constants";
import type { Network } from "../";

export type RecognizedOptionsArray = typeof RECOGNIZED_OPTIONS;
export type RecognizedOptionsItem = (typeof RECOGNIZED_OPTIONS)[number];
type Hosts = typeof HOSTS.test | typeof HOSTS.production;

export type Fallback =
  | "silent"
  | "test"
  | "production"
  | Hosts
  | number
  | boolean
  | Console
  | Network
  | undefined;
