import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/server/app.js';
import { config } from '../src/server/config.js';
import { createTestDatabase } from './setup.js';

describe('Phase 1 & Commercial Configuration Compliance', () => {
  it('strictly adheres to API Section commercial specifications', () => {
    expect(config.commercial.productName).toBe('Rich Text Editor API');
    expect(config.commercial.brandName).toBe('API Section');
    expect(config.commercial.priceINR).toBe(3499);
    expect(config.commercial.currency).toBe('INR');
    expect(config.commercial.upiId).toBe('varunchauhan1998@ybl');
    expect(config.commercial.upiPayeeName).toBe('API Section');
    expect(config.commercial.licenseScope).toContain('One website/domain');
    expect(config.commercial.renewalTerms).toContain('Manual annual renewal');
  });

  it('serves commercial configuration publicly without leaking secrets', async () => {
    const db = createTestDatabase();
    const app = createApp(db);

    const res = await request(app).get('/api/config');
    expect(res.status).toBe(200);
    expect(res.body.brandName).toBe('API Section');
    expect(res.body.productName).toBe('Rich Text Editor API');
    expect(res.body.priceINR).toBe(3499);
    expect(res.body.currency).toBe('INR');
    expect(res.body.upiId).toBe('varunchauhan1998@ybl');
    expect(res.body.upiPayeeName).toBe('API Section');

    // Never leak database path or session secrets
    expect(res.body.sessionSecret).toBeUndefined();
    expect(res.body.csrfSecret).toBeUndefined();
    expect(res.body.dbPath).toBeUndefined();
  });
});
