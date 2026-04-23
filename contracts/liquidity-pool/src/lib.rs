#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, IntoVal, Symbol,
};

#[cfg(test)]
mod test;

#[contracttype]
#[derive(Clone)]
enum DataKey {
    TokenA, // AGT Token
    TokenB, // XLM Token
    Admin,
    ReserveA,
    ReserveB,
    TotalLP,
    LpBalance(Address),
}

#[contract]
pub struct LiquidityPool;

#[contractimpl]
impl LiquidityPool {
    pub fn initialize(env: Env, token_contract: Address, xlm_contract: Address, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage()
            .instance()
            .set(&DataKey::TokenA, &token_contract);
        env.storage()
            .instance()
            .set(&DataKey::TokenB, &xlm_contract);
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::ReserveA, &0i128);
        env.storage().instance().set(&DataKey::ReserveB, &0i128);
        env.storage().instance().set(&DataKey::TotalLP, &0i128);
    }

    pub fn add_liquidity(env: Env, provider: Address, token_amount: i128, xlm_amount: i128) {
        provider.require_auth();

        let token_a: Address = env.storage().instance().get(&DataKey::TokenA).unwrap();
        let token_b: Address = env.storage().instance().get(&DataKey::TokenB).unwrap();

        // Transfer AGT from provider to pool
        env.invoke_contract::<()>(
            &token_a,
            &Symbol::new(&env, "transfer"),
            (
                provider.clone(),
                env.current_contract_address(),
                token_amount,
            )
                .into_val(&env),
        );

        // Transfer XLM from provider to pool
        env.invoke_contract::<()>(
            &token_b,
            &Symbol::new(&env, "transfer"),
            (provider.clone(), env.current_contract_address(), xlm_amount).into_val(&env),
        );

        let reserve_a: i128 = env.storage().instance().get(&DataKey::ReserveA).unwrap();
        let reserve_b: i128 = env.storage().instance().get(&DataKey::ReserveB).unwrap();

        let lp_to_mint = if reserve_a == 0 {
            token_amount // Initial liquidity
        } else {
            (token_amount * 100) / reserve_a
        };

        env.storage()
            .instance()
            .set(&DataKey::ReserveA, &(reserve_a + token_amount));
        env.storage()
            .instance()
            .set(&DataKey::ReserveB, &(reserve_b + xlm_amount));

        let total_lp: i128 = env.storage().instance().get(&DataKey::TotalLP).unwrap();
        env.storage()
            .instance()
            .set(&DataKey::TotalLP, &(total_lp + lp_to_mint));

        let balance = env
            .storage()
            .persistent()
            .get(&DataKey::LpBalance(provider.clone()))
            .unwrap_or(0);
        env.storage().persistent().set(
            &DataKey::LpBalance(provider.clone()),
            &(balance + lp_to_mint),
        );

        env.events().publish(
            (Symbol::new(&env, "LiquidityAdded"), provider),
            (token_amount, xlm_amount),
        );
    }

    pub fn remove_liquidity(env: Env, provider: Address, lp_amount: i128) {
        provider.require_auth();

        let balance: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::LpBalance(provider.clone()))
            .unwrap_or(0);
        if balance < lp_amount {
            panic!("insufficient LP balance");
        }

        let total_lp: i128 = env.storage().instance().get(&DataKey::TotalLP).unwrap();
        let reserve_a: i128 = env.storage().instance().get(&DataKey::ReserveA).unwrap();
        let reserve_b: i128 = env.storage().instance().get(&DataKey::ReserveB).unwrap();

        let token_out = (lp_amount * reserve_a) / total_lp;
        let xlm_out = (lp_amount * reserve_b) / total_lp;

        let token_a: Address = env.storage().instance().get(&DataKey::TokenA).unwrap();
        let token_b: Address = env.storage().instance().get(&DataKey::TokenB).unwrap();

        // Transfer AGT back to provider
        env.invoke_contract::<()>(
            &token_a,
            &Symbol::new(&env, "transfer"),
            (env.current_contract_address(), provider.clone(), token_out).into_val(&env),
        );

        // Transfer XLM back to provider
        env.invoke_contract::<()>(
            &token_b,
            &Symbol::new(&env, "transfer"),
            (env.current_contract_address(), provider.clone(), xlm_out).into_val(&env),
        );

        env.storage()
            .instance()
            .set(&DataKey::ReserveA, &(reserve_a - token_out));
        env.storage()
            .instance()
            .set(&DataKey::ReserveB, &(reserve_b - xlm_out));
        env.storage()
            .instance()
            .set(&DataKey::TotalLP, &(total_lp - lp_amount));
        env.storage().persistent().set(
            &DataKey::LpBalance(provider.clone()),
            &(balance - lp_amount),
        );

        env.events().publish(
            (Symbol::new(&env, "LiquidityRemoved"), provider),
            (token_out, xlm_out),
        );
    }

    pub fn swap(env: Env, user: Address, token_in: Address, amount_in: i128) -> i128 {
        user.require_auth();

        let token_a: Address = env.storage().instance().get(&DataKey::TokenA).unwrap();
        let token_b: Address = env.storage().instance().get(&DataKey::TokenB).unwrap();
        let reserve_a: i128 = env.storage().instance().get(&DataKey::ReserveA).unwrap();
        let reserve_b: i128 = env.storage().instance().get(&DataKey::ReserveB).unwrap();

        let (amount_out, new_res_a, new_res_b) = if token_in == token_a {
            // Swap AGT for XLM
            let k = reserve_a * reserve_b;
            let new_reserve_a = reserve_a + amount_in;
            let new_reserve_b = k / new_reserve_a;
            let out = reserve_b - new_reserve_b;

            // Transfer AGT in
            env.invoke_contract::<()>(
                &token_a,
                &Symbol::new(&env, "transfer"),
                (user.clone(), env.current_contract_address(), amount_in).into_val(&env),
            );

            // Transfer XLM out
            env.invoke_contract::<()>(
                &token_b,
                &Symbol::new(&env, "transfer"),
                (env.current_contract_address(), user.clone(), out).into_val(&env),
            );

            (out, new_reserve_a, new_reserve_b)
        } else {
            // Swap XLM for AGT
            let k = reserve_a * reserve_b;
            let new_reserve_b = reserve_b + amount_in;
            let new_reserve_a = k / new_reserve_b;
            let out = reserve_a - new_reserve_a;

            // Transfer XLM in
            env.invoke_contract::<()>(
                &token_b,
                &Symbol::new(&env, "transfer"),
                (user.clone(), env.current_contract_address(), amount_in).into_val(&env),
            );

            // Transfer AGT out
            env.invoke_contract::<()>(
                &token_a,
                &Symbol::new(&env, "transfer"),
                (env.current_contract_address(), user.clone(), out).into_val(&env),
            );

            (out, new_reserve_a, new_reserve_b)
        };

        env.storage().instance().set(&DataKey::ReserveA, &new_res_a);
        env.storage().instance().set(&DataKey::ReserveB, &new_res_b);

        env.events()
            .publish((symbol_short!("swap"), user), (amount_in, amount_out));

        amount_out
    }

    pub fn get_price(env: Env) -> i128 {
        let reserve_a: i128 = env.storage().instance().get(&DataKey::ReserveA).unwrap();
        let reserve_b: i128 = env.storage().instance().get(&DataKey::ReserveB).unwrap();
        if reserve_a == 0 {
            0
        } else {
            (reserve_b * 1000) / reserve_a
        }
    }

    pub fn get_reserves(env: Env) -> (i128, i128) {
        let reserve_a: i128 = env.storage().instance().get(&DataKey::ReserveA).unwrap();
        let reserve_b: i128 = env.storage().instance().get(&DataKey::ReserveB).unwrap();
        (reserve_a, reserve_b)
    }
}
