import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(scriptDirectory, '..');
const cliPath = resolve(workspaceRoot, '../../node_modules/@angular/cli/bin/ng.js');
const requestedFile = process.argv[2];
const include = requestedFile === 'app.routes.spec.ts'
  ? 'src/app/app.routes.spec.ts'
  : requestedFile;
const result = spawnSync(process.execPath, [cliPath, 'test', 'web', ...(include ? ['--include', include] : [])], {
  cwd: workspaceRoot,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
