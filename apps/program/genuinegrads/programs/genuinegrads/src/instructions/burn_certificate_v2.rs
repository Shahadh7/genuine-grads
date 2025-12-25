#![allow(deprecated, unexpected_cfgs)]

use anchor_lang::prelude::*;

use crate::errors::GenuineGradsError;
use crate::states::{
    GlobalConfig, University, UniversityCollection, UniversityTree,
    GLOBAL_CONFIG_SEED, UNIVERSITY_SEED, UNIVERSITY_COLLECTION_SEED, UNIVERSITY_TREE_SEED,
};

// Bubblegum v2 CPI
use mpl_bubblegum::ID as BUBBLEGUM_ID;
use mpl_bubblegum::instructions::BurnV2CpiBuilder;

// SPL-Compression + Noop
use crate::utils::{Noop, SplAccountCompression};

// MPL Core (for Core collection + CPI signer)
use mpl_core::ID as MPL_CORE_ID;

/// Event: emitted after a successful burn.
/// This is your audit trail + includes a reason string.
#[event]
pub struct CertificateBurnedV2 {
    pub admin: Pubkey,
    pub university: Pubkey,
    pub authority: Pubkey,

    pub leaf_owner: Pubkey,
    pub merkle_tree: Pubkey,
    pub tree_config: Pubkey,
    pub collection: Pubkey,

    pub index: u32,
    pub nonce: u64,

    pub reason: String,
    pub burned_at: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BurnCertificateArgs {
    /// Merkle proof verification (from DAS getAssetWithProof)
    pub root: [u8; 32],
    pub data_hash: [u8; 32],
    pub creator_hash: [u8; 32],
    pub nonce: u64,
    pub index: u32,

    /// Optional Bubblegum v2 extras
    pub asset_data_hash: Option<[u8; 32]>,
    pub flags: Option<u8>,

    /// Human readable reason for burning/revoking
    pub reason: String,
}

#[derive(Accounts)]
pub struct BurnCertificateV2<'info> {
    /// University authority is payer & operational authority (same as mint)
    #[account(mut)]
    pub university_authority: Signer<'info>,

    #[account(
        seeds = [GLOBAL_CONFIG_SEED, global_config.owner.as_ref()],
        bump = global_config.bump
    )]
    pub global_config: Account<'info, GlobalConfig>,

    /// University must be ACTIVE, tied to this authority & admin
    /// PDA = ["university", university_authority]
    #[account(
        mut,
        seeds = [UNIVERSITY_SEED, university_authority.key().as_ref()],
        bump = university.bump,
        constraint = university.is_active @ GenuineGradsError::UniversityInactive,
        constraint = university.authority == university_authority.key() @ GenuineGradsError::Unauthorized,
        constraint = university.admin == global_config.owner @ GenuineGradsError::Unauthorized
    )]
    pub university: Account<'info, University>,

    /// University collection record (created in create_core_collection_v2_cpi)
    #[account(
        seeds = [UNIVERSITY_COLLECTION_SEED, university.key().as_ref()],
        bump = university_collection.bump
    )]
    pub university_collection: Account<'info, UniversityCollection>,

    /// University tree record (created in create_tree_v2)
    /// PDA = ["university_tree", merkle_tree]
    #[account(
        seeds = [UNIVERSITY_TREE_SEED, merkle_tree.key().as_ref()],
        bump = university_tree.bump
    )]
    pub university_tree: Account<'info, UniversityTree>,

    /// CHECK: SPL-Compression Merkle tree account
    #[account(mut, address = university_tree.merkle_tree)]
    pub merkle_tree: UncheckedAccount<'info>,

    /// CHECK: Bubblegum tree_config PDA
    #[account(mut, address = university_tree.tree_config)]
    pub tree_config: UncheckedAccount<'info>,

    /// CHECK: MPL Core collection (must equal record in university_collection)
    #[account(mut)]
    pub core_collection: UncheckedAccount<'info>,

    /// CHECK: MPL Core program id
    #[account(address = MPL_CORE_ID)]
    pub mpl_core_program: UncheckedAccount<'info>,

    /// CHECK: MPL Core CPI signer PDA (you validate like in mint)
    pub mpl_core_cpi_signer: UncheckedAccount<'info>,

    /// CHECK: leaf owner (student wallet) – does NOT need to sign if PermanentBurnDelegate exists
    pub leaf_owner: UncheckedAccount<'info>,

    /// Bubblegum program
    /// CHECK: ID verified in handler
    pub bubblegum_program: UncheckedAccount<'info>,

    /// SPL Account Compression
    pub compression_program: Program<'info, SplAccountCompression>,

    /// SPL Noop log wrapper
    pub log_wrapper: Program<'info, Noop>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<BurnCertificateV2>, args: BurnCertificateArgs) -> Result<()> {
    // --- Governance guards ---
    require!(!ctx.accounts.global_config.frozen, GenuineGradsError::Frozen);
    require!(ctx.accounts.university.is_active, GenuineGradsError::UniversityInactive);

    // Reason guard (keep event size reasonable)
    // (Tune these limits if you want.)
    require!(
        !args.reason.trim().is_empty() && args.reason.len() <= 120,
        GenuineGradsError::InvalidBurnReason
    );

    // Program IDs (same as mint)
    require_keys_eq!(
        ctx.accounts.bubblegum_program.key(),
        BUBBLEGUM_ID,
        GenuineGradsError::InvalidProgramExecutable
    );
    require_keys_eq!(
        ctx.accounts.compression_program.key(),
        SplAccountCompression::id(),
        GenuineGradsError::InvalidProgramExecutable
    );
    require_keys_eq!(
        ctx.accounts.log_wrapper.key(),
        Noop::id(),
        GenuineGradsError::InvalidProgramExecutable
    );

    // Verify tree_config PDA belongs to this merkle_tree (same style as your mint)
    let (expected_tree_config, _) =
        Pubkey::find_program_address(&[ctx.accounts.merkle_tree.key.as_ref()], &BUBBLEGUM_ID);
    require_keys_eq!(
        ctx.accounts.tree_config.key(),
        expected_tree_config,
        GenuineGradsError::InvalidTreeConfig
    );

    // Cross-check UniversityTree record matches accounts passed in
    require_keys_eq!(
        ctx.accounts.university_tree.merkle_tree,
        ctx.accounts.merkle_tree.key(),
        GenuineGradsError::TreeMismatch
    );
    require_keys_eq!(
        ctx.accounts.university_tree.tree_config,
        ctx.accounts.tree_config.key(),
        GenuineGradsError::TreeMismatch
    );

    // Collection checks
    require_keys_eq!(
        ctx.accounts.university_collection.collection,
        ctx.accounts.core_collection.key(),
        GenuineGradsError::CollectionMismatch
    );

    // Same style you used in mint (hardcoded signer)
    // If you want, we can replace this with proper PDA derivation later.
    require_keys_eq!(
        ctx.accounts.mpl_core_cpi_signer.key(),
        pubkey!("CbNY3JiXdXNE9tPNEk1aRZVEkWdj2v7kfJLNQwZZgpXk"),
        GenuineGradsError::InvalidCoreCpiSigner
    );

    // Proof path must be provided as remaining accounts
    require!(
        !ctx.remaining_accounts.is_empty(),
        GenuineGradsError::MissingMerkleProof
    );

    // --- Burn V2 CPI ---
    let mut cpi = BurnV2CpiBuilder::new(&ctx.accounts.bubblegum_program);

    cpi.tree_config(&ctx.accounts.tree_config.to_account_info());
    cpi.payer(&ctx.accounts.university_authority.to_account_info());

    // University authority burns as the authority (PermanentBurnDelegate managed by update authority)
    cpi.authority(Some(&ctx.accounts.university_authority.to_account_info()));
    cpi.leaf_owner(&ctx.accounts.leaf_owner.to_account_info());
    cpi.leaf_delegate(None);
    cpi.merkle_tree(&ctx.accounts.merkle_tree.to_account_info());
    cpi.core_collection(Some(&ctx.accounts.core_collection.to_account_info()));
    cpi.mpl_core_cpi_signer(Some(&ctx.accounts.mpl_core_cpi_signer.to_account_info()));
    cpi.mpl_core_program(&ctx.accounts.mpl_core_program.to_account_info()); 
    cpi.log_wrapper(&ctx.accounts.log_wrapper.to_account_info());
    cpi.compression_program(&ctx.accounts.compression_program.to_account_info());
    cpi.system_program(&ctx.accounts.system_program.to_account_info());

    // Args
    cpi.root(args.root);
    cpi.data_hash(args.data_hash);
    cpi.creator_hash(args.creator_hash);
    cpi.nonce(args.nonce);
    cpi.index(args.index);

    if let Some(h) = args.asset_data_hash {
        cpi.asset_data_hash(h);
    }
    if let Some(f) = args.flags {
        cpi.flags(f);
    }

    // ✅ Add proof nodes (remaining accounts for merkle proof path)
    for ai in &ctx.remaining_accounts.iter() {
        cpi.add_remaining_account(ai, false, false);
    }
    cpi.invoke()?;

    // Emit event (audit trail)
    let now = Clock::get()?.unix_timestamp;

    emit!(CertificateBurnedV2 {
        admin: ctx.accounts.global_config.owner,
        university: ctx.accounts.university.key(),
        authority: ctx.accounts.university_authority.key(),
        leaf_owner: ctx.accounts.leaf_owner.key(),
        merkle_tree: ctx.accounts.merkle_tree.key(),
        tree_config: ctx.accounts.tree_config.key(),
        collection: ctx.accounts.core_collection.key(),
        index: args.index,
        nonce: args.nonce,
        reason: args.reason,
        burned_at: now,
    });

    Ok(())
}
