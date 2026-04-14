import { getClient } from "../client";

type Input = {
  /**
   * Name of the new folder.
   */
  name: string;

  /**
   * Optional parent folder UUID. Omit to create at the root level.
   */
  parentFolderId?: string;
};

type CreateResult = {
  folderId: string;
  name: string;
};

/**
 * Create a new folder in the Craft vault.
 *
 * Defaults: parentFolderId omitted → folder is created at root.
 * Example: { name: "ideas" } creates a root-level folder.
 * Use this when: user wants to organize with a new folder before putting
 * docs into it. After creating, pass the returned folderId to create-document
 * or move-document.
 * DO NOT use this to: create a subfolder under "unsorted" / "templates" -
 * those are virtual locations and do not accept children.
 */
export default async function tool({
  name,
  parentFolderId,
}: Input): Promise<CreateResult> {
  const client = getClient();
  const res = await client.folders.create([
    { name, ...(parentFolderId ? { parentFolderId } : {}) },
  ]);
  const folder = res.items[0];
  if (!folder) throw new Error("no folder returned");
  return { folderId: folder.id, name: folder.name };
}
