import type { GitContext } from "./types.js";

type CompletionMetadataParams = {
  category: string;
  durationSec?: number;
  toolCount: number;
  includeGitMetadata: boolean;
  gitContext?: GitContext;
};

export function buildCompletionMetadata(params: CompletionMetadataParams): Record<string, unknown> {
  const metadata: Record<string, unknown> = {
    category: params.category,
    durationSec: params.durationSec,
    toolCount: params.toolCount,
  };

  if (!params.includeGitMetadata || !params.gitContext) {
    return metadata;
  }

  if (params.gitContext.repo) {
    metadata.repo = params.gitContext.repo;
  }
  if (params.gitContext.branch) {
    metadata.branch = params.gitContext.branch;
  }
  if (typeof params.gitContext.filesChanged === "number") {
    metadata.filesChanged = params.gitContext.filesChanged;
  }

  return metadata;
}
