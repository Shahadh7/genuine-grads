use anchor_lang::prelude::*;

pub const GLOBAL_CONFIG_SEED: &[u8] = b"global-config";

#[account]
#[derive(InitSpace)]
pub struct GlobalConfig {
    /// The single owner (super admin) who governs the program settings.
    pub owner: Pubkey,
    /// Optional: allow emergency freeze of university ops (you can wire this later).
    pub frozen: bool,
    /// Bump for PDA
    pub bump: u8,
}