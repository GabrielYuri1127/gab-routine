import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const checkedExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".css", ".md"]);
const ignoredDirs = new Set(["node_modules", ".next", ".npm-cache", ".test-build"]);
const failures = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        if (!ignoredDirs.has(entry.name)) {
          await walk(fullPath);
        }
        return;
      }

      if (!checkedExtensions.has(path.extname(entry.name))) {
        return;
      }

      const content = await readFile(fullPath, "utf8");
      const relative = path.relative(root, fullPath);

      const placeholderHrefPattern = "href=" + "\"#\"";
      const consoleLogPattern = "console" + ".log(";

      if (content.includes(placeholderHrefPattern)) {
        failures.push(`${relative}: contains placeholder hash link`);
      }

      if (content.includes(consoleLogPattern)) {
        failures.push(`${relative}: contains console.log`);
      }

      if (content.match(/[ \t]+$/m)) {
        failures.push(`${relative}: contains trailing whitespace`);
      }
    })
  );
}

await walk(root);

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

process.stdout.write("Project lint checks passed.\n");
