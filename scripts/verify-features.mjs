import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const root = process.cwd();

function has(dep) {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  return Boolean((pkg.dependencies && pkg.dependencies[dep]) || (pkg.devDependencies && pkg.devDependencies[dep]));
}

const requiredFiles = [
  join(root, '..', 'api', 'ai-health-tip.ts'),
  join(root, '..', 'api', 'checkout.ts'),
];
const fileMissing = requiredFiles.filter(f => !existsSync(f));
const depsMissing = ['openai','stripe'].filter(d => !has(d));

if (fileMissing.length || depsMissing.length) {
  console.error('❌ Verification failed');
  if (fileMissing.length) console.error('Missing files:\n' + fileMissing.map(x=>' - '+x).join('\n'));
  if (depsMissing.length) console.error('Missing deps:\n' + depsMissing.map(x=>' - '+x).join('\n'));
  process.exit(1);
} else {
  console.log('✅ Features present: API routes + deps');
}