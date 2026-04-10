// Craft Space Info - diagnostics: space info, API status, local store status
import { Detail, ActionPanel, Action, Icon, Clipboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getClient, getLocalStoreAsync } from "./client";
import type { ConnectionInfo } from "@1ar/craft-cli/lib";

interface DiagResult {
  api: {
    ok: boolean;
    status?: number;
    error?: string;
    info?: ConnectionInfo;
    latencyMs?: number;
  };
  local: {
    ok: boolean;
    spaceId?: string;
    docCount?: number;
    error?: string;
  };
}

export default function Command() {
  const { data, isLoading, revalidate } =
    useCachedPromise(async (): Promise<DiagResult> => {
      const result: DiagResult = {
        api: { ok: false },
        local: { ok: false },
      };

      // probe API
      const t0 = Date.now();
      try {
        const client = getClient();
        const info = await client.connection();
        result.api = {
          ok: true,
          status: 200,
          info,
          latencyMs: Date.now() - t0,
        };
      } catch (e) {
        const err = e as { status?: number; message: string };
        result.api = {
          ok: false,
          status: err.status,
          error: err.message,
          latencyMs: Date.now() - t0,
        };
      }

      // probe local store
      try {
        const local = await getLocalStoreAsync();
        if (local) {
          const docs = local.listDocs();
          result.local = {
            ok: true,
            spaceId: local.spaceId ?? undefined,
            docCount: docs.length,
          };
        } else {
          result.local = {
            ok: false,
            error: "Craft app not installed or local data not accessible",
          };
        }
      } catch (e) {
        result.local = {
          ok: false,
          error: (e as Error).message,
        };
      }

      return result;
    }, []);

  const markdown = buildMarkdown(data, isLoading);
  const copyText = data ? buildPlainText(data) : "";

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={() => revalidate()}
          />
          <Action
            title="Copy Diagnostics"
            icon={Icon.CopyClipboard}
            onAction={() => Clipboard.copy(copyText)}
          />
        </ActionPanel>
      }
    />
  );
}

function buildMarkdown(
  data: DiagResult | undefined,
  isLoading: boolean,
): string {
  if (isLoading || !data) return "# Craft Space Info\n\nLoading...";

  const lines: string[] = ["# Craft Space Info", ""];

  // API section
  lines.push("## API");
  lines.push("");
  if (data.api.ok && data.api.info) {
    const { space, utc } = data.api.info;
    lines.push(
      `- **Status**: OK (${data.api.status}, ${data.api.latencyMs}ms)`,
    );
    lines.push(`- **Space name**: ${space.name}`);
    lines.push(`- **Space ID**: \`${space.id}\``);
    lines.push(`- **Timezone**: ${space.timezone}`);
    lines.push(`- **Space time**: ${space.friendlyDate} (${space.time})`);
    lines.push(`- **UTC time**: ${utc.time}`);
  } else {
    lines.push(
      `- **Status**: FAIL${data.api.status ? ` (HTTP ${data.api.status})` : ""}`,
    );
    if (data.api.error) lines.push(`- **Error**: \`${data.api.error}\``);
    lines.push(`- **Latency**: ${data.api.latencyMs}ms`);
    lines.push("");
    lines.push("*Check your Craft API URL and key in extension preferences.*");
  }
  lines.push("");

  // local store section
  lines.push("## Local store");
  lines.push("");
  if (data.local.ok) {
    lines.push(`- **Status**: OK`);
    lines.push(`- **Space ID**: \`${data.local.spaceId ?? "unknown"}\``);
    lines.push(`- **Documents indexed**: ${data.local.docCount}`);
    lines.push("");
    lines.push("*Local reads via SQLite FTS5 + PlainTextSearch JSON.*");
  } else {
    lines.push(`- **Status**: unavailable`);
    if (data.local.error) lines.push(`- **Reason**: ${data.local.error}`);
    lines.push("");
    lines.push("*All reads will fall back to the API.*");
  }
  lines.push("");

  // id mismatch warning
  if (data.api.ok && data.local.ok && data.api.info && data.local.spaceId) {
    if (data.api.info.space.id !== data.local.spaceId) {
      lines.push("## Warning");
      lines.push("");
      lines.push(
        `API space ID (\`${data.api.info.space.id}\`) does not match local space ID (\`${data.local.spaceId}\`). You may be reading from a different space than you are writing to.`,
      );
      lines.push("");
    }
  }

  return lines.join("\n");
}

function buildPlainText(data: DiagResult): string {
  const lines: string[] = ["Craft Space Info", ""];

  lines.push("API:");
  if (data.api.ok && data.api.info) {
    lines.push(`  status: OK (${data.api.status}, ${data.api.latencyMs}ms)`);
    lines.push(`  space: ${data.api.info.space.name}`);
    lines.push(`  spaceId: ${data.api.info.space.id}`);
    lines.push(`  timezone: ${data.api.info.space.timezone}`);
  } else {
    lines.push(
      `  status: FAIL${data.api.status ? ` (HTTP ${data.api.status})` : ""}`,
    );
    if (data.api.error) lines.push(`  error: ${data.api.error}`);
  }
  lines.push("");

  lines.push("Local store:");
  if (data.local.ok) {
    lines.push(`  status: OK`);
    lines.push(`  spaceId: ${data.local.spaceId}`);
    lines.push(`  docCount: ${data.local.docCount}`);
  } else {
    lines.push(`  status: unavailable`);
    if (data.local.error) lines.push(`  reason: ${data.local.error}`);
  }

  return lines.join("\n");
}
