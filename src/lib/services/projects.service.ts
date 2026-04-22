/**
 * Shared service helpers.
 *
 * The route handlers use these to run business logic + emit events to
 * the internal bus in one shot. Keeping them here makes the same logic
 * reusable from anywhere in the same Node process — including the
 * future external executor — without going through HTTP.
 */
import { ProjectModel, type Project } from "@/models/Project";
import { ActivityModel } from "@/models/Activity";
import { serializeProject, type ProjectDTO } from "@/lib/projects";
import { bus } from "@/lib/system/bus";
import type { SystemEventType } from "@/lib/system/bus";

interface PublishProjectInput {
  type: SystemEventType;
  ownerId: string;
  project: Project | ProjectDTO;
  /** Extra payload merged on top of the serialised project. */
  extra?: Record<string, unknown>;
}

/**
 * Publish a project event to the bus + write a matching `Activity`
 * row so the dashboard timeline stays in sync. Returns the bus event.
 */
export function publishProjectEvent(input: PublishProjectInput) {
  const dto =
    "id" in input.project
      ? (input.project as ProjectDTO)
      : serializeProject(input.project as Project);
  const event = bus.publish({
    type: input.type,
    actorId: input.ownerId,
    resourceId: dto.id,
    payload: { project: dto, ...(input.extra ?? {}) }
  });
  return event;
}

/**
 * Convenience helper that records a row in `Activity`. Centralised here
 * so each call site stays a one-liner and we never forget to set the
 * correct `ownerId`.
 */
export async function recordProjectActivity(input: {
  ownerId: string;
  projectId: string | null;
  type:
    | "project.created"
    | "project.updated"
    | "project.deleted"
    | "project.status_changed"
    | "project.progress_updated";
  message: string;
  metadata?: Record<string, unknown>;
}) {
  await ActivityModel.create({
    ownerId: input.ownerId,
    projectId: input.projectId,
    type: input.type,
    message: input.message,
    metadata: input.metadata ?? {}
  });
}

/** Tiny re-export so callers don't need to know the model. */
export { ProjectModel };
