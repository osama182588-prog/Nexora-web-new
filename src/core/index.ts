/**
 * Nexora shared kernel.
 *
 * Every module imports from `@/core` instead of poking individual
 * `lib/*` files. The kernel is the contract between the modular
 * external integration layer and the rest of the system: shared
 * services, the in-process event bus, the realtime audit log, and the
 * MongoDB connection are all surfaced here.
 *
 * Keeping the surface centralised means individual modules stay
 * agnostic to the underlying file layout — we can refactor `lib/`
 * freely without touching `modules/`.
 */
export { connectToDatabase } from "@/lib/mongoose";

export { bus } from "@/lib/system/bus";
export type {
  SystemEvent,
  SystemEventType,
  SystemEventListener
} from "@/lib/system/bus";
export { ensureOperator, operatorState } from "@/lib/system/operator";

export {
  publishProjectEvent,
  recordProjectActivity
} from "@/lib/services/projects.service";
export { publishProductEvent } from "@/lib/services/marketplace.service";

export { ProjectModel, type Project } from "@/models/Project";
export { ProductModel, type Product } from "@/models/Product";
export { ActivityModel, type Activity } from "@/models/Activity";
export { SystemEventModel, type SystemEvent as SystemEventDoc } from "@/models/SystemEvent";

export { serializeProject, type ProjectDTO } from "@/lib/projects";
export { serializeProduct, type ProductDTO } from "@/lib/marketplace";
