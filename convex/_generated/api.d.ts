/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as analytics from "../analytics.js";
import type * as appointments from "../appointments.js";
import type * as auth from "../auth.js";
import type * as billing from "../billing.js";
import type * as http from "../http.js";
import type * as inventory from "../inventory.js";
import type * as medicalRecords from "../medicalRecords.js";
import type * as notifications from "../notifications.js";
import type * as reminders from "../reminders.js";
import type * as router from "../router.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  analytics: typeof analytics;
  appointments: typeof appointments;
  auth: typeof auth;
  billing: typeof billing;
  http: typeof http;
  inventory: typeof inventory;
  medicalRecords: typeof medicalRecords;
  notifications: typeof notifications;
  reminders: typeof reminders;
  router: typeof router;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
