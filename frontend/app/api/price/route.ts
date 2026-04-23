import { NextResponse } from 'next/server';
import { SorobanRpc, Contract, scValToNative, Account, TransactionBuilder, Networks } from '@stellar/stellar-sdk';

const RPC_URL = process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const POOL_CONTRACT = process.env.NEXT_PUBLIC_POOL_CONTRACT_ADDRESS || '';

export async function GET() {
  try {
    if (!POOL_CONTRACT) return NextResponse.json({ price: '0.050000', change24h: '0.00' });

    const server = new SorobanRpc.Server(RPC_URL);
    const contract = new Contract(POOL_CONTRACT);

    // Build dummy transaction for simulation
    const dummyAccount = new Account("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF", "0");
    const tx = new TransactionBuilder(dummyAccount, {
      fee: "100",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(contract.call('get_reserves'))
      .setTimeout(0)
      .build();

    const simulation = await server.simulateTransaction(tx);

    let price = 0.05;

    if (SorobanRpc.Api.isSimulationSuccess(simulation) && simulation.result) {
      const native = scValToNative(simulation.result.retval);
      if (Array.isArray(native) && native.length >= 2) {
        const resA = parseFloat(native[0]) || 0;
        const resB = parseFloat(native[1]) || 0;
        if (resA > 0) price = resB / resA;
      }
    }

    return NextResponse.json({
      price: price.toFixed(6),
      change24h: '0.00',
    });
  } catch (err) {
    console.error("Price API error:", err);
    return NextResponse.json({ price: '0.050000', change24h: '0.00' });
  }
}
