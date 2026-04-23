#![cfg(test)]
use super::*;
use soroban_sdk::testutils::{Address as _, Events};
use soroban_sdk::{vec, Env, IntoVal};

#[test]
fn test_initialize() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let contract_id = env.register_contract(None, AgtToken);
    let client = AgtTokenClient::new(&env, &contract_id);

    client.initialize(
        &admin,
        &String::from_str(&env, "AntiGravity"),
        &String::from_str(&env, "AGT"),
        &9,
    );

    assert_eq!(client.name(), String::from_str(&env, "AntiGravity"));
    assert_eq!(client.symbol(), String::from_str(&env, "AGT"));
    assert_eq!(client.decimals(), 9);
}

#[test]
fn test_mint() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let contract_id = env.register_contract(None, AgtToken);
    let client = AgtTokenClient::new(&env, &contract_id);

    client.initialize(
        &admin,
        &String::from_str(&env, "A"),
        &String::from_str(&env, "B"),
        &7,
    );
    client.mint(&user, &1000);

    assert_eq!(client.balance(&user), 1000);
    assert_eq!(client.total_supply(), 1000);
}

#[test]
#[should_panic(expected = "HostError: Error(Auth, InvalidAction)")]
fn test_mint_unauthorized() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let contract_id = env.register_contract(None, AgtToken);
    let client = AgtTokenClient::new(&env, &contract_id);

    client.initialize(
        &admin,
        &String::from_str(&env, "A"),
        &String::from_str(&env, "B"),
        &7,
    );
    // User tries to mint without admin auth
    client.mint(&user, &1000);
}

#[test]
fn test_transfer_fee() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let receiver = Address::generate(&env);
    let treasury = Address::generate(&env);

    let contract_id = env.register_contract(None, AgtToken);
    let client = AgtTokenClient::new(&env, &contract_id);

    client.initialize(
        &admin,
        &String::from_str(&env, "A"),
        &String::from_str(&env, "B"),
        &7,
    );
    client.set_treasury(&treasury);

    client.mint(&sender, &1000);
    client.transfer(&sender, &receiver, &100);

    // Sender: 1000 - 100 = 900
    // Receiver: 100 - (100 * 0.01) = 99
    // Treasury: 1
    assert_eq!(client.balance(&sender), 900);
    assert_eq!(client.balance(&receiver), 99);
    assert_eq!(client.balance(&treasury), 1);
}

#[test]
fn test_burn() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let contract_id = env.register_contract(None, AgtToken);
    let client = AgtTokenClient::new(&env, &contract_id);

    client.initialize(
        &admin,
        &String::from_str(&env, "A"),
        &String::from_str(&env, "B"),
        &7,
    );
    client.mint(&user, &1000);
    client.burn(&user, &400);

    assert_eq!(client.balance(&user), 600);
    assert_eq!(client.total_supply(), 600);
}

#[test]
fn test_set_treasury() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let treasury = Address::generate(&env);
    let contract_id = env.register_contract(None, AgtToken);
    let client = AgtTokenClient::new(&env, &contract_id);

    client.initialize(
        &admin,
        &String::from_str(&env, "A"),
        &String::from_str(&env, "B"),
        &7,
    );
    client.set_treasury(&treasury);
    // Success means no panic
}

#[test]
fn test_events_mint() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let contract_id = env.register_contract(None, AgtToken);
    let client = AgtTokenClient::new(&env, &contract_id);

    client.initialize(
        &admin,
        &String::from_str(&env, "A"),
        &String::from_str(&env, "B"),
        &7,
    );
    client.mint(&user, &1000);

    let last_event = env.events().all().last().unwrap();
    assert_eq!(
        last_event,
        (
            contract_id.clone(),
            (symbol_short!("mint"), user.clone()).into_val(&env),
            1000i128.into_val(&env)
        )
    );
}

#[test]
fn test_balance_zero() {
    let env = Env::default();
    let user = Address::generate(&env);
    let contract_id = env.register_contract(None, AgtToken);
    let client = AgtTokenClient::new(&env, &contract_id);

    // Not initialized yet, but balance should be 0 (default if not found)
    assert_eq!(client.balance(&user), 0);
}
