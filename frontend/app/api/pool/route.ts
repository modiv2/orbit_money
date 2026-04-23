import { NextResponse } from 'next/server';
import { SorobanRpc, Contract, Networks, xdr, Account, Horizon, TransactionBuilder } from '@stellar/stellar-sdk';

const RPC_URL = process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const POOL_CONTRACT = process.env.NEXT_PUBLIC_POOL_CONTRACT_ADDRESS || '';
const XLM_PRICE_USD = 0.12;

export async function GET() {
  try {
    if (!POOL_CONTRACT) {
      return NextResponse.json({
        tvl: '0', xlmReserve: '0', agtReserve: '0',
        volume24h: '0', apy: '12.5',
      });
    }

    const server = new SorobanRpc.Server(RPC_URL);
    const contract = new Contract(POOL_CONTRACT);

    // To simulate, we need a dummy transaction. 
    // We'll use a random source account just for the simulation.
    const sourceAccount = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
    const horizon = new Horizon.Server(RPC_URL.replace('soroban', 'horizon')); // Best effort to guess horizon from RPC
    
    // Actually, we can just use simulateTransaction with a transaction built with dummy sequence
    const getReservesOp = contract.call('get_reserves');
    
    // Minimal transaction for simulation
    const dummyAccount = new Account(sourceAccount, "0");
    const tx = new TransactionBuilder(dummyAccount, {
      fee: "100",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(getReservesOp)
      .setTimeout(0)
      .build();

    const simulation = await server.simulateTransaction(tx);

    let xlmReserve = '0';
    let agtReserve = '0';

    if (SorobanRpc.Api.isSimulationSuccess(simulation) && simulation.result) {
      const val = simulation.result.retval;
      // val is expected to be a scvVec of two i128s
      if (val.switch() === xdr.ScValType.scvVec()) {
        const items = val.vec() || [];
        // Helper to convert i128 to BigInt
        const scValToBigInt = (scVal: xdr.ScVal): bigint => {
          const i128 = scVal.i128();
          const lo = BigInt(i128.lo().toString());
          const hi = BigInt(i128.hi().toString());
          return (hi << 64n) | lo;
        };

        if (items.length >= 2) {
          agtReserve = scValToBigInt(items[0]).toString();
          xlmReserve = scValToBigInt(items[1]).toString();
        }
      }
    }

    const xlmNum = parseFloat(xlmReserve) / 1e7;
    const agtNum = parseFloat(agtReserve) / 1e7;
    // Simple TVL calculation: XLM price ($0.12) + AGT price (assumed $0.05 or similar)
    const tvl = ((xlmNum * XLM_PRICE_USD) + (agtNum * 0.05)).toFixed(2);

    return NextResponse.json({
      tvl, xlmReserve, agtReserve,
      volume24h: '0', apy: '12.5',
    });
  } catch (err) {
    console.error("Pool stats error:", err);
    return NextResponse.json({
      tvl: '0', xlmReserve: '0', agtReserve: '0',
      volume24h: '0', apy: '12.5',
    });
  }
}
