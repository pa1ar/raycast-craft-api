import { getClient } from "../client";

type Input = {
  /**
   * Collection ID (UUID) from list-collections.
   */
  collectionId: string;

  /**
   * Title of the new item.
   */
  title: string;

  /**
   * Optional property map as a JSON string. Keys are property keys from
   * get-collection-schema; values must match the property type (string,
   * number, select option name, etc.).
   * Example: '{"status":"todo","priority":2}'
   */
  propertiesJson?: string;
};

type AddResult = {
  itemId: string;
  title: string;
};

/**
 * Add a new item to a Craft collection.
 *
 * Defaults: propertiesJson omitted → item gets title only.
 * Example: { collectionId: "abc-...", title: "new row", propertiesJson: "{\"status\":\"todo\"}" }
 * Use this when: user wants to add a row to a database/collection.
 * TIP: call get-collection-schema first if you don't know the property keys.
 * DO NOT use this to: create a standalone document (use create-document) or
 * add a task (use add-task).
 */
export default async function tool({
  collectionId,
  title,
  propertiesJson,
}: Input): Promise<AddResult> {
  let properties: Record<string, unknown> | undefined;
  if (propertiesJson) {
    try {
      properties = JSON.parse(propertiesJson);
    } catch {
      throw new Error("propertiesJson is not valid JSON");
    }
  }
  const client = getClient();
  const res = await client.collections.addItems(collectionId, [
    { title, ...(properties ? { properties } : {}) },
  ]);
  const item = res.items[0];
  if (!item) throw new Error("no item returned");
  return { itemId: item.id, title: item.title };
}
