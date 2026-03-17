import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { GitContext } from "./types.js";

const execFileAsync = promisify(execFile);

async function runGit(workspaceDir: string, args: string[]): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync("git", ["-C", workspaceDir, ...args], {
      timeout: 1_000,
      maxBuffer: 1024 * 64,
    });
    const trimmed = stdout.trim();
    return trimmed || undefined;
  } catch {
    return undefined;
  }
}

function normalizeRepo(remoteUrl: string | undefined): string | undefined {
  if (!remoteUrl) {
    return undefined;
  }
  const sshMatch = remoteUrl.match(/[:/]([^/:]+\/[^/.]+?)(?:\.git)?$/);
  if (sshMatch?.[1]) {
    return sshMatch[1];
  }
  return remoteUrl;
}

export async function inspectGitContext(workspaceDir: string | undefined): Promise<GitContext> {
  if (!workspaceDir) {
    return {};
  }

  const insideWorkTree = await runGit(workspaceDir, ["rev-parse", "--is-inside-work-tree"]);
  if (insideWorkTree !== "true") {
    return {};
  }

  const [remoteUrl, branch, status] = await Promise.all([
    runGit(workspaceDir, ["config", "--get", "remote.origin.url"]),
    runGit(workspaceDir, ["rev-parse", "--abbrev-ref", "HEAD"]),
    runGit(workspaceDir, ["status", "--porcelain"]),
  ]);

  return {
    repo: normalizeRepo(remoteUrl),
    branch,
    filesChanged: status ? status.split("\n").filter(Boolean).length : 0,
  };
}
