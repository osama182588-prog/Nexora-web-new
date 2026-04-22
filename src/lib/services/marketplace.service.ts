/**
 * Shared marketplace service helpers.
 *
 * Mirrors `projects.service.ts`: routes call these to mutate state +
 * publish to the internal bus in a single, consistent step.
 */
import { ProductModel, type Product } from "@/models/Product";
import { serializeProduct, type ProductDTO } from "@/lib/marketplace";
import { bus, type SystemEventType } from "@/lib/system/bus";

interface PublishProductInput {
  type: SystemEventType;
  ownerId: string;
  product: Product | ProductDTO;
  extra?: Record<string, unknown>;
}

export function publishProductEvent(input: PublishProductInput) {
  const dto =
    "id" in input.product
      ? (input.product as ProductDTO)
      : serializeProduct(input.product as Product);
  return bus.publish({
    type: input.type,
    actorId: input.ownerId,
    resourceId: dto.id,
    payload: { product: dto, ...(input.extra ?? {}) }
  });
}

export { ProductModel };
