#![cfg(test)]
use super::*;
use agt_token::{AgtToken, AgtTokenClient};
use soroban_sdk::testutils::{Address as _, Events};
use soroban_sdk::{Env, String};

#[test]
fn test_add_liquidity() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let token_id = env.register_contract(None, AgtToken);
    let pool_id = env.register_contract(None, LiquidityPool);

    let pool_client = LiquidityPoolClient::new(&env, &pool_id);
    let token_client = AgtTokenClient::new(&env, &token_id);

    token_client.initialize(
        &admin,
        &String::from_str(&env, "A"),
        &String::from_str(&env, "B"),
        &7,
    );
    pool_client.initialize(&token_id, &token_id, &admin);

    let provider = Address::generate(&env);
    token_client.mint(&provider, &3000);

    pool_client.add_liquidity(&provider, &1000, &2000);

    let (res_a, res_b) = pool_client.get_reserves();
    assert_eq!(res_a, 1000);
    assert_eq!(res_b, 2000);
}

#[test]
fn test_get_price() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let token_id = env.register_contract(None, AgtToken);
    let pool_id = env.register_contract(None, LiquidityPool);
    let pool_client = LiquidityPoolClient::new(&env, &pool_id);

    let token_client = AgtTokenClient::new(&env, &token_id);

    token_client.initialize(
        &admin,
        &String::from_str(&env, "A"),
        &String::from_str(&env, "B"),
        &7,
    );
    pool_client.initialize(&token_id, &token_id, &admin);

    env.mock_all_auths();
    token_client.mint(&admin, &3000);
    pool_client.add_liquidity(&admin, &1000, &2000);

    assert_eq!(pool_client.get_price(), 2000);
}

#[test]
fn test_swap_output() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let token_id = env.register_contract(None, AgtToken);
    let pool_id = env.register_contract(None, LiquidityPool);
    let pool_client = LiquidityPoolClient::new(&env, &pool_id);
    let token_client = AgtTokenClient::new(&env, &token_id);

    token_client.initialize(
        &admin,
        &String::from_str(&env, "A"),
        &String::from_str(&env, "B"),
        &7,
    );
    pool_client.initialize(&token_id, &token_id, &admin);
    token_client.mint(&admin, &3000);
    pool_client.add_liquidity(&admin, &1000, &1000);

    let user = Address::generate(&env);
    token_client.mint(&user, &100);

    let out = pool_client.swap(&user, &token_id, &100);
    assert_eq!(out, 91);
}

#[test]
fn test_remove_liquidity() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let token_id = env.register_contract(None, AgtToken);
    let pool_id = env.register_contract(None, LiquidityPool);
    let pool_client = LiquidityPoolClient::new(&env, &pool_id);
    let token_client = AgtTokenClient::new(&env, &token_id);

    token_client.initialize(
        &admin,
        &String::from_str(&env, "A"),
        &String::from_str(&env, "B"),
        &7,
    );
    pool_client.initialize(&token_id, &token_id, &admin);

    token_client.mint(&admin, &3000);
    pool_client.add_liquidity(&admin, &1000, &1000);
    pool_client.remove_liquidity(&admin, &500);

    let (res_a, res_b) = pool_client.get_reserves();
    assert_eq!(res_a, 500);
    assert_eq!(res_b, 500);
}

#[test]
fn test_swap_event() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let token_id = env.register_contract(None, AgtToken);
    let pool_id = env.register_contract(None, LiquidityPool);
    let pool_client = LiquidityPoolClient::new(&env, &pool_id);
    let token_client = AgtTokenClient::new(&env, &token_id);

    token_client.initialize(
        &admin,
        &String::from_str(&env, "A"),
        &String::from_str(&env, "B"),
        &7,
    );
    pool_client.initialize(&token_id, &token_id, &admin);
    token_client.mint(&admin, &3000);
    pool_client.add_liquidity(&admin, &1000, &1000);

    pool_client.swap(&admin, &token_id, &100);

    let last_event = env.events().all().last().unwrap();
    assert_eq!(last_event.0, pool_id);
}

#[test]
fn test_inter_contract_call() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let token_id = env.register_contract(None, AgtToken);
    let pool_id = env.register_contract(None, LiquidityPool);
    let pool_client = LiquidityPoolClient::new(&env, &pool_id);
    let token_client = AgtTokenClient::new(&env, &token_id);

    token_client.initialize(
        &admin,
        &String::from_str(&env, "A"),
        &String::from_str(&env, "B"),
        &7,
    );
    pool_client.initialize(&token_id, &token_id, &admin);
    token_client.mint(&admin, &3000);
    pool_client.add_liquidity(&admin, &1000, &1000);

    pool_client.swap(&admin, &token_id, &100);

    // The swap executed without panicking
}
