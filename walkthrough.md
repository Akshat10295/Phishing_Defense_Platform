# Walkthrough – Phase 6: Hardening, Deployment & GitHub Delivery

We have successfully completed and shipped **Phase 6: Hardening & Deployment** for **SentinelAI**! The entire ecosystem is now fully production-hardened, containerized under secure unprivileged system policies, documented to enterprise standards, and pushed live to your GitHub repository.

---

## 🛡️ Summary of Completed Components

### 1. Advanced Security Hardening (API Gateway)
*   **Security Middleware (`helmet`)**: Applied [helmet()](file:///d:/Projects/Phishing%20Detection/backend/src/index.js#L19) at the top of the Express stack in the API Gateway to secure all HTTP response headers automatically.
*   **CORS Schema Isolation**: Locked down [CORS verification](file:///d:/Projects/Phishing%20Detection/backend/src/index.js#L21-L38) to strictly accept connections from whitelisted interfaces (`localhost:3000`, `localhost:5173`) and local browser extensions (`chrome-extension://`).
*   **Global Rate Limiting**: Enabled [rate-limiting middleware](file:///d:/Projects/Phishing%20Detection/backend/src/index.js#L44-L55) mapping all `/api/` paths to a maximum of `100 requests per 15 minutes` per IP address.

### 2. High-Performance & Hardened Docker Configurations
*   **Decoupled Multi-Stage Frontend Build**: Transformed [frontend/Dockerfile](file:///d:/Projects/Phishing%20Detection/frontend/Dockerfile) into a two-stage build:
    1. *Stage 1*: Compiles optimized, compressed production React bundles.
    2. *Stage 2*: Copies compiled static assets into `nginx:stable-alpine` and sets up the [nginx.conf](file:///d:/Projects/Phishing%20Detection/frontend/nginx.conf) SPA fallback routing.
*   **Decoupled & Secured Backend Build**: Hardened [backend/Dockerfile](file:///d:/Projects/Phishing%20Detection/backend/Dockerfile):
    1. Installs production dependencies and generates Prisma Client binaries.
    2. Runs under the unprivileged system user `node` rather than root.
    3. Triggers database migrations automatically at startup via [backend/entrypoint.sh](file:///d:/Projects/Phishing%20Detection/backend/entrypoint.sh) before launching.
*   **Secure Python WSGI Serving**: Upgraded [ml-service/Dockerfile](file:///d:/Projects/Phishing%20Detection/ml-service/Dockerfile) to run Flask applications under a multi-worker **Gunicorn** WSGI layer (`gunicorn --workers 4 app.main:app`), executing under an unprivileged `sentinel` user.
*   **Production Service Orchestrations**: Configured [docker-compose.yml](file:///d:/Projects/Phishing%20Detection/docker-compose.yml) to route client traffic through Port 80, run in `production` mode, and enforce container-level healthchecks for Redis and PostgreSQL.

### 3. Automated CI/CD Workflows
*   **GitHub Actions Workflow**: Created [.github/workflows/sentinel_cicd.yml](file:///d:/Projects/Phishing%20Detection/.github/workflows/sentinel_cicd.yml) to automate Node lint checks, Python requirement audits, and multi-service Docker compilation builds on every push to the `main` branch.

### 4. Enterprise-Grade Project Documentation
*   **Unified Manual**: Overwrote [README.md](file:///d:/Projects/Phishing%20Detection/README.md) to serve as a complete, visually stunning, unified manual detailing microservices layout, Deep Learning model statistics, API key acquisitions, Docker Compose orchestration steps, and local offline installation scripts.

---

## 🚀 GitHub Delivery Log

All changes have been staged, committed, and successfully pushed to your remote repository on GitHub:
```bash
git add .
git commit -m "feat: complete Phase 6 production hardening, docker staging, CI/CD pipelines, and unified setup documentation"
git push origin main
```
**Push Success Output:**
```text
To https://github.com/Akshat10295/Phishing_Defense_Platform.git
   3f3e6b5..1b323af  main -> main
```

---

## ⚙️ Steps to Run the Final Version

Here are the precise step-by-step instructions to run your final production ecosystem.

### A. Production Method (Using Docker Compose — Recommended)
Ensure **Docker Desktop** is running on your machine:
1. Create/verify a `.env` file in the root workspace with production credentials and API keys.
2. Spin up the entire multi-container architecture from the root directory:
   ```bash
   docker-compose up --build -d
   ```
3. Open the platforms in your browser:
   * **React Dashboard UI**: Navigate to `http://localhost` (Port 80 via Nginx).
   * **Node API Gateway**: Listening on `http://localhost:5000`.
   * **Python ML Engine**: Listening on `http://localhost:8000`.

### B. Local Development Method (Docker Offline Option)
If Docker Desktop is offline, run the database layers using hosted providers (e.g., [Neon.tech](https://neon.tech/) and [Upstash](https://upstash.com/)) and start services locally:
1. Update `.env` with your hosted database connection strings:
   ```env
   DATABASE_URL="postgresql://user:password@ep-cloud-server.neon.tech/sentinelai?sslmode=require"
   REDIS_URL="rediss://default:password@ep-redis-server.upstash.io:6379"
   ```
2. Build local database assets:
   ```bash
   cd backend
   npm install
   npx prisma db push
   ```
3. Launch the API Gateway in one terminal window:
   ```bash
   cd backend
   npm run dev
   ```
4. Start the Python ML Service in a second terminal:
   ```bash
   cd ml-service
   pip install -r requirements.txt
   python app/main.py
   ```
5. Spin up the React dashboard in a third terminal:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
6. Open `http://localhost:5173` to interact with the console.

### C. Verifying Heuristic Interception (Chrome Extension)
1. Navigate to `chrome://extensions/` in Google Chrome and enable **Developer Mode**.
2. Click **Load unpacked** and select the `/extension` folder in your project workspace.
3. Log in to the dashboard at `http://localhost` (or `http://localhost:5173`) with your analyst account to sync the Bearer JWT.
4. Navigate to the high-risk lexical path test link in your browser:
   ```text
   http://example.com/login/paypal-secure-verify-banking-update-access
   ```
5. Verify the bright crimson **SentinelAI Warn Shield** locks the viewport and blocks navigation!
