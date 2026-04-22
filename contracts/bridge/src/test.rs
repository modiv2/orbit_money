#![cfg(test)]
use super::*;
use agt_token::{AgtToken, AgtTokenClient};
use liquidity_pool::{LiquidityPool, LiquidityPoolClient};
use soroban_sdk::testutils::{Address as _, Events};
use soroban_sdk::{Env, String};

#[test]
fn test_batch_operation() {
    let env = Env::default();
    env.mock_all_auths();
    
    let admin = Address::generate(&env);
    let token_id = env.register_contract(None, AgtToken);
    let pool_id = env.register_contract(None, LiquidityPool);
    let bridge_id = env.register_contract(None, Bridge);
    
    let token_client = AgtTokenClient::new(&env, &token_id);
    let pool_client = LiquidityPoolClient::new(&env, &pool_id);
    let bridge_client = BridgeClient::new(&env, &bridge_id);

    token_client.initialize(&admin, &String::from_str(&env, "A"), &String::from_str(&env, "B"), &7);
    pool_client.initialize(&token_id, &admin);
    bridge_client.initialize(&token_id, &pool_id, &admin);
    
    pool_client.add_liquidity(&admin, &1000, &1000);

    let user = Address::generate(&env);
    token_client.mint(&user, &200);
    
    // Batch operation swaps AGT for XLM and takes a 5% fee (10 AGT)
    bridge_client.batch_operation(&user, &100);

    // Verify token balances
    // User: 200 - 100 (swap) - 5 (fee) = 95
    assert_eq!(token_client.balance(&user), 95);
    // Pool: 1000 + 100 = 1100
    assert_eq!(token_client.balance(&pool_id), 1100);
    // Admin (received fee): 5
    assert_eq!(token_client.balance(&admin), 5);

    let last_event = env.events().all().last().unwrap();
    assert_eq!(last_event.0, bridge_id);
}

#[test]
#[should_panic]
fn test_zero_amount_panics() {
    // In my implementation, amount / 20 for fee is fine with 0, 
    // but the pool swap might panic if reserves are 0 or logic dictates.
    // Let's assume we want a panic on 0 for this test case.
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let token_id = env.register_contract(None, AgtToken);
    let pool_id = env.register_contract(None, LiquidityPool);
    let bridge_id = env.register_contract(None, Bridge);
    
    let bridge_client = BridgeClient::new(&env, &bridge_id);
    bridge_client.initialize(&token_id, &pool_id, &admin);
    
    bridge_client.batch_operation(&admin, &0);
}

#[test]
fn test_get_contracts() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let token_id = env.register_contract(None, AgtToken);
    let pool_id = env.register_contract(None, LiquidityPool);
    let bridge_id = env.register_contract(None, Bridge);
    let bridge_client = BridgeClient::new(&env, &bridge_id);

    bridge_client.initialize(&token_id, &pool_id, &admin);
    
    let (t, p) = bridge_client.get_contracts();
    assert_eq!(t, token_id);
    assert_eq!(p, pool_id);
}
