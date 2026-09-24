#!/usr/bin/env node
/**
 * Create the first Shiftify CRM admin without starting the backend server.
 *
 * Examples:
 *   node backend/scripts/create-admin.mjs "mongodb+srv://..."
 *   node backend/scripts/create-admin.mjs --uri "mongodb+srv://..." --email admin@example.com
 *   MONGODB_URI="mongodb+srv://..." ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD="..." \
 *     node backend/scripts/create-admin.mjs
 *
 * The password is prompted without echoing when ADMIN_PASSWORD is not set.
 * Existing users are never overwritten unless --reset-password is supplied.
 */

import readline from 'node:readline';

const PASSWORD_ROUNDS = 12;
let mongoose;
let bcrypt;
let User;

async function loadDependencies() {
  try {
    ({ default: mongoose } = await import('mongoose'));
    ({ default: bcrypt } = await import('bcryptjs'));
    ({ User } = await import('../src/models.js'));
  } catch {
    throw new Error('Backend dependencies are missing. Run npm install in backend/ before running this script.');
  }
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function usage() {
  console.log(`Usage:
  node backend/scripts/create-admin.mjs <MONGODB_URI> [--email <email>]
  node backend/scripts/create-admin.mjs --uri <MONGODB_URI> [--email <email>]

Options:
  --email <email>       Admin email. Otherwise ADMIN_EMAIL or a prompt is used.
  --reset-password      Update the password if the email already exists.
  --help                Show this help.

Environment alternatives:
  MONGODB_URI, ADMIN_EMAIL, ADMIN_PASSWORD
`);
}

function readOption(args, name) {
  const index = args.indexOf(name);
  if (index === -1) return '';
  const value = args[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${name} requires a value`);
  return value;
}

function parseArgs(args) {
  if (args.includes('--help') || args.includes('-h')) {
    usage();
    process.exit(0);
  }

  const uriOption = readOption(args, '--uri');
  const emailOption = readOption(args, '--email');
  const resetPassword = args.includes('--reset-password');
  const positional = args.filter((arg, index) => {
    if (arg.startsWith('--')) return false;
    const previous = args[index - 1];
    return previous !== '--uri' && previous !== '--email';
  });

  return {
    uri: uriOption || positional[0] || process.env.MONGODB_URI || '',
    email: emailOption || process.env.ADMIN_EMAIL || '',
    resetPassword,
  };
}

function ask(question) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Interactive input is unavailable; provide ADMIN_EMAIL and ADMIN_PASSWORD in the environment.');
  }
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function askHidden(question) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Interactive password input is unavailable; provide ADMIN_PASSWORD in the environment.');
  }

  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    let value = '';
    let finished = false;

    const cleanup = () => {
      if (finished) return;
      finished = true;
      stdin.removeListener('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
      process.stdout.write('\n');
    };

    const onData = (chunk) => {
      const text = String(chunk);
      for (const char of text) {
        if (char === '\u0003') {
          cleanup();
          reject(new Error('Cancelled.'));
          return;
        }
        if (char === '\r' || char === '\n') {
          cleanup();
          resolve(value);
          return;
        }
        if (char === '\u007f' || char === '\b') {
          if (value.length > 0) {
            value = value.slice(0, -1);
            process.stdout.write('\b \b');
          }
          continue;
        }
        if (char.charCodeAt(0) >= 32) {
          value += char;
          process.stdout.write('*');
        }
      }
    };

    process.stdout.write(question);
    stdin.setRawMode(true);
    stdin.setEncoding('utf8');
    stdin.resume();
    stdin.on('data', onData);
  });
}

function validateUri(uri) {
  if (!/^mongodb(?:\+srv)?:\/\//i.test(uri)) {
    throw new Error('The MongoDB URI must start with mongodb:// or mongodb+srv://.');
  }
}

function validateEmail(email) {
  const normalized = email.trim().toLowerCase();
  if (!EMAIL_RE.test(normalized)) throw new Error('Please provide a valid admin email address.');
  return normalized;
}

function validatePassword(password) {
  if (password.length < 12) throw new Error('The admin password must be at least 12 characters long.');
  return password;
}

function safeError(error, uri) {
  const message = error instanceof Error ? error.message : String(error);
  return uri ? message.replaceAll(uri, '[MongoDB URI redacted]') : message;
}

let sensitiveUri = '';

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.uri) {
    usage();
    throw new Error('Provide the MongoDB URI as the first argument, with --uri, or via MONGODB_URI.');
  }
  sensitiveUri = options.uri;
  validateUri(options.uri);
  await loadDependencies();

  const email = validateEmail(options.email || await ask('Admin email: '));
  const existing = await (async () => {
    await mongoose.connect(options.uri, { serverSelectionTimeoutMS: 30_000 });
    return User.findOne({ email });
  })();

  if (existing && !options.resetPassword) {
    console.log(`An admin user with ${email} already exists. No changes were made.`);
    console.log('Use --reset-password only if you intentionally want to replace its password.');
    return;
  }

  let password = process.env.ADMIN_PASSWORD || '';
  if (!password) password = await askHidden('Admin password: ');
  validatePassword(password);

  if (!process.env.ADMIN_PASSWORD) {
    const confirmation = await askHidden('Confirm password: ');
    if (password !== confirmation) throw new Error('Passwords do not match.');
  }

  const passwordHash = await bcrypt.hash(password, PASSWORD_ROUNDS);
  if (existing) {
    existing.passwordHash = passwordHash;
    existing.role = 'owner';
    await existing.save();
    console.log(`Admin password reset for ${email}.`);
  } else {
    await User.create({ email, passwordHash, role: 'owner' });
    console.log(`Admin created for ${email}.`);
  }
}

try {
  await main();
} catch (error) {
  console.error(`Admin setup failed: ${safeError(error, sensitiveUri)}`);
  process.exitCode = 1;
} finally {
  if (mongoose) await mongoose.disconnect().catch(() => {});
}
