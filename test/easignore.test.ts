import fs from 'fs';
import path from 'path';

// EAS uploads the project without what `.easignore` lists, and it drops most
// of `convex/`. A client file that imports server code at runtime bundles in
// local and PR builds but breaks the store build, so every such file must be
// let back in explicitly.
const ROOT = path.resolve(__dirname, '..');

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

function runtimeConvexImports(): Map<string, string> {
  const found = new Map<string, string>();
  const importPattern = /import\s+(type\s+)?[^;]*?from\s+'(\.[^']*\/convex\/[^']+)'/g;
  for (const file of [...sourceFiles(path.join(ROOT, 'src')), ...sourceFiles(path.join(ROOT, 'app'))]) {
    const text = fs.readFileSync(file, 'utf8');
    for (const match of text.matchAll(importPattern)) {
      if (match[1]) continue; // `import type` disappears from the bundle.
      const target = path.relative(ROOT, path.resolve(path.dirname(file), match[2]));
      if (target.startsWith('convex/_generated')) continue;
      const withExtension = ['.ts', '.tsx'].map((ext) => target + ext).find((p) => fs.existsSync(path.join(ROOT, p)));
      found.set(withExtension ?? target, path.relative(ROOT, file));
    }
  }
  return found;
}

describe('.easignore', () => {
  const lines = new Set(
    fs
      .readFileSync(path.join(ROOT, '.easignore'), 'utf8')
      .split('\n')
      .map((line) => line.trim()),
  );

  it('ships every convex file the app imports at runtime', () => {
    const missing = [...runtimeConvexImports()].filter(([file]) => {
      const dir = path.dirname(file);
      const dirIncluded = lines.has(`!${dir}`);
      const fileIncluded = lines.has(`!${file}`) || !lines.has(`${dir}/*`);
      return !(dirIncluded && fileIncluded);
    });
    expect(missing).toEqual([]);
  });

  it('finds the battle rules among those imports', () => {
    expect([...runtimeConvexImports().keys()]).toContain('convex/battle/logic.ts');
  });
});
