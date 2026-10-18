import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUTPUT_FILE = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../src/app/core/build-info/build-info.generated.ts'
);
const SHORT_HASH_LENGTH = 7;
const LOCAL_COMMIT = 'local';
const LINE_BREAK = '\r\n';

function gitShortHash() {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

function resolveCommit() {
  const vercelSha = process.env.VERCEL_GIT_COMMIT_SHA;
  if (vercelSha) return vercelSha.slice(0, SHORT_HASH_LENGTH);
  return gitShortHash() || LOCAL_COMMIT;
}

function renderModule(info) {
  return [
    "import { BuildInfo } from './build-info.model';",
    '',
    'export const BUILD_INFO: BuildInfo = {',
    `  commit: '${info.commit}',`,
    `  builtAt: '${info.builtAt}',`,
    '};',
    '',
  ].join(LINE_BREAK);
}

const info = { commit: resolveCommit(), builtAt: new Date().toISOString() };
writeFileSync(OUTPUT_FILE, renderModule(info));
console.info(`build-info: ${info.commit} ${info.builtAt}`);
