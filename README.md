# 🐂 THE BIG BULL

> **"Think Smart. Play Strategic. Rule the Bull Market."**

THE BIG BULL is a high-stakes, team-based live quiz competition platform combining rapid intellectual recall, virtual coin risk management, tactical lifelines, and esports arena presentation.

---

## 📑 Table of Contents

1. [Key Capabilities](#-key-capabilities)
2. [Technology Stack & Architecture](#-technology-stack--architecture)
3. [Four Authoritative Interfaces](#-four-authoritative-interfaces)
4. [Quick Start & Local Setup](#-quick-start--local-setup)
5. [Demo Credentials & Access Codes](#-demo-credentials--access-codes)
6. [Game Rules, Timer & Coin Economy](#-game-rules-timer--coin-economy)
7. [Tactical Lifelines Specification](#-tactical-lifelines-specification)
8. [Practical Anti-Cheating Controls & Limitations](#-practical-anti-cheating-controls--limitations)
9. [Local Network & Mobile Wi-Fi Testing](#-local-network--mobile-wi-fi-testing)
10. [Docker PostgreSQL Production Setup](#-docker-postgresql-production-setup)
11. [Automated Testing Suite (20 Rules Verified)](#-automated-testing-suite)

---

## ⚡ Key Capabilities

* **Authoritative Game State Machine**: Server controls progression through `LOBBY` ➔ `READY` ➔ `QUESTION_ACTIVE` ➔ `QUESTION_PAUSED` ➔ `QUESTION_CLOSED` ➔ `ANSWER_REVEAL` ➔ `LEADERBOARD` ➔ `FINISHED`.
* **5-Minute Server-Controlled Timer**: Millisecond-accurate server deadlines. Pause freezes remaining time; resume recalculates deadline. Reconnecting clients never receive extra time.
* **Atomic Coin Economy**: Teams start with **5,000 virtual coins**. Lifelines are deducted atomically on the server with auditable ledger transactions and concurrency protections.
* **Smart Board Arena Display**: Projector/TV-optimized UI with large typography, live response counters, high-visibility countdown, dynamic QR code, and podium celebration.
* **Mobile-First Team Terminal**: Touch-optimized interface for smartphones with answer locking, tactical lifeline activations, and realtime server synchronization.
* **Layered Anti-Cheating System**: Page Visibility API monitoring, window blur tracking, single active session enforcement, server-side answer locking, and rate limiting.
* **Dual Storage Engine**: Full **Prisma ORM + PostgreSQL** models with Docker Compose, accompanied by an automatic **local-first persistent Demo Store** for zero-dependency local testing.

---

## 🛠️ Technology Stack & Architecture

* **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide React icons, Framer Motion.
* **Backend**: Node.js HTTP server integrating Next.js and Socket.IO on a single unified port.
* **Real-Time Communication**: Socket.IO with authenticated room isolation:
  * `board_room`: Public arena display (sanitized data, zero answer leaks).
  * `admin_room`: Full control commands, detailed answer matrix, audit logs, and security alerts.
  * `team_<teamId>`: Private rooms for confidential hints, clues, and balance updates.
* **Database & Persistence**:
  * PostgreSQL 16 (via Docker Compose).
  * Prisma ORM with 11 relational models.
  * In-Memory & JSON-backed fallback (`.data/bigbull_state.json`) for seamless zero-Docker local runs.

---

## 🖥️ Four Authoritative Interfaces

| Interface | Route | Primary Role | Target Display |
| :--- | :--- | :--- | :--- |
| **Admin Dashboard** | `/admin` | Complete game orchestration, question CRUD, team management, CSV import/export, and audit logs. | Desktop / Laptop |
| **Smart Board Display** | `/board` | High-visibility presentation mode for audiences and projector screens. Features dynamic QR code to join. | Projector / TV / Smart Board |
| **Team Login** | `/join` | Secure access code entry with rate limiting and 1-tap quick demo team selector. | Mobile / Tablet / Desktop |
| **Team Game Terminal** | `/team` | Participant answering interface, 4 tactical lifelines dock, answer locking, and live timer sync. | Smartphones (iOS & Android) |

---

## 🚀 Quick Start & Local Setup

### 1. Prerequisites
* **Node.js** v20+ (tested on Node v24.15.0)
* **npm** v10+

### 2. Clone & Install
```bash
cd /Users/rajaryan/.gemini/antigravity/scratch/the-big-bull
npm install
```

### 3. Start the Unified Server
```bash
npm run dev
```

The application will start on `http://localhost:3000` with both Next.js App Router and the Socket.IO server running simultaneously.

### 4. Build for Production (Optional)
```bash
npm run build
npm start
```

---

## 🔑 Demo Credentials & Access Codes

### Administrator Account
* **URL**: [http://localhost:3000/admin](http://localhost:3000/admin)
* **Username**: `admin`
* **Password**: `bigbull2026`

### 8 Pre-Generated Demo Teams (Starting Balance: 5,000 Coins each)
| Team Code | Team Name | Demo Access Code | Starting Balance |
| :--- | :--- | :--- | :--- |
| `BULLS-101` | Apex Predators | `BULLS-101` | 5,000 Coins |
| `BULLS-102` | Wall Street Wolves | `BULLS-102` | 5,000 Coins |
| `BULLS-103` | Quantum Bulls | `BULLS-103` | 5,000 Coins |
| `BULLS-104` | Silicon Mavericks | `BULLS-104` | 5,000 Coins |
| `BULLS-105` | Galactic Capital | `BULLS-105` | 5,000 Coins |
| `BULLS-106` | Cyber Strikers | `BULLS-106` | 5,000 Coins |
| `BULLS-107` | Alpha Centauri | `BULLS-107` | 5,000 Coins |
| `BULLS-108` | Golden Horns | `BULLS-108` | 5,000 Coins |

> **Pro Tip**: On the `/join` page, use the **Quick Demo Login (1-Tap)** buttons to populate credentials and initialize your team terminal in one click.

---

## ⏱️ Game Rules, Timer & Coin Economy

### Scoring Rules
* **Correct Answer Reward**: Configurable (Default: `+1,000 Points`)
* **Incorrect Answer Penalty**: Configurable (Default: `-200 Points`)
* **Unanswered Penalty**: Configurable (Default: `0 Points`)
* **Lifelines**: Deducted from virtual coin balance immediately upon confirmation.

### 5-Minute Question Timer
* **Default Duration**: 300 seconds (5 minutes) per question (configurable per question or globally).
* **Authoritative Deadline**: The server records an absolute epoch timestamp `deadline = Date.now() + durationSeconds * 1000`.
* **Zero Client Drift**: Clients compute `remainingSeconds = Math.max(0, Math.ceil((deadline - now) / 1000))`. The server emits a 1-second synchronization tick to eliminate client clock skew.
* **Pause Mechanics**: On pause, the server freezes `remainingOnPause = deadline - Date.now()`. On resume, a new deadline is computed from `Date.now() + remainingOnPause`.
* **Auto-Close**: The server automatically closes submissions at the deadline with a 500ms network tolerance grace period.

---

## 💡 Tactical Lifelines Specification

| Lifeline | Cost | Server & Client Behavior |
| :--- | :--- | :--- |
| **1. Bull's Hint** | **500 Coins** | Server unlocks a private textual hint directly to the purchasing team. If no hint exists for the question, the transaction is rejected without charging coins. |
| **2. Vision Boost** | **1,500 Coins** | Server delivers a private visual clue image or diagram to the purchasing team's console. Rejected without coin deduction if no clue is attached. |
| **3. 50-50 Blast** | **2,000 Coins** | Server randomly selects exactly two incorrect options to eliminate. The client grays out and disables those options. The correct option is never eliminated. |
| **4. Bull's Pass** | **2,500 Coins** | Team skips the current round without answering. Moves the team to a resting screen. The global timer continues uninterrupted for competing teams. |

### Financial Safety Rules
1. A team can **never spend more coins than its available balance**.
2. Lifeline purchases are **atomic server transactions**.
3. Repeat purchases on the same question are rejected unless the admin explicitly enables them.
4. An auditable transaction ledger (`CoinTransaction`) records previous balance, new balance, question ID, and timestamp.

---

## 🛡️ Practical Anti-Cheating Controls & Limitations

### Implemented Security Layer
1. **Server-Side Answer Validation**: Correct answers are stored strictly on the server and are **never transmitted to participant browsers** before the reveal phase.
2. **Strict Deadline Enforcement**: Submissions received after the server deadline are rejected immediately.
3. **Session Security & Hashing**: Team access codes are hashed using **bcrypt**. Sessions are protected via HTTP-only cookies and cryptographic JWTs.
4. **Single Active Session Policy**: Configurable rule invalidating previous sessions if a team logs in on another device.
5. **Page Visibility & Focus Monitoring**:
   * Uses HTML5 Page Visibility API (`visibilitychange`) and `window.onblur`.
   * Displays polite warnings: *"Switching tabs or leaving the competition window is logged by invigilation."*
   * Sends real-time telemetry to the admin dashboard with flag counts.
6. **Rate Limiting & Replay Protection**: Protects login endpoints and socket dispatches from automated spamming.

### ⚠️ Honest Real-World Limitations
> [!IMPORTANT]
> **No web application can be completely cheat-proof.**
> * Browser JavaScript **cannot** prevent participants from looking at a physical second phone, smartwatch, camera, or external notes.
> * JavaScript **cannot** reliably detect every incognito tab or operating system screenshot.
> * Tab-switch monitoring tracks focus loss, but cannot detect someone consulting an in-person teammate or whispering.
> * **Recommendation**: Combine THE BIG BULL's digital controls with physical room invigilators, device bags, or monitored competition stations for strict tournament settings.

---

## 📶 Local Network & Mobile Wi-Fi Testing

To test with real phones on the same local Wi-Fi network:

1. **Find your development computer's Local IP**:
   * The server console automatically logs your IP upon launch:
     ```
     📶 Team Join (Wi-Fi): http://192.168.1.100:3000/join
     ```
   * Or run `ipconfig getifaddr en0` (Mac Wi-Fi) in terminal.

2. **Open the Smart Board**:
   * Navigate to `http://localhost:3000/board` on your computer.
   * The Smart Board dynamically displays a QR code pointing to `http://<YOUR_LOCAL_IP>:3000/join`.

3. **Scan with Mobile Phones**:
   * Connect participant phones to the **same Wi-Fi network**.
   * Open the phone camera, scan the Smart Board QR code, and tap to join.
   * Enter a demo code (e.g. `BULLS-101`) to start playing.

4. **Firewall / Port Notes**:
   * Ensure macOS Firewall allows incoming connections on port `3000`.
   * Do not open port `5432` (PostgreSQL) to the local network; only Next.js on port `3000` requires access.

---

## 🐳 Docker PostgreSQL Production Setup

When deploying to a production or staging environment with PostgreSQL:

### 1. Launch PostgreSQL Container
```bash
docker compose up -d
```

### 2. Run Prisma Migrations
```bash
npx prisma migrate dev --name init
```

### 3. Seed Database
```bash
npm run prisma:seed
```

### 4. Configure Environment
Set `STORAGE_MODE=postgres` in `.env` to enforce PostgreSQL persistence.

---

## 🧪 Automated Testing Suite

THE BIG BULL includes a comprehensive automated test suite verifying all 20 business, financial, and security rules specified in the competition contract.

Run the tests anytime:
```bash
npm test
```

### Verified Rules Summary (20 / 20 Tests Passing):
* ✅ **Rule 1**: Correct team authentication with valid credentials.
* ✅ **Rule 2**: Invalid access code rejection.
* ✅ **Rule 3**: Disabled team login rejection.
* ✅ **Rule 4**: Correct answer submission for active question.
* ✅ **Rule 5**: Duplicate answer rejection when locked.
* ✅ **Rule 6**: Strict submission rejection after deadline.
* ✅ **Rule 7**: Correct server-side timer closure and answer blocking.
* ✅ **Rule 8**: Bull’s Hint deduction (500 Coins) and private text delivery.
* ✅ **Rule 9**: Vision Boost deduction (1,500 Coins) and private visual delivery.
* ✅ **Rule 10**: 50-50 Blast elimination of exactly two wrong options (never the correct option).
* ✅ **Rule 11**: Bull’s Pass skip state and blocking subsequent answers.
* ✅ **Rule 12**: Insufficient coin balance rejection without deduction.
* ✅ **Rule 13**: Duplicate lifeline purchase rejection on same question.
* ✅ **Rule 14**: Safe handling of concurrent coin deductions.
* ✅ **Rule 15**: Score updates (+1000 / -200) without duplication.
* ✅ **Rule 16**: Tampered/unauthorized admin JWT rejection.
* ✅ **Rule 17**: Session token validation before protected actions.
* ✅ **Rule 18**: Reconnection without extra answer time (fixed deadline preserved).
* ✅ **Rule 19**: Game state recovery across server restarts.
* ✅ **Rule 20**: Strict cross-team lifeline and hint isolation.

---

## 🏆 Summary of URLs for Demo Evaluation

* **Landing Page**: [http://localhost:3000](http://localhost:3000)
* **Admin Dashboard**: [http://localhost:3000/admin](http://localhost:3000/admin) *(Username: `admin`, Password: `bigbull2026`)*
* **Smart Board Arena Display**: [http://localhost:3000/board](http://localhost:3000/board)
* **Team Terminal Login**: [http://localhost:3000/join](http://localhost:3000/join)
* **Team Mobile Console**: [http://localhost:3000/team](http://localhost:3000/team)

**Rule the Bull Market.** 🐂
