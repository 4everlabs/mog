import { dirname, join, relative } from "node:path";

type PackageJson = {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
};

type PackageTarget = {
  dir: string;
  displayName: string;
};

const rootDir = join(import.meta.dir, "..");
const forwardedArgs = Bun.argv.slice(2);
const dependencyFields: Array<keyof PackageJson> = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
];
const ignoredDirectoryNames = new Set([
  ".git",
  ".runtime",
  "coverage",
  "dist",
  "node_modules",
]);

function shouldIgnorePath(filePath: string): boolean {
  const parts = filePath.split("/");
  return parts.some((part) => ignoredDirectoryNames.has(part));
}

function hasDependencyEntries(pkg: PackageJson): boolean {
  return dependencyFields.some((field) => {
    const entries = pkg[field];
    return entries !== undefined && Object.keys(entries).length > 0;
  });
}

function usesWorkspaceProtocol(pkg: PackageJson): boolean {
  return dependencyFields.some((field) => {
    const entries = pkg[field];
    if (entries === undefined) {
      return false;
    }

    return Object.values(entries).some((value) => value.startsWith("workspace:"));
  });
}

async function listPackageTargets(): Promise<PackageTarget[]> {
  const targets: PackageTarget[] = [];
  const glob = new Bun.Glob("**/package.json");

  for await (const manifestPath of glob.scan({ cwd: rootDir })) {
    if (shouldIgnorePath(manifestPath)) {
      continue;
    }

    const packageDir = dirname(manifestPath);
    const absoluteDir = join(rootDir, packageDir);
    const pkg = (await Bun.file(join(rootDir, manifestPath)).json()) as PackageJson;

    if (!hasDependencyEntries(pkg)) {
      continue;
    }

    const hasLocalLockfile =
      (await Bun.file(join(absoluteDir, "bun.lock")).exists()) ||
      (await Bun.file(join(absoluteDir, "bun.lockb")).exists());

    if (usesWorkspaceProtocol(pkg) && !hasLocalLockfile) {
      const displayPath = packageDir === "." ? "." : packageDir;
      console.warn(
        `Skipping ${displayPath}: uses workspace dependencies but has no local Bun lockfile.`,
      );
      continue;
    }

    targets.push({
      dir: absoluteDir,
      displayName: packageDir === "." ? "." : relative(rootDir, absoluteDir),
    });
  }

  return targets.sort((left, right) => {
    if (left.displayName === ".") {
      return -1;
    }
    if (right.displayName === ".") {
      return 1;
    }
    return left.displayName.localeCompare(right.displayName);
  });
}

async function run(): Promise<number> {
  const targets = await listPackageTargets();

  if (targets.length === 0) {
    console.log("No Bun packages with dependencies were found.");
    return 0;
  }

  for (const target of targets) {
    console.log(`\n==> Updating ${target.displayName}`);

    const process = Bun.spawn({
      cmd: ["bun", "update", ...forwardedArgs],
      cwd: target.dir,
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });

    const exitCode = await process.exited;
    if (exitCode !== 0) {
      console.error(`\nUpdate failed in ${target.displayName}.`);
      return exitCode;
    }
  }

  console.log("\nAll package updates completed.");
  return 0;
}

process.exit(await run());
