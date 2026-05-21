#!/usr/bin/env node
// create-dataly — scaffold and deploy a Cloudflare link shortener with analytics.
// Zero runtime deps; only built-in Node modules.

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATES_DIR = path.resolve(__dirname, '..', 'templates');

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};
const c = process.stdout.isTTY ? COLORS : Object.fromEntries(Object.keys(COLORS).map((k) => [k, '']));

function log(msg) {
  process.stdout.write(msg + '\n');
}
function step(msg) {
  log(`${c.cyan}›${c.reset} ${msg}`);
}
function ok(msg) {
  log(`${c.green}✓${c.reset} ${msg}`);
}
function warn(msg) {
  log(`${c.yellow}!${c.reset} ${msg}`);
}
function fail(msg) {
  log(`${c.red}✗${c.reset} ${msg}`);
}
function bail(msg, code = 1) {
  fail(msg);
  process.exit(code);
}

function printHelp() {
  log(`
${c.bold}create-dataly${c.reset} — one-command Cloudflare link shortener.

Usage:
  npx create-dataly [project-name] [options]

Options:
  --domain <domain>   Custom domain (e.g. links.example.com). Leave off for workers.dev.
  --skip-deploy       Scaffold files and create D1 but don't deploy.
  --skip-install      Skip "npm install".
  -h, --help          Show this help.

Examples:
  npx create-dataly
  npx create-dataly my-link-tracker
  npx create-dataly links --domain links.example.com
`);
}

function parseArgs(argv) {
  const args = { positional: [], domain: null, skipDeploy: false, skipInstall: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') {
      printHelp();
      process.exit(0);
    } else if (a === '--domain') {
      args.domain = argv[++i] || null;
    } else if (a.startsWith('--domain=')) {
      args.domain = a.slice('--domain='.length);
    } else if (a === '--skip-deploy') {
      args.skipDeploy = true;
    } else if (a === '--skip-install') {
      args.skipInstall = true;
    } else if (a.startsWith('--')) {
      bail(`Unknown flag: ${a}`);
    } else {
      args.positional.push(a);
    }
  }
  return args;
}

function slugifyName(input) {
  return String(input)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

function prompt(question, defaultValue) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const suffix = defaultValue ? ` ${c.dim}(${defaultValue})${c.reset}` : '';
  return new Promise((resolve) => {
    rl.question(`${question}${suffix} `, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

function runCapture(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    ...opts,
  });
  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

function runInherit(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', ...opts });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

function copyTemplates(srcDir, destDir, replacements) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    // `.gitignore` is renamed `_gitignore` in the published package because npm
    // strips `.gitignore` files. Restore the real name on copy.
    const destName = entry.name === '_gitignore' ? '.gitignore' : entry.name;
    const destPath = path.join(destDir, destName);
    if (entry.isDirectory()) {
      copyTemplates(srcPath, destPath, replacements);
    } else {
      let contents = fs.readFileSync(srcPath, 'utf8');
      for (const [key, value] of Object.entries(replacements)) {
        contents = contents.split(`{{${key}}}`).join(value);
      }
      fs.writeFileSync(destPath, contents);
    }
  }
}

function parseD1DatabaseId(output) {
  // Wrangler prints a TOML snippet containing `database_id = "<uuid>"`.
  const match = output.match(/database_id\s*=\s*"([0-9a-fA-F-]+)"/);
  if (match) return match[1];
  // Some wrangler versions print JSON: "database_id": "<uuid>"
  const jsonMatch = output.match(/"database_id"\s*:\s*"([0-9a-fA-F-]+)"/);
  return jsonMatch ? jsonMatch[1] : null;
}

async function checkWrangler() {
  const check = runCapture('npx', ['--no-install', 'wrangler', '--version']);
  if (check.status === 0) return;
  // Try with install — npx will fetch it transparently when running deploy anyway.
  const fallback = runCapture('npx', ['wrangler', '--version']);
  if (fallback.status !== 0) {
    bail(
      'wrangler is not available. Install Node 18+ and ensure `npx` works, then re-run create-dataly.\n' +
        '(Or install wrangler globally: `npm i -g wrangler`.)',
    );
  }
}

async function ensureWranglerLogin(cwd) {
  const who = runCapture('npx', ['wrangler', 'whoami'], { cwd });
  const combined = (who.stdout + who.stderr).toLowerCase();
  if (who.status === 0 && !combined.includes('not authenticated') && !combined.includes('you are not authenticated')) {
    return;
  }
  step('Wrangler not logged in — opening browser…');
  await runInherit('npx', ['wrangler', 'login'], { cwd });
}

function writeWranglerConfig(projectDir, config) {
  const target = path.join(projectDir, 'wrangler.jsonc');
  fs.writeFileSync(target, JSON.stringify(config, null, 2) + '\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  log(`\n${c.bold}create-dataly${c.reset} — Cloudflare link shortener\n`);

  // 1) Project name
  let projectInput = args.positional[0];
  if (!projectInput) {
    projectInput = await prompt('What should we call this?', 'dataly');
  }
  const projectName = slugifyName(projectInput) || 'dataly';
  const dbName = `${projectName}-db`;
  const projectDir = path.resolve(process.cwd(), projectName);

  if (fs.existsSync(projectDir)) {
    bail(`Directory "${projectName}" already exists. Choose a different name or remove it.`);
  }

  // 2) Optional custom domain
  let domain = args.domain;
  if (domain === null) {
    const answer = await prompt('Custom domain? (leave blank to use workers.dev)', '');
    domain = answer || null;
  }
  if (domain) domain = domain.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');

  // 3) Prerequisites
  step('Checking wrangler…');
  await checkWrangler();
  ok('wrangler ok');

  // 4) Scaffold files
  step(`Creating ${c.bold}${projectName}${c.reset}/…`);
  copyTemplates(TEMPLATES_DIR, projectDir, {
    PROJECT_NAME: projectName,
    DB_NAME: dbName,
    DB_DATABASE_ID: '', // backfilled after D1 create
  });

  // Add custom domain route to wrangler.jsonc if requested.
  if (domain) {
    const cfgPath = path.join(projectDir, 'wrangler.jsonc');
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8').replace(/^\s*\/\/.*$/gm, ''));
    cfg.routes = [{ pattern: domain, custom_domain: true }];
    writeWranglerConfig(projectDir, cfg);
  }
  ok('Files written');

  // 5) Install
  if (!args.skipInstall) {
    step('Installing dependencies…');
    try {
      await runInherit('npm', ['install', '--silent'], { cwd: projectDir });
      ok('Installed');
    } catch (err) {
      warn(`npm install failed: ${err.message}`);
      warn('Continuing — you can run `npm install` manually later.');
    }
  }

  // 6) Login
  await ensureWranglerLogin(projectDir);

  // 7) D1 create
  step(`Creating D1 database ${c.bold}${dbName}${c.reset}…`);
  const create = runCapture('npx', ['wrangler', 'd1', 'create', dbName], { cwd: projectDir });
  if (create.status !== 0) {
    fail('Failed to create D1 database.');
    log(create.stdout);
    log(create.stderr);
    bail(
      `You can create it manually:\n  cd ${projectName}\n  npx wrangler d1 create ${dbName}\n` +
        `Then put the database_id into wrangler.jsonc and run \`npm run db:migrate && npx wrangler deploy\`.`,
    );
  }
  const dbId = parseD1DatabaseId(create.stdout + create.stderr);
  if (!dbId) {
    fail('D1 was created but I could not parse the database_id from wrangler\'s output.');
    log(create.stdout);
    bail(`Open ${projectName}/wrangler.jsonc and paste the database_id manually, then run \`npm run deploy\`.`);
  }
  ok(`D1 created · ${c.dim}${dbId}${c.reset}`);

  // 8) Patch wrangler.jsonc with the real id
  {
    const cfgPath = path.join(projectDir, 'wrangler.jsonc');
    let txt = fs.readFileSync(cfgPath, 'utf8');
    txt = txt.replace('{{DB_DATABASE_ID}}', dbId);
    fs.writeFileSync(cfgPath, txt);
  }

  // 9) Migrate
  step('Running schema migration…');
  try {
    await runInherit('npx', ['wrangler', 'd1', 'execute', dbName, '--remote', '--file=src/schema.sql'], {
      cwd: projectDir,
    });
    ok('Migration complete');
  } catch (err) {
    warn(`Migration failed: ${err.message}`);
    warn('You can re-run it later with `npm run db:migrate`.');
  }

  // 10) Deploy
  if (args.skipDeploy) {
    log(`\n${c.bold}Skipped deploy.${c.reset} Run \`cd ${projectName} && npm run deploy\` when you're ready.`);
    return;
  }

  step('Deploying…');
  try {
    await runInherit('npx', ['wrangler', 'deploy'], { cwd: projectDir });
  } catch (err) {
    bail(`Deploy failed: ${err.message}\nFix the issue and run \`cd ${projectName} && npx wrangler deploy\`.`);
  }

  // 11) Success
  const dashboardUrl = domain ? `https://${domain}` : `https://${projectName}.<your-account>.workers.dev`;
  log(`
${c.green}${c.bold}✓ Done.${c.reset}

  Dashboard:   ${c.cyan}${dashboardUrl}${c.reset}
  Short links: ${c.cyan}${dashboardUrl}/l/<slug>${c.reset}

  Create a slug by visiting the dashboard, or:
    curl -X POST ${dashboardUrl}/api/slugs \\
      -H 'content-type: application/json' \\
      -d '{"slug":"launch","url":"https://example.com"}'

  Develop locally:   ${c.dim}cd ${projectName} && npm run dev${c.reset}
  Redeploy:          ${c.dim}cd ${projectName} && npm run deploy${c.reset}
`);

  if (domain) {
    log(`${c.yellow}DNS:${c.reset} point ${c.bold}${domain}${c.reset} at your Cloudflare account.`);
    log(`  • If the zone is already on Cloudflare, the worker will auto-provision.`);
    log(`  • Otherwise add a CNAME from ${domain} → ${projectName}.<your-account>.workers.dev.\n`);
  }
}

main().catch((err) => {
  bail(err && err.stack ? err.stack : String(err));
});
