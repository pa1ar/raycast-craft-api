import { getClient } from "../client";

type Input = {
  /**
   * Collection ID (UUID) from list-collections.
   */
  collectionId: string;

  /**
   * Optional depth for nested content. Default: 0 (item metadata only, no body).
   * Set to -1 to fetch full content recursively, or a positive number for depth.
   */
  maxDepth?: number;
};

type Item = {
  itemId: string;
  title: string;
  properties: Record<string, unknown>;
};

/**
 * List all items inside a Craft collection.
 *
 * Defaults: maxDepth → 0 (metadata only). Use -1 for full content.
 * Example: { collectionId: "abc-..." } returns items with titles + properties.
 * Use this when: user asks about the contents of a database/collection, or you
 * need itemIds to update/delete. Pair with get-collection-schema to understand
 * property keys.
 */
export default async function tool({
  collectionId,
  maxDepth,
}: Input): Promise<Item[]> {
  const client = getClient();
  const res = await client.collections.getItems(collectionId, maxDepth);
  return res.items.map(
    (it: {
      id: string;
      title: string;
      properties?: Record<string, unknown>;
    }) => ({
      itemId: it.id,
      title: it.title,
      properties: it.properties ?? {},
    }),
  );
}
