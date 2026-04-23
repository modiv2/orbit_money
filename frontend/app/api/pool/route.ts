import { NextResponse } from 'next/server';
import { SorobanRpc, Contract, Networks, xdr } from '@stellar/stellar-sdk';

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

    const getReservesOp = contract.call('get_reserves');
    const tx = await server.simulateTransaction(
      getReservesOp as unknown as Parameters<typeof server.simulateTransaction>[0]
    );

    let xlmReserve = '0';
    let agtReserve = '0';

    if (SorobanRpc.Api.isSimulationSuccess(tx) && tx.result) {
      const val = tx.result.retval;
      const tuple = xdr.ScVal.scvVec(val as unknown as xdr.ScVal[]);
      const items = tuple?.vec() || [];
      agtReserve = items[0]?.i128()?.lo()?.toString() || '0';
      xlmReserve = items[1]?.i128()?.lo()?.toString() || '0';
    }

    const xlmNum = parseFloat(xlmReserve) / 1e7;
    const agtNum = parseFloat(agtReserve) / 1e7;
    const tvl = ((xlmNum * XLM_PRICE_USD) + (agtNum * 0.05)).toFixed(2);

    return NextResponse.json({
      tvl, xlmReserve, agtReserve,
      volume24h: '0', apy: '12.5',
    });
  } catch {
    return NextResponse.json({
      tvl: '0', xlmReserve: '0', agtReserve: '0',
      volume24h: '0', apy: '12.5',
    });
  }
}
