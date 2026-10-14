import { createApp } from './app.js';
import { config } from './config.js';
import { getDatabase, closeDatabase } from './db/index.js';

const db = getDatabase();
const app = createApp(db);

const server = app.listen(config.port, () => {
  console.log(`=======================================================`);
  console.log(` API Section — Rich Text Editor API Platform          `);
  console.log(`=======================================================`);
  console.log(` Server active on: http://localhost:${config.port}`);
  console.log(` Environment:     ${config.env}`);
  console.log(` Database:        ${config.dbPath}`);
  console.log(` Payee UPI ID:    ${config.commercial.upiId}`);
  console.log(` Price:           ₹${config.commercial.priceINR} ${config.commercial.currency}/year`);
  console.log(`=======================================================`);
});

// Graceful shutdown
const shutdown = () => {
  console.log('\nShutting down server gracefully...');
  server.close(() => {
    closeDatabase();
    console.log('Database connections closed.');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
