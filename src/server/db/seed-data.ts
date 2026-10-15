import { DatabaseSync } from 'node:sqlite';

export function seedInitialData(db: DatabaseSync) {
  try {
    // 1. Seed Orders if empty
    const orderCount = db.prepare('SELECT count(*) as count FROM orders').get() as { count: number } | undefined;
    if (orderCount && orderCount.count === 0) {
      const insertOrder = db.prepare(`
        INSERT INTO orders (
          id, order_ref, customer_name, customer_email, domain, amount_inr,
          currency, status, upi_id, payee_name, utr_reference, submitted_at,
          reviewed_by, reviewed_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const orders = [
        [
          1, 'DIG-ORD-20261014-5C3C28', 'Demo Developer', 'demo@digitons.test', 'testapp.com',
          3499, 'INR', 'payment_approved', 'varunchauhan1998@ybl', 'Digitons Development',
          'UPI982348291039', '2026-10-14T05:44:14.509Z', 1, '2026-10-14T05:45:33.247Z',
          '2026-10-14T05:43:48.766Z', '2026-10-14T05:45:33.247Z'
        ],
        [
          2, 'DIG-ORD-20261014-F4061E', 'Varun Chauhan', 'customer@test.com', 'myblog.in',
          3499, 'INR', 'payment_approved', 'varunchauhan1998@ybl', 'Digitons Development',
          '992834829102', '2026-10-14T06:27:18.459Z', 1, '2026-10-14T06:27:55.827Z',
          '2026-10-14T06:26:57.515Z', '2026-10-14T06:27:55.827Z'
        ],
        [
          3, 'DIG-ORD-20261014-A1BA8B', 'Varun Chauhan Designer Kairali', 'info@zuvioglobalschool.com', 'zuvioglobalschool.com',
          3499, 'INR', 'pending_payment', 'varunchauhan1998@ybl', 'Digitons Development',
          null, null, null, null,
          '2026-10-14T06:32:15.840Z', '2026-10-14T06:32:15.840Z'
        ],
        [
          4, 'DIG-ORD-20261014-01C459', 'Varun Chauhan Designer Kairali', 'info@zuvioglobalschool.com', 'zuvioglobalschool.com',
          3499, 'INR', 'verification_submitted', 'varunchauhan1998@ybl', 'Digitons Development',
          '123456789012', '2026-10-14T06:35:02.530Z', null, null,
          '2026-10-14T06:34:32.000Z', '2026-10-14T06:35:02.530Z'
        ],
        [
          5, 'DIG-ORD-20261014-59525F', 'Varun', 'info@zuvioglobalschool.com', 'zuvioglobalschool.com',
          3499, 'INR', 'payment_approved', 'varunchauhan1998@ybl', 'Digitons Development',
          '123456789011', '2026-10-14T06:36:09.781Z', 1, '2026-10-14T06:37:09.947Z',
          '2026-10-14T06:35:53.291Z', '2026-10-14T06:37:09.947Z'
        ]
      ];

      for (const ord of orders) {
        insertOrder.run(...ord);
      }
    }

    // 2. Seed Licenses if empty
    const licCount = db.prepare('SELECT count(*) as count FROM licenses').get() as { count: number } | undefined;
    if (licCount && licCount.count === 0) {
      const insertLic = db.prepare(`
        INSERT INTO licenses (
          id, license_key, order_id, order_ref, customer_name, customer_email,
          domain, status, activated_at, expires_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const licenses = [
        [
          1, 'DIG-98E9-1212-9C43-5FDF', 1, 'DIG-ORD-20261014-5C3C28', 'Demo Developer', 'demo@digitons.test',
          'testapp.com', 'active', '2026-10-14T05:45:33.247Z', '2027-10-14T05:45:33.247Z',
          '2026-10-14T05:45:33.247Z', '2026-10-14T05:45:33.247Z'
        ],
        [
          2, 'DIG-5C29-77A1-4BF0-8E12', 2, 'DIG-ORD-20261014-F4061E', 'Varun Chauhan', 'customer@test.com',
          'myblog.in', 'active', '2026-10-14T06:27:55.827Z', '2027-10-14T06:27:55.827Z',
          '2026-10-14T06:27:55.827Z', '2026-10-14T06:27:55.827Z'
        ],
        [
          3, 'DIG-2E7C-7D0C-7EC3-F202', 5, 'DIG-ORD-20261014-59525F', 'Varun', 'info@zuvioglobalschool.com',
          'zuvioglobalschool.com', 'active', '2026-10-14T06:37:09.947Z', '2027-10-14T06:37:09.947Z',
          '2026-10-14T06:37:09.947Z', '2026-10-14T06:37:09.947Z'
        ]
      ];

      for (const lic of licenses) {
        insertLic.run(...lic);
      }
    }

    // 3. Seed Customers if missing
    const custStmt = db.prepare('SELECT id FROM customers WHERE email = ?');
    const insertCust = db.prepare(`
      INSERT INTO customers (name, email, password_hash, created_at)
      VALUES (?, ?, ?, ?)
    `);

    const customers = [
      {
        name: 'Varun Chauhan',
        email: 'customer@test.com',
        hash: 'scrypt$ba0e33c0f2863423c4bfcc3b0e8bd1ee$462e7f87daf9f7cf356503d4856481b4427ca922d80aceedc890928f1a020308866443d1e39c4b30be1e70e0fe6ff8106c853b717e862fd14346349189ea01a8',
        createdAt: '2026-10-14T06:23:26.348Z',
      },
      {
        name: 'Varun',
        email: 'c.graphics00@gmail.com',
        hash: 'scrypt$709b036313feac060011263962c5ad29$622128d48341e756814ef694132bdb7da4092e7593eb52a924abea04b9c1367f00687d3a810711b341793fcb9fa0d13a5332bfe6df511f43fe124956c9132926',
        createdAt: '2026-10-14T06:35:44.251Z',
      },
      {
        name: 'Zuvio Global School',
        email: 'info@zuvioglobalschool.com',
        hash: 'scrypt$709b036313feac060011263962c5ad29$622128d48341e756814ef694132bdb7da4092e7593eb52a924abea04b9c1367f00687d3a810711b341793fcb9fa0d13a5332bfe6df511f43fe124956c9132926',
        createdAt: '2026-10-15T04:53:13.887Z',
      },
    ];

    for (const c of customers) {
      if (!custStmt.get(c.email)) {
        insertCust.run(c.name, c.email, c.hash, c.createdAt);
      }
    }
  } catch (err) {
    console.error('Initial data seed notice:', err);
  }
}
