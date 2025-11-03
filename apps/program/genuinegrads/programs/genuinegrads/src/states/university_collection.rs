use anchor_lang::prelude::*;

pub const UNIVERSITY_COLLECTION_SEED: &[u8] = b"university_collection";

pub const UNIVERSITY_COLLECTION_NAME_MAX: usize = 64;
pub const UNIVERSITY_COLLECTION_URI_MAX: usize = 60;

#[account]
#[derive(InitSpace)]
pub struct UniversityCollection {
    /// Program-level super admin (mirrors GlobalConfig.owner)
    pub admin: Pubkey,

    /// The University account that owns this collection
    pub university: Pubkey,

    /// The operational authority (same as university.authority)
    pub authority: Pubkey,

    /// The created MPL Core collection public key
    pub collection: Pubkey,

    /// Business metadata (sized for safety)
    #[max_len(UNIVERSITY_COLLECTION_NAME_MAX)]
    pub name: String, 
     #[max_len(UNIVERSITY_COLLECTION_URI_MAX)]
    pub uri: String, 
    pub created_at: i64,
    pub bump: u8,
}