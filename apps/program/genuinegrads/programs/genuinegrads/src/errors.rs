use anchor_lang::prelude::*;

#[error_code]
pub enum GenuineGradsError {
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Program is frozen")]
    Frozen,
    #[msg("Invalid name")]
    InvalidName,
    #[msg("University is already active")]
    AlreadyActive,
    #[msg("University is already inactive")]
    AlreadyInactive,
    #[msg("Invalid URI")]
    InvalidUri,
    #[msg("University is inactive")]
    UniversityInactive,
    #[msg("Invalid program executable")]
    InvalidProgramExecutable,
    #[msg("Invalid tree config PDA")]
    InvalidTreeConfig,
    #[msg("Collection mismatch")]
    CollectionMismatch,
    #[msg("Tree mismatch")]
    TreeMismatch,
    #[msg("Invalid Core CPI signer")]
    InvalidCoreCpiSigner,
    #[msg("Missing remaining accounts for CPI")]
    MissingRemainingAccounts,
    #[msg("Missing merkle proof accounts.")]
    MissingMerkleProof,
    #[msg("Invalid burn reason.")]
    InvalidBurnReason,
}
