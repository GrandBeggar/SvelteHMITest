import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const cssColorPattern = /#[0-9a-fA-F]{3,8}\b|rgba?\(/;
const rootBlockPattern = /:root\s*\{[\s\S]*?\n\}/;
const files = [
  'src/app.css',
  ...readdirSync('src/lib/components')
    .filter((file) => file.endsWith('.svelte'))
    .map((file) => join('src/lib/components', file)),
];

const violations = [];

for (const file of files) {
  let contents = readFileSync(file, 'utf8');

  if (file === 'src/app.css') {
    contents = contents.replace(rootBlockPattern, '');
  }

  const lines = contents.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (cssColorPattern.test(line)) {
      violations.push(`${file}:${index + 1}: ${line.trim()}`);
    }
  });
}

if (violations.length > 0) {
  console.error('Hard-coded colors must live in src/app.css :root design tokens.');
  console.error(violations.join('\n'));
  process.exit(1);
}
