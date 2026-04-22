# Orbit Money

> DeFi liquidity protocol on Stellar — swap AGT tokens, provide liquidity, and earn yield. Powered by Soroban smart contracts with trustline-gated token access.

[![CI](https://github.com/{YOUR_USERNAME}/orbit-money/actions/workflows/ci.yml/badge.svg)](https://github.com/{YOUR_USERNAME}/orbit-money/actions)
[![Security](https://github.com/{YOUR_USERNAME}/orbit-money/actions/workflows/security.yml/badge.svg)](https://github.com/{YOUR_USERNAME}/orbit-money/actions)

---

## Live demo

**[https://orbit-money.vercel.app](https://orbit-money.vercel.app)**

---

## Screenshots

### Mobile view (375px)

![Mobile view](./screenshots/mobile-375.png)
_Full mobile layout: bottom nav, TrustlineCard, SwapCard at 375px_

### CI/CD pipeline — GitHub Actions

![CI/CD pipeline](./screenshots/ci-pipeline.png)
_7-job pipeline: lint → test → build → deploy-preview → deploy-production_

---

## Contract addresses — Stellar Testnet

| Contract | Contract ID | Init Tx Hash |
|---|---|---|
| AGT Token (Soroban) | `{FILL_AFTER_DEPLOY}` | `{FILL_AFTER_DEPLOY}` |
| Liquidity Pool | `{FILL_AFTER_DEPLOY}` | `{FILL_AFTER_DEPLOY}` |
| Bridge | `{FILL_AFTER_DEPLOY}` | `{FILL_AFTER_DEPLOY}` |

---

## Token details

| Field | Value |
|---|---|
| Token name | Orbit Money Token |
| Symbol | AGT |
| Decimals | 7 |
| Total supply | 1,000,000 AGT |
| Issuer address | `{FILL_AFTER_DEPLOY}` |
| Asset string | `AGT:{FILL_AFTER_DEPLOY}` |
| Explorer | [Stellar Expert](https://stellar.expert/explorer/testnet/asset/AGT-{FILL_AFTER_DEPLOY}) |

---

## Trustline setup

AGT is a custom Stellar asset. Every wallet must establish a trustline before receiving AGT.

**Automatic (via app):**
1. Connect Freighter wallet
2. Click **"Add Trustline"** on the orange warning banner
3. Approve the transaction in Freighter

**Manual (via Stellar Laboratory):**
```
Asset code:   AGT
Asset issuer: {FILL_AFTER_DEPLOY}
Limit:        1000000
```

**Via script:**
```bash
STELLAR_ISSUER_SECRET=S... node scripts/setup-trustlines.js
```

**Check existing trustline:**
```bash
node scripts/check-trustline.js G...YOUR_PUBLIC_KEY
```

---

## Inter-contract call flow

```
User → Bridge.batch_operation(amount)
         ├─ env.invoke_contract() → LiquidityPool.swap(user, token_in, amount)
         │     └─ env.invoke_contract() → AGTToken.transfer(pool, user, amount_out)
         └─ env.invoke_contract() → AGTToken.transfer(user, admin, fee)
```

The `Bridge` contract demonstrates Soroban inter-contract calls — a single user transaction triggers atomic execution across all three contracts.

---

## Architecture

```
Frontend (Next.js 14)
  ├─ Freighter wallet     (@stellar/freighter-api)
  ├─ SWR polling          (Horizon API + Soroban RPC, 2-10s refresh)
  ├─ framer-motion        (Zero-G animations, zeroG / stagger / slideIn)
  └─ lucide-react         (ArrowUpDown, Droplets, Activity, Wallet, …)

Stellar Testnet
  ├─ AGT Token contract   (Soroban, SEP-41, 1% fee on transfer)
  ├─ Liquidity Pool       (Soroban, AMM x*y=k)
  └─ Bridge contract      (Soroban, inter-contract batch ops)

Horizon API
  └─ https://horizon-testnet.stellar.org

Soroban RPC
  └─ https://soroban-testnet.stellar.org
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Contracts | Rust, Soroban SDK 21, soroban-token-sdk 21 |
| Token standard | SEP-41 (Stellar) |
| Frontend framework | Next.js 14 (App Router) |
| Styling | Vanilla CSS (glassmorphism, CSS variables) |
| Wallet | Freighter (`@stellar/freighter-api`) |
| Chain SDK | `@stellar/stellar-sdk` |
| Data streaming | SWR (`refreshInterval`: 2000–10000ms) |
| Animations | framer-motion (Zero-G engine) |
| Icons | lucide-react |
| CI/CD | GitHub Actions (7-job pipeline) |
| Deployment | Vercel |
| Security | cargo-audit (weekly cron) |

---

## Project structure

```
antigravity/
├── contracts/
│   ├── Cargo.toml              # workspace
│   ├── agt-token/
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs          # SEP-41 token, 1% treasury fee
│   │       └── test.rs         # 8 tests
│   ├── liquidity-pool/
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs          # AMM (x*y=k), inter-contract calls
│   │       └── test.rs         # 6 tests
│   └── bridge/
│       ├── Cargo.toml
│       └── src/
│           ├── lib.rs          # batch_operation, 2x inter-contract
│           └── test.rs         # 3 tests
├── frontend/
│   ├── app/
│   │   ├── layout.tsx          # SWR provider + Navbar
│   │   ├── globals.css         # design tokens, glass cards
│   │   ├── page.tsx            # Hero + StatsBar + feature cards
│   │   ├── swap/page.tsx       # SwapCard AGT↔XLM
│   │   ├── pool/page.tsx       # Add/Remove liquidity
│   │   ├── dashboard/page.tsx  # Balances + TrustlineCard + EventFeed
│   │   └── api/
│   │       ├── events/route.ts
│   │       ├── price/route.ts
│   │       ├── pool/route.ts
│   │       └── balance/[publicKey]/route.ts
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── BottomNav.tsx
│   │   ├── TrustlineCard.tsx
│   │   ├── EventFeed.tsx
│   │   ├── SwapCard.tsx
│   │   └── StatsBar.tsx
│   ├── hooks/
│   │   ├── useFreighter.ts
│   │   ├── useTrustline.ts
│   │   ├── useContractEvents.ts
│   │   ├── useAGTPrice.ts
│   │   ├── usePoolStats.ts
│   │   └── useAGTBalance.ts
│   └── lib/
│       └── animations.ts       # floatUp, zeroG, stagger, slideIn, …
├── scripts/
│   ├── deploy.js               # 6-step deploy: fund→deploy→init→mint→lp→save
│   ├── setup-trustlines.js     # AGT trustline + issue supply
│   └── check-trustline.js      # query trustline status for any account
├── deployments/
│   └── testnet.json            # auto-generated by deploy.js
├── .github/
│   └── workflows/
│       ├── ci.yml              # 7-job CI/CD pipeline
│       └── security.yml        # cargo-audit + npm audit (weekly)
├── Makefile
└── README.md
```

---

## Local development

### Prerequisites

- Rust stable + `wasm32-unknown-unknown` target
- `soroban-cli` (`cargo install --locked soroban-cli --features opt`)
- Node.js 20+
- Freighter browser extension ([freighter.app](https://www.freighter.app))
- Stellar testnet accounts (use Friendbot below)

### Rust toolchain setup

```bash
rustup target add wasm32-unknown-unknown
cargo install --locked soroban-cli --features opt
```

### Clone + install

```bash
git clone https://github.com/{YOUR_USERNAME}/orbit-money
cd orbit-money

# Build contracts
cd contracts && cargo build

# Install frontend deps
cd ../frontend && npm install
cp .env.example .env.local
# → Fill in .env.local with your contract IDs and keys
```

### `.env.local` required keys

```env
# Stellar network
NEXT_PUBLIC_STELLAR_NETWORK=TESTNET
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_SOROBAN_RPC=https://soroban-testnet.stellar.org

# Contract IDs (from deployments/testnet.json after deploy)
NEXT_PUBLIC_AGT_CONTRACT_ID={FILL_AFTER_DEPLOY}
NEXT_PUBLIC_POOL_CONTRACT_ID={FILL_AFTER_DEPLOY}
NEXT_PUBLIC_BRIDGE_CONTRACT_ID={FILL_AFTER_DEPLOY}
NEXT_PUBLIC_AGT_ISSUER={FILL_AFTER_DEPLOY}

# Secrets (server-side only, never NEXT_PUBLIC_)
STELLAR_ISSUER_SECRET=S...
STELLAR_DISTRIBUTOR_SECRET=S...
```

### Create testnet accounts

```bash
# Fund issuer via Friendbot
curl "https://friendbot.stellar.org?addr=YOUR_ISSUER_PUBLIC_KEY"

# Fund distributor
curl "https://friendbot.stellar.org?addr=YOUR_DISTRIBUTOR_PUBLIC_KEY"
```

---

## Run tests

```bash
make test
# or:
cd contracts && cargo test --all -- --nocapture
```

All 17 tests across 3 contracts:

| Contract | Tests |
|---|---|
| `agt-token` | `test_initialize`, `test_mint`, `test_mint_unauthorized`, `test_transfer_fee`, `test_burn`, `test_set_treasury`, `test_events_mint`, `test_balance_zero` |
| `liquidity-pool` | `test_add_liquidity`, `test_get_price`, `test_swap_output`, `test_remove_liquidity`, `test_swap_event`, `test_inter_contract_call` |
| `bridge` | `test_batch_operation`, `test_zero_amount_panics`, `test_get_contracts` |

---

## Build contracts

```bash
make build-contracts

# Individually:
cargo build --target wasm32-unknown-unknown --release -p agt-token
cargo build --target wasm32-unknown-unknown --release -p liquidity-pool
cargo build --target wasm32-unknown-unknown --release -p bridge

# Output:
# contracts/target/wasm32-unknown-unknown/release/agt_token.wasm
# contracts/target/wasm32-unknown-unknown/release/liquidity_pool.wasm
# contracts/target/wasm32-unknown-unknown/release/bridge.wasm
```

---

## Deploy to Stellar Testnet

```bash
# Full 6-step deploy (fund → deploy → init → mint → liquidity → save)
STELLAR_ISSUER_SECRET=S... STELLAR_DISTRIBUTOR_SECRET=S... make deploy

# Or step by step:
make trustlines    # Set up AGT trustline + issue 1M AGT to distributor
```

The deploy script runs these steps automatically:

| Step | What happens |
|---|---|
| 1. Fund | Friendbot funds issuer + distributor if balance < 10 XLM |
| 2. Deploy | Deploys 3 WASM contracts via `soroban contract deploy` |
| 3. Initialize | Calls `initialize` on each contract with admin + params |
| 4. Mint | Mints 1,000,000 AGT (10,000,000,000,000 stroops) to distributor |
| 5. Liquidity | Adds 100k AGT + 50k XLM as initial pool reserves |
| 6. Save | Writes all contract IDs + tx hashes to `deployments/testnet.json` |

---

## Run the frontend

```bash
cd frontend && npm run dev
# Open http://localhost:3000
```

**Pages:**

| Route | Description |
|---|---|
| `/` | Hero + live stats (TVL, AGT price, 24h volume) |
| `/swap` | Swap AGT ↔ XLM with live rate + 1% fee display |
| `/pool` | Add/remove liquidity, shows reserves and APY |
| `/dashboard` | Wallet balances, trustline status, live tx feed |

---

## CI/CD pipeline

```
push or PR → main / develop
  ├─ lint-contracts    (cargo fmt --check + cargo clippy -D warnings)
  ├─ test-contracts    (cargo test --all, 17 tests)
  ├─ build-contracts   (3x WASM, uploaded as artifact)
  ├─ lint-frontend     (ESLint + tsc --noEmit)
  ├─ build-frontend    (next build, .next/ uploaded)
  ├─ deploy-preview    (Vercel preview URL, PR comment — PRs only)
  └─ deploy-production (Vercel prod + GitHub Release — main push only)

weekly (Monday 00:00 UTC):
  └─ security          (cargo-audit + npm audit --audit-level=high)
```

### Required GitHub secrets

| Secret | Description |
|---|---|
| `VERCEL_TOKEN` | Vercel personal access token |
| `STELLAR_ISSUER_SECRET` | `S...` Stellar issuer keypair |
| `STELLAR_DISTRIBUTOR_SECRET` | `S...` Stellar distributor keypair |

---

## Makefile targets

```bash
make help            # List all targets
make test            # Run all 17 contract tests
make build-contracts # Build all 3 WASM binaries
make build-frontend  # Build Next.js production bundle
make lint            # Rust fmt+clippy + ESLint+tsc
make deploy          # Full 6-step Stellar Testnet deploy
make trustlines      # Set up AGT trustline + issue supply
make ci              # Full pipeline: lint → test → build
make clean           # Remove all build artifacts
```

---

## Contract interfaces

### AGT Token (`agt-token`)

| Function | Access | Description |
|---|---|---|
| `initialize(admin, name, symbol, decimals)` | — | One-time setup |
| `mint(to, amount)` | Admin only | Create AGT tokens |
| `burn(from, amount)` | Caller | Destroy tokens |
| `transfer(from, to, amount)` | Caller | Send tokens; 1% fee → treasury |
| `balance(id)` | Public | Query balance |
| `total_supply()` | Public | Total minted supply |
| `set_treasury(treasury)` | Admin only | Update fee recipient |
| `decimals()` / `name()` / `symbol()` | Public | SEP-41 metadata |

### Liquidity Pool (`liquidity-pool`)

| Function | Access | Description |
|---|---|---|
| `initialize(token_contract, admin)` | — | One-time setup |
| `add_liquidity(provider, token_amount, xlm_amount)` | Caller | Deposit AGT + XLM, receive LP shares |
| `remove_liquidity(provider, lp_amount)` | Caller | Burn LP shares, receive proportional assets |
| `swap(user, token_in, amount_in) → i128` | Caller | AMM swap using x·y=k formula |
| `get_price()` | Public | Current XLM/AGT price (×1000) |
| `get_reserves()` | Public | `(agtReserve, xlmReserve)` |

### Bridge (`bridge`)

| Function | Access | Description |
|---|---|---|
| `initialize(token_contract, pool_contract, admin)` | — | One-time setup |
| `batch_operation(user, amount)` | Caller | Atomic: swap via pool + fee transfer via token |
| `get_contracts()` | Public | `(tokenAddress, poolAddress)` |

---

## Events emitted

| Contract | Event | Payload |
|---|---|---|
| AGT Token | `mint` | `(to, amount)` |
| AGT Token | `burn` | `(from, amount)` |
| AGT Token | `transfer` | `(from, to, amount_after_fee)` |
| AGT Token | `FeeCollected` | `(treasury, fee)` |
| Liquidity Pool | `LiquidityAdded` | `(provider, token_amount, xlm_amount)` |
| Liquidity Pool | `LiquidityRemoved` | `(provider, token_out, xlm_out)` |
| Liquidity Pool | `swap` | `(user, amount_in, amount_out)` |
| Bridge | `BatchExecuted` | `(user, amount)` |

---

## SWR polling intervals

| Hook | Endpoint | Refresh |
|---|---|---|
| `useContractEvents` | `GET /api/events` | **2 000 ms** |
| `useAGTPrice` | `GET /api/price` | 5 000 ms |
| `useTrustline` | `GET /api/balance/{pk}` | 5 000 ms |
| `useAGTBalance` | `GET /api/balance/{pk}` | 8 000 ms |
| `usePoolStats` | `GET /api/pool` | 10 000 ms |

---

## Security

- **Weekly `cargo audit`**: CVE scan on all Rust crate dependencies
- **`npm audit --audit-level=high`**: Node vulnerability scan on every push
- **`dependency-review-action`**: Blocks PRs that introduce high-severity deps
- **No secrets in frontend**: All `STELLAR_ISSUER_SECRET` / `STELLAR_DISTRIBUTOR_SECRET` are server-side only, never exposed as `NEXT_PUBLIC_`
- **Auth checks on-chain**: `admin.require_auth()` enforced in `mint` and `set_treasury`
- **Overflow-safe**: All contracts compiled with `overflow-checks = true`

---

## License

MIT © Orbit Money

---

> Built on [Stellar](https://stellar.org) · Powered by [Soroban](https://soroban.stellar.org) · Deployed on [Vercel](https://vercel.com)
