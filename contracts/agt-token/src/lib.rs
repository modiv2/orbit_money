#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, String, Symbol,
};

#[cfg(test)]
mod test;

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Admin,
    Treasury,
    Balance(Address),
    TotalSupply,
    Name,
    Symbol,
    Decimals,
}

#[contract]
pub struct AgtToken;

#[contractimpl]
impl AgtToken {
    pub fn initialize(env: Env, admin: Address, name: String, symbol: String, decimals: u32) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Treasury, &admin); // Default treasury to admin
        env.storage().instance().set(&DataKey::Name, &name);
        env.storage().instance().set(&DataKey::Symbol, &symbol);
        env.storage().instance().set(&DataKey::Decimals, &decimals);
        env.storage().instance().set(&DataKey::TotalSupply, &0i128);
    }

    pub fn set_treasury(env: Env, treasury: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        env.storage().instance().set(&DataKey::Treasury, &treasury);
    }

    pub fn mint(env: Env, to: Address, amount: i128) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let balance = Self::balance(env.clone(), to.clone());
        env.storage().persistent().set(&DataKey::Balance(to.clone()), &(balance + amount));

        let total_supply = Self::total_supply(env.clone());
        env.storage().instance().set(&DataKey::TotalSupply, &(total_supply + amount));

        env.events().publish(
            (symbol_short!("mint"), to),
            amount,
        );
    }

    pub fn burn(env: Env, from: Address, amount: i128) {
        from.require_auth();

        let balance = Self::balance(env.clone(), from.clone());
        if balance < amount {
            panic!("insufficient balance");
        }
        env.storage().persistent().set(&DataKey::Balance(from.clone()), &(balance - amount));

        let total_supply = Self::total_supply(env.clone());
        env.storage().instance().set(&DataKey::TotalSupply, &(total_supply - amount));

        env.events().publish(
            (symbol_short!("burn"), from),
            amount,
        );
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();

        let balance_from = Self::balance(env.clone(), from.clone());
        if balance_from < amount {
            panic!("insufficient balance");
        }

        let fee = amount / 100; // 1% fee
        let amount_after_fee = amount - fee;
        let treasury: Address = env.storage().instance().get(&DataKey::Treasury).unwrap();

        // Update sender balance
        env.storage().persistent().set(&DataKey::Balance(from.clone()), &(balance_from - amount));

        // Update receiver balance
        let balance_to = Self::balance(env.clone(), to.clone());
        env.storage().persistent().set(&DataKey::Balance(to.clone()), &(balance_to + amount_after_fee));

        // Update treasury balance
        if fee > 0 {
            let balance_treasury = Self::balance(env.clone(), treasury.clone());
            env.storage().persistent().set(&DataKey::Balance(treasury.clone()), &(balance_treasury + fee));
            
            env.events().publish(
                (Symbol::new(&env, "FeeCollected"), treasury),
                fee,
            );
        }

        env.events().publish(
            (symbol_short!("transfer"), from, to),
            amount_after_fee,
        );
    }

    pub fn balance(env: Env, id: Address) -> i128 {
        env.storage().persistent().get(&DataKey::Balance(id)).unwrap_or(0)
    }

    pub fn total_supply(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::TotalSupply).unwrap_or(0)
    }

    pub fn decimals(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::Decimals).unwrap()
    }

    pub fn name(env: Env) -> String {
        env.storage().instance().get(&DataKey::Name).unwrap()
    }

    pub fn symbol(env: Env) -> String {
        env.storage().instance().get(&DataKey::Symbol).unwrap()
    }
}
