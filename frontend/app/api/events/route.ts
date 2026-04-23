import { NextResponse } from 'next/server';
import { SorobanRpc, scValToNative } from '@stellar/stellar-sdk';

const RPC_URL = process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const POOL_CONTRACT = process.env.NEXT_PUBLIC_POOL_CONTRACT_ADDRESS || '';

export async function GET() {
  try {
    if (!POOL_CONTRACT) return NextResponse.json({ events: [] });

    const server = new SorobanRpc.Server(RPC_URL);
    
    // Get latest ledger to determine range
    const networkInfo = await server.getLatestLedger();
    const latestLedger = networkInfo.sequence;
    const startLedger = Math.max(1, latestLedger - 1000); // Look back 1000 ledgers

    const response = await server.getEvents({
      startLedger,
      filters: [
        {
          type: 'contract',
          contractIds: [POOL_CONTRACT],
        },
      ],
    });

    const events = (response.events || []).map((ev) => {
      const native = scValToNative(ev.value);
      let amount = '0';
      let type = 'liquidity';
      
      // Parse event based on contract logic
      // ev.topic is an array of ScVals. ev.topic[0] is the symbol (e.g. LiquidityAdded)
      const topic = ev.topic.map(t => scValToNative(t));
      const topicName = topic[0];

      if (topicName === 'LiquidityAdded' || topicName === 'LiquidityRemoved') {
        type = 'liquidity';
        // (token_amount, xlm_amount)
        amount = Array.isArray(native) ? (native[0] / 1e7).toString() : '0';
      } else if (topicName === 'swap') {
        type = 'swap';
        // (amount_in, amount_out)
        amount = Array.isArray(native) ? (native[0] / 1e7).toString() : '0';
      }

      return {
        id: ev.id,
        type,
        from: topic[1] || 'Unknown',
        amount,
        txHash: (ev as any).transactionHash || '',
        ledger: ev.ledger,
        timestamp: ev.ledgerClosedAt || new Date().toISOString(),
      };
    }).reverse(); // Latest first

    return NextResponse.json({ events });
  } catch (err) {
    console.error("Events API error:", err);
    return NextResponse.json({ events: [] });
  }
}
