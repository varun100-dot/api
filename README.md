# API Section — Rich Text Editor API Sales Platform

A professional, production-oriented sales and licensing platform for the **API Section Rich Text Editor API**.

Built with a full-stack TypeScript architecture, resilient synchronous SQLite storage (`node:sqlite`), strict server-side validation (`zod`), double-submit CSRF protection, timing-safe scrypt password hashing, NPCI-compliant UPI payment linking and genuine QR code generation, and manual administrative payment verification.

---

## Commercial Configuration Summary

| Property | Value / Specification |
| :--- | :--- |
| **Product** | Rich Text Editor API |
| **Seller / Brand** | API Section |
| **Annual Price** | ₹3,499 INR per year (Incl. 18% GST) |
| **License Scope** | One website / domain per active license |
| **Renewal Policy** | Strict manual annual renewal (no silent/automated recurring card charges) |
| **Payment Mechanism**| UPI / QR code with manual administrative payment verification |
| **Payee UPI ID** | `varunchauhan1998@ybl` |
| **Payee Display Name**| `API Section` |
| **Activation Policy**| License is issued and activated **exclusively** after an administrator verifies the bank UTR / payment proof |
| **Technical Support** | `support@apisection.com` |

---

## Key Platform Features

### 1. Customer Product Website
- **Digitons Development Brand System**: Deep slate/midnight modern aesthetic with vibrant indigo accents, accessible typography (`Plus Jakarta Sans` & `JetBrains Mono`), and high contrast ratios.
- **Live Interactive Editor Sandbox**: Fully operational browser rich-text editor playground supporting real-time formatting (Bold, Italic, Underline, Strikethrough, Headings, Lists, Quotes, Hyperlinks) with live tabs for **Visual Editor**, **Serialized HTML5**, **Structured JSON AST**, and **SDK Integration Snippet**.
- **Transparent Commercial Terms**: Exact ₹3,499 pricing, single-domain scope, and manual renewal wording clearly stated without fabricated benchmarks or unverified claims.
- **Order Tracker & License Retriever**: Customers can enter their unique order reference (`DIG-ORD-YYYYMMDD-XXXX`) at any time to check review progress or retrieve their active license key once approved.
- **Public License Verification Widget**: Live interactive tool testing the `/api/license/verify` registry endpoint.

### 2. Customer Purchase & UPI Payment Flow
- **Order Generation**: Customers enter Name, Email, and Target Domain name (e.g., `blog.example.com`). The server normalizes the domain, generates a unique order reference, and locks in the ₹3,499 INR price.
- **NPCI-Compliant UPI & Real QR Code**: Renders a genuine `upi://pay?pa=varunchauhan1998@ybl&pn=Digitons%20Development&am=3499&cu=INR&tn=...` deep link and generated high-resolution QR code (scan-ready by GPay, PhonePe, Paytm, BHIM, CRED).
- **Payment Reference Submission**: Customer submits their 12-digit bank UTR reference and optional payment screenshot proof (PNG, JPG, WEBP, PDF up to 5MB).
- **Duplicate Prevention**: System rejects duplicate payment submissions and locks orders against duplicate UTRs.
- **Pending Review Notice**: Clear disclosure that licenses are never auto-activated on UTR entry; review is strictly manual.

### 3. Secure Administration Portal
- **Protected Access**: Server-side authentication using secure, timing-safe `scrypt` hashing with unique cryptographic salts, 12-hour sliding session cookies (`httpOnly`, `sameSite: lax`, `secure` in production), and rate-limited login endpoints.
- **Order Review Modal**: Search and filter orders by reference, customer email, domain, or status. Inspect submitted bank UTR references and review uploaded proof files served through path-traversal-protected endpoints.
- **Approval Workflow**: Approving payment atomically changes order status to `payment_approved`, generates a unique license key (`DIG-XXXX-XXXX-XXXX-XXXX`), sets activation date to `now`, and sets the expiry date to exactly 12 months in the future.
- **Rejection Workflow**: Rejecting payment requires a descriptive reason recorded in the database, allowing customers to view the reason and re-submit a corrected UTR.
- **Manual Renewal Management**: Record annual renewals only upon verified payment reference; automatically extends the expiry date by 12 months and records the event in `license_renewals`.
- **Immutable Audit Trail**: Chronological audit log recording logins, payment submissions, approvals, rejections, license generations, and renewals.

---

## Architecture & Technology Stack

```
digitons-api-sales-platform/
├── src/
│   ├── server/                     # Backend API & Database
│   │   ├── config.ts               # Commercial constants & environment config
│   │   ├── app.ts                  # Express application, security headers & routing
│   │   ├── index.ts                # Server entry point & graceful shutdown
│   │   ├── db/
│   │   │   ├── schema.ts           # Embedded SQL DDL & migration schema
│   │   │   └── index.ts            # node:sqlite database connection (WAL mode)
│   │   ├── middleware/
│   │   │   ├── auth.ts             # Admin session authentication & cookie verification
│   │   │   ├── csrf.ts             # Double-submit CSRF protection middleware
│   │   │   ├── rate-limiter.ts     # IP rate limiters for auth, orders, and APIs
│   │   │   └── upload.ts           # Multer diskStorage with MIME & size restrictions
│   │   ├── services/
│   │   │   ├── order.service.ts    # Order creation, UTR submissions, order queries
│   │   │   ├── license.service.ts  # Approval, 12-month expiry, renewal, registry verification
│   │   │   └── audit.service.ts    # Audit logging service
│   │   ├── utils/
│   │   │   ├── crypto.ts           # scrypt password hashing, license & order generators
│   │   │   ├── upi.ts              # NPCI UPI URI builder & QR generator
│   │   │   └── validation.ts       # Zod schemas for strict payload validation
│   │   └── scripts/
│   │       ├── create-admin.ts     # CLI tool to provision admin credentials
│   │       └── backup-db.ts        # CLI tool to create timestamped database backups
│   └── client/                     # Frontend UI
│       ├── main.tsx                # Client entry point
│       ├── App.tsx                 # Root layout & view controller
│       ├── styles/index.css        # Premium Vanilla CSS design system
│       ├── components/             # Public landing page components & modals
│       └── admin/                  # Protected admin dashboard & login components
├── tests/                          # Automated Vitest test suite
├── data/                           # Local SQLite database (sales_platform.db)
├── uploads/                        # Secure storage for payment proof attachments
├── .env.example                    # Documented environment template
└── package.json
```

---

## Local Setup & Development Instructions

### Prerequisites
- **Node.js**: v20+ (Tested on Node.js v24.18.0)
- **npm**: v10+ (Tested on npm 11.16.0)

### 1. Clone and Install Dependencies
```bash
git clone https://github.com/varun100-dot/api.git
cd api
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure secrets in `.env` are set to secure random strings in production environments.

### 3. Create an Initial Administrator Account
Default credentials are never shipped in source code. Use the CLI script to provision an administrator:
```bash
# Interactive mode:
npm run admin:create

# Or via environment variables:
ADMIN_USERNAME=admin ADMIN_EMAIL=admin@digitons.com ADMIN_PASSWORD=YourStrongPassword123! npm run admin:create
```

### 4. Run Locally in Development Mode
To run the server and client concurrently with hot reloading:
```bash
npm run dev
```
- Client runs on: `http://localhost:5173`
- Backend API runs on: `http://localhost:3000`

### 5. Build and Run in Production Mode
```bash
# Build frontend bundle into dist/public and compile TypeScript server into dist/server
npm run build

# Start the unified production server
npm start
```
The application will be served at `http://localhost:3000`.

---

## Running Automated Tests & Quality Checks

Run the complete test suite:
```bash
npm test
```

Run TypeScript type checking across client and server:
```bash
npm run typecheck
```

### Database Backup
Create a snapshot backup of the SQLite database:
```bash
npm run db:backup
```
Backups are saved to `./backups/sales_platform_<timestamp>.sqlite.bak`.

---

## License Model & Technical Enforcement Notice

> [!IMPORTANT]
> **Difference Between Sales Portal Registry and Runtime Editor Enforcement**
> - **Sales Portal Registry (This Platform)**: Manages customer orders, verifies bank UTR references, records manual annual renewals, and acts as the authoritative commercial registry.
> - **Rich Text Editor API Runtime**: When embedding the editor into customer websites, the client library accepts the issued license key (`DIG-XXXX-XXXX-XXXX-XXXX`). Technical domain binding and client-side runtime validation are handled inside the editor SDK deployment. Domain verification in this portal (`/api/license/verify`) queries the authoritative database registry.

---

## Security Highlights

1. **Password Storage**: Modern password hashing using Node.js native `crypto.scrypt` with unique 16-byte cryptographically random salts and constant-time timing-safe comparisons (`timingSafeEqual`).
2. **CSRF Protection**: Double-submit cookie verification (`x-xsrf-token` header validated against `XSRF-TOKEN` cookie) on all mutating requests.
3. **Session Management**: Cryptographically random 32-byte tokens stored server-side with expiration tracking; served via `HttpOnly`, `SameSite: Lax`, and `Secure` cookies.
4. **Input Sanitization**: Strict schema validation via `zod` for domain names, email addresses, order references, UTR numbers, and administrative inputs.
5. **Rate Limiting**: Brute-force mitigation on authentication endpoints (15 requests/15 min) and order submission endpoints (40 requests/15 min).
6. **Path Traversal Defense**: Strict filename pattern enforcement (`/^[a-f0-9]{32}\.(png|jpe?g|webp|pdf)$/`) and boundary directory validation before serving uploaded payment proofs.
7. **Zero Embedded Secrets**: No sensitive bank credentials, API secrets, or passwords are baked into frontend bundles.
