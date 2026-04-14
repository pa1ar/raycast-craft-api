import { getClient } from "../client";

type Input = {
  /**
   * Collection ID (UUID) containing the item.
   */
  collectionId: string;

  /**
   * Item ID (UUID) to update.
   */
  itemId: string;

  /**
   * New title. Omit to keep existing.
   */
  title?: string;

  /**
   * Property map as a JSON string. Keys not included are left unchanged.
   * Example: '{"status":"done"}'
   */
  propertiesJson?: string;
};

type UpdateResult = {
  itemId: string;
  title: string;
};

/**
 * Update a collection item's title and/or properties.
 *
 * Defaults: at least one of title or propertiesJson must be provided.
 * Example: { collectionId: "abc-...", itemId: "xyz-...", propertiesJson: "{\"status\":\"done\"}" }
 * Use this when: user wants to change a row's fields in a database/collection.
 * DO NOT use this to: update a task (use update-task), edit a document block
 * (use update-block), or update the collection schema itself.
 */
export default async function tool({
  collectionId,
  itemId,
  title,
  propertiesJson,
}: Input): Promise<UpdateResult> {
  if (title === undefined && propertiesJson === undefined) {
    throw new Error(
      "update-collection-item: pass at least one of title or propertiesJson",
    );
  }
  let properties: Record<string, unknown> | undefined;
  if (propertiesJson) {
    try {
      properties = JSON.parse(propertiesJson);
    } catch {
      throw new Error("propertiesJson is not valid JSON");
    }
  }
  const client = getClient();
  const res = await client.collections.updateItems(collectionId, [
    {
      id: itemId,
      ...(title !== undefined ? { title } : {}),
      ...(properties ? { properties } : {}),
    },
  ]);
  const item = res.items[0];
  return {
    itemId: item?.id ?? itemId,
    title: item?.title ?? title ?? "",
  };
}
