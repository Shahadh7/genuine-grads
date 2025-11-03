use anchor_lang::prelude::*;

#[event]
pub struct ConfigInitialized {
    pub owner: Pubkey,
}

#[event]
pub struct UniversityRegistered {
    pub admin: Pubkey,
    pub university_authority: Pubkey,
    pub university: Pubkey,
    pub name: String,
    pub is_active: bool,
    pub metadata_uri: String,
}


#[event]
pub struct UniversityApproved {
    pub admin: Pubkey,
    pub authority: Pubkey,
    pub university: Pubkey,
    pub is_active: bool,
}

#[event]
pub struct UniversityDeactivated {
    pub admin: Pubkey,
    pub authority: Pubkey,
    pub university: Pubkey,
    pub is_active: bool,
}

#[event]
pub struct CollectionCreatedV2 {
    pub admin: Pubkey,
    pub university: Pubkey,
    pub authority: Pubkey,
    pub collection: Pubkey,
    pub name: String,
    pub uri: String,
}

#[event]
pub struct TreeCreatedV2 {
    pub admin: Pubkey,
    pub university: Pubkey,
    pub authority: Pubkey,
    pub merkle_tree: Pubkey,
    pub tree_config: Pubkey,
    pub max_depth: u32,
    pub max_buffer_size: u32,
    pub is_public: bool,
}


#[event]
pub struct CertificateMintedV2 {
    pub admin: Pubkey,
    pub university: Pubkey,
    pub authority: Pubkey,
    pub recipient: Pubkey,
    pub merkle_tree: Pubkey,
    pub tree_config: Pubkey,
    pub collection: Pubkey,
    pub name: String,
    pub uri: String,
    pub attached_collection: bool,
}





