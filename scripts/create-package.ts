import { join } from "node:path";
import { existsSync } from "node:fs";
import { mkdir, readdir, copyFile } from "node:fs/promises";

const inputName = Bun.argv[2];

if (!inputName) {
  console.error("Please provide a package name: bun create-package <name>");
  process.exit(1);
}

// Handle naming: always ensure @salora/ prefix
const cleanName = inputName.replace("@salora/", "");
const packageName = `@salora/${cleanName}`;

const targetDir = join(process.cwd(), "packages", cleanName);
const templateDir = join(process.cwd(), "packages", "_template");

if (existsSync(targetDir)) {
  console.error(`Error: Package "${cleanName}" already exists at ${targetDir}`);
  process.exit(1);
}

if (!existsSync(templateDir)) {
  console.error(`Error: Template directory not found at ${templateDir}`);
  process.exit(1);
}

async function copyDirRecursive(src: string, dest: string) {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".turbo") continue;
      await copyDirRecursive(srcPath, destPath);
    } else {
      if (entry.name === "package.json") {
        // Special handling for package.json to update the name
        const pkg = await Bun.file(srcPath).json();
        pkg.name = packageName;
        pkg.version = "0.0.1"; // Reset version
        await Bun.write(destPath, JSON.stringify(pkg, null, 2));
      } else {
        await copyFile(srcPath, destPath);
      }
    }
  }
}

try {
  console.log(`Creating package "${packageName}"...`);

  await copyDirRecursive(templateDir, targetDir);

  console.log("Running bun install...");
  const proc = Bun.spawn(["bun", "install"], {
    stdout: "inherit",
    stderr: "inherit",
  });
  await proc.exited;

  console.log(`\n✅ Package "${packageName}" created successfully!`);
  console.log(`Location: ${targetDir}`);
} catch (error) {
  console.error("Failed to create package:", error);
  process.exit(1);
}
