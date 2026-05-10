import fs from "node:fs";
import path from "node:path";

export function resolveWorkspaceRoot(): string {
  let currentDir = process.cwd();

  while (true) {
    const packageJsonPath = path.resolve(currentDir, "package.json");
    const workspaceFilePath = path.resolve(currentDir, "pnpm-workspace.yaml");

    if (fs.existsSync(packageJsonPath) && fs.existsSync(workspaceFilePath)) {
      return currentDir;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      throw new Error("Could not resolve workspace root");
    }

    currentDir = parentDir;
  }
}

export function resolveWorkspacePath(relativePath: string): string {
  const resolvedPath = path.resolve(resolveWorkspaceRoot(), relativePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Could not resolve workspace path: ${relativePath}`);
  }

  return resolvedPath;
}
