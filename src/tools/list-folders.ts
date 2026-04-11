import { getClient } from "../client";

type FolderNode = {
  folderId: string;
  name: string;
  documentCount: number;
  subfolders: FolderNode[];
};

/**
 * List all folders in the user's Craft vault as a tree structure.
 *
 * Use this when the user asks about their folder structure or needs a
 * folder ID to create a document in (pass the returned folderId to
 * create-document).
 *
 * Folders are not stored in the local data stores, so this tool always
 * calls the Craft API.
 */
export default async function tool(): Promise<FolderNode[]> {
  const client = getClient();
  const res = await client.folders.list();

  function toNode(f: {
    id: string;
    name: string;
    documentCount?: number;
    folders?: unknown[];
  }): FolderNode {
    return {
      folderId: f.id,
      name: f.name,
      documentCount: f.documentCount ?? 0,
      subfolders: (f.folders ?? []).map((sub) => toNode(sub as typeof f)),
    };
  }

  return res.items.map(toNode);
}
