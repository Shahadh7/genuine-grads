use anchor_lang::prelude::*;

pub const UNIVERSITY_TREE_SEED: &[u8] = b"university_tree";

#[account]
#[derive(InitSpace)]
pub struct UniversityTree {
    /// Program-level super admin (mirrors GlobalConfig.owner)
    pub admin: Pubkey,

    /// The University account that owns this Merkle tree
    pub university: Pubkey,

    /// Operational authority (same as university.authority)
    pub authority: Pubkey,

    /// SPL-Compression Merkle tree account
    pub merkle_tree: Pubkey,

    /// Bubblegum tree config PDA (derived from merkle_tree)
    pub tree_config: Pubkey,

    /// Parameters
    pub max_depth: u32,
    pub max_buffer_size: u32,
    pub is_public: bool,

    pub created_at: i64,
    pub bump: u8,
}