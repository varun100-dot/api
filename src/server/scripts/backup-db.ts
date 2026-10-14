import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

function backupDatabase(): void {
  const dbFile = config.dbPath;
  if (!fs.existsSync(dbFile)) {
    console.error(`Database file does not exist at: ${dbFile}`);
    process.exit(1);
  }

  const backupDir = path.resolve(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `sales_platform_${timestamp}.sqlite.bak`;
  const destination = path.join(backupDir, backupFileName);

  fs.copyFileSync(dbFile, destination);
  console.log(`\n Database backup created successfully:`);
  console.log(`Source:      ${dbFile}`);
  console.log(`Destination: ${destination}`);
  console.log(`Size:        ${(fs.statSync(destination).size / 1024).toFixed(2)} KB\n`);
}

backupDatabase();
