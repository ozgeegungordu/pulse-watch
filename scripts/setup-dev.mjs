import { copyFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();

async function ensureFile(target, example) {
  try { await access(target, constants.F_OK); }
  catch { await copyFile(example, target); console.log(`Created ${path.relative(root, target)} from example`); }
}

function run(command, args, { quiet = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: quiet ? 'ignore' : 'inherit',
      shell: process.platform === 'win32',
    });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} ${args.join(' ')} exited with ${code}`)));
  });
}

await ensureFile(path.join(root, 'api/.env'), path.join(root, 'api/.env.example'));
await ensureFile(path.join(root, 'web/.env'), path.join(root, 'web/.env.example'));

try { await run('docker', ['info'], { quiet: true }); }
catch {
  console.error('\nDocker is installed but the Docker daemon is not available.');
  console.error('Start Docker Desktop, wait until it is ready, then run: npm run setup\n');
  process.exit(1);
}

console.log('\nStarting PostgreSQL...');
await run('docker', ['compose', 'up', '-d', 'postgres']);
console.log('\nGenerating Prisma Client...');
await run('npm', ['run', 'db:generate']);
console.log('\nApplying database migrations...');
await run('npm', ['run', 'db:deploy']);
console.log('\nPulseWatch is ready. Start it with: npm run dev');
