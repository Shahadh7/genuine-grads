#![allow(deprecated, unexpected_cfgs)]

use anchor_lang::prelude::*;
use crate::errors::GenuineGradsError;
use crate::events::CertificateMintedV2;
use crate::states::{
    GlobalConfig, University, UniversityCollection, UniversityTree,
    GLOBAL_CONFIG_SEED, UNIVERSITY_SEED, UNIVERSITY_COLLECTION_SEED, UNIVERSITY_TREE_SEED,
};

// Bubblegum + deps
use mpl_bubblegum::ID as BUBBLEGUM_ID;
use mpl_bubblegum::instructions::MintV2CpiBuilder;
use mpl_bubblegum::types::{Creator, TokenStandard};

// SPL-Compression + Noop
use crate::utils::{Noop, SplAccountCompression};

// MPL Core (for collection + CPI signer)
use mpl_core::ID as MPL_CORE_ID;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct MintCertificateArgs {
    /// Display name for the certificate (e.g., "BSc Computer Science — 2025")
    pub name: String,
    /// Off-chain JSON metadata for the certificate
    pub uri: String,
    /// Recipient (student) who will own the compressed NFT leaf
    pub recipient: Pubkey,
    /// If true, attempt collection-verified mint under the university's Core collection
    pub attach_collection: bool,
}

#[derive(Accounts)]
pub struct MintCertificateV2<'info> {
    /// University authority is payer & operational authority
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
    /// PDA = ["university_collection", university]
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
    /// (Bubblegum uses this to write the leaf)
    #[account(mut, address = university_tree.merkle_tree)]
    pub merkle_tree: UncheckedAccount<'info>,

    /// CHECK: Bubblegum tree_config PDA (must match Bubblegum derivation)
    #[account(mut, address = university_tree.tree_config)]
    pub tree_config: UncheckedAccount<'info>,

    /// CHECK: MPL Core collection account (must equal record in university_collection)
    #[account(mut)]
    pub core_collection: UncheckedAccount<'info>,

    /// CHECK: This account is used for its pubkey only
    #[account(address = MPL_CORE_ID)]
    pub mpl_core_program: UncheckedAccount<'info>,

    /// CHECK: MPL Core CPI signer PDA for Bubblegum:
    /// seeds = ["cpi_signer", core_collection, BUBBLEGUM_ID] under program MPL_CORE_ID
    /// We verify its derivation below. This must be passed when attach_collection = true.
    /// In practice, Bubblegum uses this PDA as the collection authority via CPI.
    pub mpl_core_cpi_signer: UncheckedAccount<'info>,

    /// CHECK: only used as a pubkey
    pub recipient: UncheckedAccount<'info>,

    /// Bubblegum program
    /// CHECK: ID verified
    pub bubblegum_program: UncheckedAccount<'info>,

    /// SPL Account Compression
    pub compression_program: Program<'info, SplAccountCompression>,

    /// SPL Noop log wrapper
    pub log_wrapper: Program<'info, Noop>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<MintCertificateV2>, args: MintCertificateArgs) -> Result<()> {
    // --- Governance guards ---
    require!(!ctx.accounts.global_config.frozen, GenuineGradsError::Frozen);
    require!(ctx.accounts.university.is_active, GenuineGradsError::UniversityInactive);
    // Metaplex Bubblegum enforces max 32 chars for name
    require!(args.name.len() > 0 && args.name.len() <= 32, GenuineGradsError::InvalidName);
    require!(args.uri.len() > 0 && args.uri.len() <= 200, GenuineGradsError::InvalidUri);

    // Program IDs
    require_keys_eq!(ctx.accounts.bubblegum_program.key(), BUBBLEGUM_ID, GenuineGradsError::InvalidProgramExecutable);
    require_keys_eq!(ctx.accounts.compression_program.key(), SplAccountCompression::id(), GenuineGradsError::InvalidProgramExecutable);
    require_keys_eq!(ctx.accounts.log_wrapper.key(), Noop::id(), GenuineGradsError::InvalidProgramExecutable);

    // Verify tree_config PDA belongs to this merkle_tree (Bubblegum convention: ["tree", merkle_tree])
    let (expected_tree_config, _) = Pubkey::find_program_address(
        &[ctx.accounts.merkle_tree.key.as_ref()],
        &BUBBLEGUM_ID
    );
    require_keys_eq!(
        ctx.accounts.tree_config.key(),
        expected_tree_config,
        GenuineGradsError::InvalidTreeConfig
    );

    // Cross-check UniversityTree record matches accounts passed in
    require_keys_eq!(ctx.accounts.university_tree.merkle_tree, ctx.accounts.merkle_tree.key(), GenuineGradsError::TreeMismatch);
    require_keys_eq!(ctx.accounts.university_tree.tree_config, ctx.accounts.tree_config.key(), GenuineGradsError::TreeMismatch);

    // Collection checks
    require_keys_eq!(ctx.accounts.university_collection.collection, ctx.accounts.core_collection.key(), GenuineGradsError::CollectionMismatch);

    // If attaching collection, verify the MPL Core CPI signer PDA derivation
    if args.attach_collection {
        require_keys_eq!(ctx.accounts.mpl_core_cpi_signer.key(), pubkey!("CbNY3JiXdXNE9tPNEk1aRZVEkWdj2v7kfJLNQwZZgpXk"), GenuineGradsError::InvalidCoreCpiSigner);
    }

    let mut cpi = MintV2CpiBuilder::new(&ctx.accounts.bubblegum_program);

    let tree_config = &ctx.accounts.tree_config.to_account_info();
    let leaf_owner = &&ctx.accounts.recipient.to_account_info();
    let merkle_tree = &ctx.accounts.merkle_tree.to_account_info();
    let payer = &ctx.accounts.university_authority.to_account_info();
    let tree_creator_or_delegate = &ctx.accounts.university_authority.to_account_info();
    let compression_program = &ctx.accounts.compression_program.to_account_info();
    let log_wrapper = &ctx.accounts.log_wrapper.to_account_info();
    let system_program = &ctx.accounts.system_program.to_account_info();
    let core_collection = &ctx.accounts.core_collection.to_account_info();
    let mpl_core_program = &ctx.accounts.mpl_core_program.to_account_info();
    let collection_authority = &ctx.accounts.university_authority.to_account_info();
    let mpl_core_cpi_signer = &ctx.accounts.mpl_core_cpi_signer.to_account_info();

    // Required base accounts
    cpi.tree_config(tree_config);
    cpi.leaf_owner(leaf_owner);
    cpi.leaf_delegate(None);
    cpi.merkle_tree(merkle_tree);
    cpi.payer(payer);
    cpi.tree_creator_or_delegate(Some(tree_creator_or_delegate));
    cpi.compression_program(compression_program);
    cpi.log_wrapper(log_wrapper);
    cpi.system_program(system_program);
    cpi.mpl_core_program(mpl_core_program);
    cpi.core_collection(Some(core_collection));
    cpi.mpl_core_cpi_signer(Some(mpl_core_cpi_signer));
    cpi.collection_authority(Some(collection_authority));
    cpi.metadata(mpl_bubblegum::types::MetadataArgsV2 {
        name: args.name.clone(),
        symbol: "GG-CERT".to_string(),
        uri: args.uri.clone(),
        seller_fee_basis_points: 0,
        primary_sale_happened: false,
        is_mutable: false,
        token_standard: Some(TokenStandard::NonFungible),
        collection: Some(ctx.accounts.core_collection.key()),
        creators: vec![Creator {
            address: ctx.accounts.university_authority.key(),
            verified: true,
            share: 100,
        }],
    });

    // Invoke CPI
    cpi.invoke()?;

    // Emit program event
    emit!(CertificateMintedV2 {
        admin: ctx.accounts.global_config.owner,
        university: ctx.accounts.university.key(),
        authority: ctx.accounts.university_authority.key(),
        recipient: args.recipient,
        merkle_tree: ctx.accounts.merkle_tree.key(),
        tree_config: ctx.accounts.tree_config.key(),
        collection: ctx.accounts.core_collection.key(),
        name: args.name,
        uri: args.uri,
        attached_collection: args.attach_collection,
    });
    

    Ok(())
}