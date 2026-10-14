import readline from 'node:readline';
import { getDatabase, closeDatabase } from '../db/index.js';
import { hashPassword } from '../utils/crypto.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  console.log('\n--- Digitons Development: Administrator Account Setup ---');
  console.log('Secure server-side account provisioning tool.\n');

  try {
    const usernameArg = process.env.ADMIN_USERNAME || process.argv[2];
    const emailArg = process.env.ADMIN_EMAIL || process.argv[3];
    const passwordArg = process.env.ADMIN_PASSWORD || process.argv[4];

    const username = usernameArg || (await prompt('Admin Username: '));
    const email = emailArg || (await prompt('Admin Email: '));
    const password = passwordArg || (await prompt('Admin Password (min 8 chars): '));

    if (!username || username.trim().length < 3) {
      console.error('Error: Username must be at least 3 characters.');
      process.exit(1);
    }

    if (!email || !email.includes('@')) {
      console.error('Error: Please provide a valid email address.');
      process.exit(1);
    }

    if (!password || password.length < 8) {
      console.error('Error: Password must be at least 8 characters long for administrative security.');
      process.exit(1);
    }

    const db = getDatabase();
    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();

    const existingStmt = db.prepare('SELECT id FROM admins WHERE username = ? OR email = ?');
    const existing = existingStmt.get(username.trim(), email.trim().toLowerCase());

    if (existing) {
      const updateStmt = db.prepare('UPDATE admins SET password_hash = ? WHERE username = ? OR email = ?');
      updateStmt.run(passwordHash, username.trim(), email.trim().toLowerCase());
      console.log(`\nExisting administrator credentials updated for: ${username.trim()}`);
    } else {
      const insertStmt = db.prepare(`
        INSERT INTO admins (username, email, password_hash, created_at)
        VALUES (?, ?, ?, ?)
      `);
      insertStmt.run(username.trim(), email.trim().toLowerCase(), passwordHash, now);
      console.log(`\nAdministrator created successfully for: ${username.trim()} (${email.trim()})`);
    }

    console.log('You can now log in securely through the Admin Portal.');
  } catch (err) {
    console.error('Failed to create admin:', err);
    process.exit(1);
  } finally {
    rl.close();
    closeDatabase();
  }
}

main();
