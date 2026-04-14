import { getClient } from "../client";

type Input = {
  /**
   * Collection ID (UUID) from list-collections.
   */
  collectionId: string;
};

/**
 * Fetch a Craft collection's schema - property keys, names, types, and options.
 * Advanced, for AI.
 *
 * Defaults: none.
 * Example: { collectionId: "abc-..." } returns the schema as JSON.
 * Use this when: you need to know property keys before calling
 * add-collection-item or update-collection-item - especially for typed
 * properties like singleSelect that require option names.
 */
export default async function tool({ collectionId }: Input): Promise<unknown> {
  const client = getClient();
  return client.collections.getSchema(collectionId);
}
