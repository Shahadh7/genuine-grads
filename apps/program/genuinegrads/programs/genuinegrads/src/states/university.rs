use anchor_lang::prelude::*;

pub const UNIVERSITY_SEED: &[u8] = b"university";

pub const UNIVERSITY_NAME_MAX: usize = 64;
pub const UNIVERSITY_URI_MAX: usize = 60;

#[account]
#[derive(InitSpace)]
pub struct University {
    /// Program-level owner (super admin) from GlobalConfig.owner
    pub admin: Pubkey,
    /// University’s operational authority (their signer)
    pub authority: Pubkey,
    #[max_len(UNIVERSITY_NAME_MAX)]
    pub name: String,
    #[max_len(UNIVERSITY_URI_MAX)]
    pub metadata_uri: String,
    pub is_active: bool,
    pub created_at: i64,
    pub bump: u8,
}