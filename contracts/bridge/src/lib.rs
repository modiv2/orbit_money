#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, IntoVal, Symbol};

#[cfg(test)]
mod test;

#[contracttype]
#[derive(Clone)]
enum DataKey {
    TokenContract,
    PoolContract,
    Admin,
}

#[contract]
pub struct Bridge;

#[contractimpl]
impl Bridge {
    pub fn initialize(env: Env, token_contract: Address, pool_contract: Address, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage()
            .instance()
            .set(&DataKey::TokenContract, &token_contract);
        env.storage()
            .instance()
            .set(&DataKey::PoolContract, &pool_contract);
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    pub fn batch_operation(env: Env, user: Address, amount: i128) {
        user.require_auth();

        let token_contract: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenContract)
            .unwrap();
        let pool_contract: Address = env
            .storage()
            .instance()
            .get(&DataKey::PoolContract)
            .unwrap();
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();

        // 1. Call pool.swap()
        // Swapping AGT for XLM (assuming token_contract is what pool accepts as token_in)
        let _amount_out: i128 = env.invoke_contract(
            &pool_contract,
            &Symbol::new(&env, "swap"),
            (user.clone(), token_contract.clone(), amount).into_val(&env),
        );

        // 2. Call token.transfer()
        // Sending a 5% service fee in AGT from user to admin
        let fee = amount / 20;
        if fee > 0 {
            env.invoke_contract::<()>(
                &token_contract,
                &Symbol::new(&env, "transfer"),
                (user.clone(), admin.clone(), fee).into_val(&env),
            );
        }

        env.events()
            .publish((Symbol::new(&env, "BatchExecuted"), user), amount);
    }

    pub fn get_contracts(env: Env) -> (Address, Address) {
        let token_contract: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenContract)
            .unwrap();
        let pool_contract: Address = env
            .storage()
            .instance()
            .get(&DataKey::PoolContract)
            .unwrap();
        (token_contract, pool_contract)
    }
}
