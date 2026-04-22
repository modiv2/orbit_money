/**
 * scripts/deploy.js
 *
 * Full Orbit Money deployment script.
 * Covers: fund → deploy → initialize → mint → add_liquidity → save record.
 *
 * Usage:
 *   STELLAR_ISSUER_SECRET=S... STELLAR_DISTRIBUTOR_SECRET=S... node scripts/deploy.js
 */

'use strict';

const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');
const https = require('https');
const { Keypair, StellarTomlResolver } = require('@stellar/stellar-sdk');

// ─── ENV ──────────────────────────────────────────────────────────────────────
const ISSUER_SECRET      = process.env.STELLAR_ISSUER_SECRET;
const DISTRIBUTOR_SECRET = process.env.STELLAR_DISTRIBUTOR_SECRET;
const RPC_URL   = process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const HORIZON   = process.env.HORIZON_URL     || 'https://horizon-testnet.stellar.org';
const NETWORK   = 'testnet';
const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';

if (!ISSUER_SECRET || !DISTRIBUTOR_SECRET) {
  console.error('\n[ERROR] Set STELLAR_ISSUER_SECRET and STELLAR_DISTRIBUTOR_SECRET\n');
  process.exit(1);
}

const issuerKp      = Keypair.fromSecret(ISSUER_SECRET);
const distributorKp = Keypair.fromSecret(DISTRIBUTOR_SECRET);
const ISSUER_PUB      = issuerKp.publicKey();
const DISTRIBUTOR_PUB = distributorKp.publicKey();

const WASM_DIR    = path.join(__dirname, '..', 'contracts', 'target', 'wasm32-unknown-unknown', 'release');
const DEPLOY_DIR  = path.join(__dirname, '..', 'deployments');
const DEPLOY_FILE = path.join(DEPLOY_DIR, 'testnet.json');

if (!fs.existsSync(DEPLOY_DIR)) fs.mkdirSync(DEPLOY_DIR, { recursive: true });

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const log  = (msg) => console.log(`\n  ${msg}`);
const ok   = (msg) => console.log(`  ✓  ${msg}`);
const fail = (msg) => { console.error(`  ✗  ${msg}`); process.exit(1); };

/** Run a shell command and return trimmed stdout. */
function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...opts }).trim();
  } catch (e) {
    throw new Error(e.stderr || e.message);
  }
}

/** HTTP GET → parsed JSON. */
function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch { resolve(body); }
      });
    }).on('error', reject);
  });
}

/** Get XLM balance for a public key via Horizon. */
async function getXlmBalance(pubKey) {
  try {
    const acc = await httpGet(`${HORIZON}/accounts/${pubKey}`);
    const native = (acc.balances || []).find((b) => b.asset_type === 'native');
    return parseFloat(native?.balance || '0');
  } catch {
    return 0;
  }
}

/** Soroban CLI shorthand. */
function soroban(subCmd) {
  const cmd = `soroban ${subCmd} --network ${NETWORK} --rpc-url ${RPC_URL} --network-passphrase "${NETWORK_PASSPHRASE}"`;
  return run(cmd);
}

/** Deploy a WASM file and return contract ID. */
function deployWasm(wasmPath, sourceSecret) {
  return soroban(
    `contract deploy --wasm ${wasmPath} --source ${sourceSecret} --fee 10000`
  );
}

/** Invoke a contract function and return stdout (tx hash or result). */
function invoke(contractId, sourceSecret, fn, args = '') {
  return soroban(
    `contract invoke --id ${contractId} --source ${sourceSecret} --fee 10000 -- ${fn} ${args}`
  );
}

// ─── STEP 1 — Fund accounts via Friendbot ────────────────────────────────────
async function step1_fund() {
  console.log('\n═══ STEP 1 — Fund accounts via Friendbot ═══');

  for (const [label, pubKey] of [['Issuer', ISSUER_PUB], ['Distributor', DISTRIBUTOR_PUB]]) {
    const bal = await getXlmBalance(pubKey);
    if (bal >= 10) {
      ok(`${label} (${pubKey.slice(0,6)}…) already has ${bal.toFixed(2)} XLM — skipping`);
      continue;
    }
    log(`Funding ${label} via Friendbot…`);
    try {
      const res = await httpGet(`https://friendbot.stellar.org?addr=${pubKey}`);
      if (res.hash) {
        ok(`${label} funded — tx: ${res.hash}`);
      } else {
        ok(`${label} funded`);
      }
    } catch (e) {
      fail(`Friendbot failed for ${label}: ${e.message}`);
    }
    // Wait for ledger
    await new Promise((r) => setTimeout(r, 2000));
  }
}

// ─── STEP 2 — Deploy contracts ────────────────────────────────────────────────
function step2_deploy() {
  console.log('\n═══ STEP 2 — Deploy Soroban contracts ═══');

  const contracts = [
    { name: 'AGT Token',      wasm: path.join(WASM_DIR, 'agt_token.wasm') },
    { name: 'Liquidity Pool', wasm: path.join(WASM_DIR, 'liquidity_pool.wasm') },
    { name: 'Bridge',         wasm: path.join(WASM_DIR, 'bridge.wasm') },
  ];

  const ids = {};
  for (const { name, wasm } of contracts) {
    if (!fs.existsSync(wasm)) {
      fail(`WASM not found: ${wasm}\nRun: make build-contracts`);
    }
    log(`Deploying ${name} from ${path.basename(wasm)}…`);
    try {
      const contractId = deployWasm(wasm, ISSUER_SECRET);
      ok(`${name} → ${contractId}`);
      ids[name] = contractId;
    } catch (e) {
      fail(`Deploy failed for ${name}: ${e.message}`);
    }
  }

  return {
    agtId:    ids['AGT Token'],
    poolId:   ids['Liquidity Pool'],
    bridgeId: ids['Bridge'],
  };
}

// ─── STEP 3 — Initialize contracts ───────────────────────────────────────────
function step3_initialize(agtId, poolId, bridgeId) {
  console.log('\n═══ STEP 3 — Initialize contracts ═══');
  const hashes = {};

  // AGT Token
  log('Initializing AGT Token…');
  try {
    hashes.agtInit = invoke(agtId, ISSUER_SECRET, 'initialize',
      `--admin ${ISSUER_PUB} --name "Orbit Money Token" --symbol "AGT" --decimals 7`
    );
    ok(`AGT initialized — ${hashes.agtInit}`);
  } catch (e) {
    fail(`AGT init failed: ${e.message}`);
  }

  // Liquidity Pool
  log('Initializing Liquidity Pool…');
  try {
    hashes.poolInit = invoke(poolId, ISSUER_SECRET, 'initialize',
      `--token_contract ${agtId} --admin ${ISSUER_PUB}`
    );
    ok(`Pool initialized — ${hashes.poolInit}`);
  } catch (e) {
    fail(`Pool init failed: ${e.message}`);
  }

  // Bridge
  log('Initializing Bridge…');
  try {
    hashes.bridgeInit = invoke(bridgeId, ISSUER_SECRET, 'initialize',
      `--token_contract ${agtId} --pool_contract ${poolId} --admin ${ISSUER_PUB}`
    );
    ok(`Bridge initialized — ${hashes.bridgeInit}`);
  } catch (e) {
    fail(`Bridge init failed: ${e.message}`);
  }

  return hashes;
}

// ─── STEP 4 — Mint initial supply ────────────────────────────────────────────
function step4_mint(agtId) {
  console.log('\n═══ STEP 4 — Mint initial supply ═══');
  // 1,000,000 AGT × 10^7 = 10_000_000_000_000
  const MINT_AMOUNT = '10000000000000';
  log(`Minting ${MINT_AMOUNT} stroops (1,000,000 AGT) → ${DISTRIBUTOR_PUB.slice(0, 8)}…`);
  try {
    const txHash = invoke(agtId, ISSUER_SECRET, 'mint',
      `--to ${DISTRIBUTOR_PUB} --amount ${MINT_AMOUNT}`
    );
    ok(`Minted — ${txHash}`);
    return txHash;
  } catch (e) {
    fail(`Mint failed: ${e.message}`);
  }
}

// ─── STEP 5 — Add initial liquidity ──────────────────────────────────────────
function step5_liquidity(poolId) {
  console.log('\n═══ STEP 5 — Add initial liquidity ═══');
  // 100,000 AGT (×10^7) and 50,000 XLM (×10^7)
  const TOKEN_AMT = '1000000000000';  // 100,000 AGT
  const XLM_AMT   = '500000000000';   // 50,000 XLM equivalent

  log(`Adding liquidity: ${TOKEN_AMT} AGT stroops + ${XLM_AMT} XLM stroops…`);
  try {
    const txHash = invoke(poolId, DISTRIBUTOR_SECRET, 'add_liquidity',
      `--provider ${DISTRIBUTOR_PUB} --token_amount ${TOKEN_AMT} --xlm_amount ${XLM_AMT}`
    );
    ok(`Liquidity added — ${txHash}`);
    return txHash;
  } catch (e) {
    fail(`Add liquidity failed: ${e.message}`);
  }
}

// ─── STEP 6 — Save deployment record ─────────────────────────────────────────
function step6_save(data) {
  console.log('\n═══ STEP 6 — Save deployment record ═══');

  const record = {
    network: 'testnet',
    deployedAt: new Date().toISOString(),
    issuerPublicKey: ISSUER_PUB,
    distributorPublicKey: DISTRIBUTOR_PUB,
    agtAsset: `AGT:${ISSUER_PUB}`,
    AGTToken: {
      contractId: data.agtId,
      wasmHash: data.agtWasmHash || '',
      initTxHash: data.agtInit || '',
    },
    LiquidityPool: {
      contractId: data.poolId,
      wasmHash: data.poolWasmHash || '',
      initTxHash: data.poolInit || '',
    },
    Bridge: {
      contractId: data.bridgeId,
      wasmHash: data.bridgeWasmHash || '',
      initTxHash: data.bridgeInit || '',
    },
    trustline: {
      asset: 'AGT',
      issuer: ISSUER_PUB,
      limit: '1000000',
      setupTxHash: data.trustlineSetupTxHash || '',
    },
  };

  fs.writeFileSync(DEPLOY_FILE, JSON.stringify(record, null, 2));
  ok(`Record saved → ${DEPLOY_FILE}`);
  return record;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   Orbit Money — Full Deploy                ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log(`\n  Issuer:      ${ISSUER_PUB}`);
  console.log(`  Distributor: ${DISTRIBUTOR_PUB}`);
  console.log(`  Network:     ${NETWORK} (${RPC_URL})`);

  await step1_fund();

  const { agtId, poolId, bridgeId } = step2_deploy();
  const { agtInit, poolInit, bridgeInit } = step3_initialize(agtId, poolId, bridgeId);
  const mintTxHash  = step4_mint(agtId);
  const lpTxHash    = step5_liquidity(poolId);

  const record = step6_save({
    agtId, poolId, bridgeId,
    agtInit, poolInit, bridgeInit,
    mintTxHash, lpTxHash,
  });

  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   Deployment complete! 🚀                  ║');
  console.log('╠════════════════════════════════════════════╣');
  console.log(`║  AGT Token:  ${record.AGTToken.contractId.padEnd(30)} ║`);
  console.log(`║  Pool:       ${record.LiquidityPool.contractId.padEnd(30)} ║`);
  console.log(`║  Bridge:     ${record.Bridge.contractId.padEnd(30)} ║`);
  console.log('╚════════════════════════════════════════════╝');
  console.log('\n  Next steps:');
  console.log('  1. Copy contract IDs into frontend/.env.local');
  console.log('  2. Run: node scripts/setup-trustlines.js');
  console.log('  3. Run: cd frontend && npm run dev\n');
}

main().catch((err) => {
  console.error('\n[FATAL]', err.message);
  process.exit(1);
});
