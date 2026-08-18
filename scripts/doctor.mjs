import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

let failed = false;
function check(label, command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.status === 0) console.log(`✓ ${label}`);
  else { console.log(`✗ ${label}`); failed = true; }
}

console.log('PulseWatch doctor\n');
check('Node.js', 'node', ['--version']);
check('npm', 'npm', ['--version']);
check('Docker CLI', 'docker', ['--version']);
check('Docker daemon', 'docker', ['info']);
check('Docker Compose', 'docker', ['compose', 'version']);
console.log(`${existsSync('api/.env') ? '✓' : '○'} api/.env${existsSync('api/.env') ? '' : ' (run npm run setup)'}`);
console.log(`${existsSync('web/.env') ? '✓' : '○'} web/.env${existsSync('web/.env') ? '' : ' (run npm run setup)'}`);
process.exitCode = failed ? 1 : 0;
