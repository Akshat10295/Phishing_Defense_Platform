# SentinelAI — Threat Intelligence Keys & Verification Manual

This manual contains steps to acquire your **Threat Intelligence API Keys**, configure database connections, and run end-to-end tests on your Phase 1 foundations.

---

## 🔑 1. ACQUIRING THREAT INTELLIGENCE API KEYS (100% FREE)

These platforms provide generous free tiers for developers. Register on their developer dashboards to get your keys.

### A. VirusTotal API Key
VirusTotal analyzes suspicious URLs and domains against 70+ antivirus and blocklist scanners.
1. Visit [VirusTotal](https://www.virustotal.com/) and register a free account.
2. Log in, click your username in the top-right corner, and select **"API Key"**.
3. Copy the alphanumeric string and update `VIRUSTOTAL_API_KEY` in your `.env` file.
   - *Free Quota*: 4 requests/minute, 500 requests/day.

### B. Google Safe Browsing API Key
Google Safe Browsing cross-checks active navigation requests with Google's dynamic blacklists.
1. Log in to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g., `SentinelAI`).
3. Search for the **"Safe Browsing API"** and click **Enable**.
4. Go to **APIs & Services** > **Credentials**.
5. Click **Create Credentials** > **API Key**.
6. Copy the key and update `GOOGLE_SAFE_BROWSING_KEY` in your `.env` file.
   - *Free Quota*: Up to 10,000 queries/day.

### C. URLScan.io API Key
URLScan.io behaves as a browser sandbox, rendering webpages, recording DOM elements, and taking visual screenshots.
1. Go to [URLScan.io](https://urlscan.io/) and sign up for a free developer account.
2. Navigate to your **User Profile** > **API Keys**.
3. Click **Create API Key**.
4. Copy the key and update `URLSCAN_API_KEY` in your `.env` file.
   - *Free Quota*: Up to 5,000 scans/day.

### D. WHOIS XML API Key (Domain Age Analyzer)
Checks the registration timestamp of domains. Phishing domains are almost always less than 30 days old.
1. Go to [WHOIS XML API](https://www.whoisxmlapi.com/) and sign up.
2. The dashboard will automatically generate a free developer token.
3. Copy the token and update `WHOIS_API_KEY` in your `.env` file.
   - *Free Quota*: 500 queries/month.

---

## 🗄 2. PROVISIONING POSTGRESQL & REDIS

Since Docker is currently offline, you have two simple ways to start your database and queue layers:

### Option A: Turn on Docker Desktop (Local Option)
1. Launch **Docker Desktop** on your Windows system.
2. Wait for the engine to initialize (status light turns green).
3. Open a terminal in `d:\Projects\Phishing Detection` and spin up **only** the databases:
   ```bash
   docker-compose up -d postgres redis
   ```

### Option B: Deploy Free Hosted Instances (Cloud Option — Easiest)
If you prefer not to run Docker locally, utilize these free hosting options:
1. **PostgreSQL**: Create a free DB at [Neon.tech](https://neon.tech/) or [Supabase](https://supabase.com/). Copy the connection string and paste it into `.env`:
   ```env
   DATABASE_URL="postgresql://user:password@ep-cloud-server.neon.tech/sentinelai?sslmode=require"
   ```
2. **Redis**: Create a free Serverless Redis instance at [Upstash](https://upstash.com/). Copy the connection URL and paste it into `.env`:
   ```env
   REDIS_URL="rediss://default:password@ep-redis-server.upstash.io:6379"
   ```

---

## ⚡ 3. RUNNING END-TO-END VERIFICATION TESTS

Once the databases are active, verify the system foundations using these steps:

### Step 1: Run Prisma Migrations
Deploy the tables directly to your database:
```bash
cd backend
npx prisma migrate dev --name init
```

### Step 2: Boot the Gateway Server
Start the Express backend:
```bash
npm run dev
```
- *Expected Log*:
  ```
  Successfully connected to PostgreSQL Database via Prisma.
  SentinelAI Gateway boot completed. Listening on port 5000.
  ```

### Step 3: Boot the React Dashboard
Open a new terminal window and run:
```bash
cd frontend
npm run dev
```
Open `http://localhost:5173` in your web browser.

### Step 4: Perform UI Verification Checks
1. **Account Registration**:
   - The React UI will automatically load the `/login` portal.
   - Click **"New deployment? Register security profile"**.
   - Input your email, password, select **Security Analyst**, and click **Provision Analyst Account**.
   - *Verification*: Verify your dashboard is loaded. Open your browser inspector (F12) > Application > Local Storage, and confirm `sentinel_user`, `sentinel_access`, and `sentinel_refresh` JWTs are successfully saved.

2. **Heuristic URL Inspector**:
   - Navigate to the **URL Inspector** screen.
   - Input `https://google.com` -> Click **Inspect**.
     - *Result*: Green **Verdict: Verified Safe** (12% risk index).
   - Input `http://paypal-secure-verify.com` -> Click **Inspect**.
     - *Result*: Red **Verdict: PHISHING / FRAUD** (89% risk index) and a **SHAP Explainable AI** bar-gauge factor breakdown detailing domain age and form target risks.

3. **BERT Email NLP Audit**:
   - Navigate to the **Email NLP Audit** screen.
   - Input standard text -> Click **Run NLP**.
     - *Result*: Green **Secure Communications** indicator.
   - Input threat text containing urgent phrasing (e.g., *"Your account is suspended! Log in immediately to verify"*).
     - *Result*: Red **Critical Risk Identified (91% risk)** highlighting the `urgency_language` and `suspicious_links` flags.

---
*Created: SentinelAI Verification Manual v1.0*
*Location: d:/Projects/Phishing Detection/testing_and_keys.md*
