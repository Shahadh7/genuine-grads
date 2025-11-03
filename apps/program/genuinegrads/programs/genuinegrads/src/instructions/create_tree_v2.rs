#![allow(deprecated, unexpected_cfgs)]

use anchor_lang::prelude::*;
use crate::errors::GenuineGradsError;
use crate::events::TreeCreatedV2;
use crate::states::{
    GlobalConfig, University, UniversityTree,
    GLOBAL_CONFIG_SEED, UNIVERSITY_SEED, UNIVERSITY_TREE_SEED,
};

use mpl_bubblegum::instructions::CreateTreeConfigV2CpiBuilder;

use crate::utils::{Noop, SplAccountCompression, MplBubblegum};

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateTreeV2Args {
    /// Merkle max depth (e.g., 14, 20, 24)
    pub max_depth: u32,
    /// Max buffer size (e.g., 64, 256, 1024)
    pub max_buffer_size: u32,
    /// Whether the tree is public (true) or private (false)
    pub is_public: bool,
}

#[derive(Accounts)]
pub struct CreateTreeV2<'info> {
    /// University authority is also the payer for the CPI
    #[account(mut)]
    pub university_authority: Signer<'info>,

    /// GlobalConfig bound to this university’s admin (super admin)
    /// PDA = ["global-config", university.admin]
    #[account(
        seeds = [GLOBAL_CONFIG_SEED, global_config.owner.as_ref()],
        bump = global_config.bump
    )]
    pub global_config: Account<'info, GlobalConfig>,

    /// University must be ACTIVE and tied to the same admin
    /// PDA = ["university", university_authority]
    #[account(
        seeds = [UNIVERSITY_SEED, university_authority.key().as_ref()],
        bump = university.bump,
        constraint = university.is_active @ GenuineGradsError::UniversityInactive,
        constraint = university.authority == university_authority.key() @ GenuineGradsError::Unauthorized,
        constraint = university.admin == global_config.owner @ GenuineGradsError::Unauthorized
    )]
    pub university: Account<'info, University>,

    /// Our program's record linking this University -> Merkle Tree
    /// PDA = ["university_tree", merkle_tree]
    #[account(
        init,
        payer = university_authority,
        space = 8 + UniversityTree::INIT_SPACE,
        seeds = [UNIVERSITY_TREE_SEED, merkle_tree.key().as_ref()],
        bump
    )]
    pub university_tree: Account<'info, UniversityTree>,

    #[account(
        mut,
        owner = compression_program.key(),
    )]
    pub merkle_tree: Signer<'info>,

    /// CHECK: Bubblegum tree_config PDA for this merkle_tree (derived by Bubblegum)
    /// We don't derive here; we just pass it through for CPI.
    #[account(mut)]
    pub tree_config: UncheckedAccount<'info>,

    pub bubblegum_program: Program<'info, MplBubblegum>,

    /// SPL Account Compression program
    pub compression_program: Program<'info, SplAccountCompression>,

    /// SPL Noop program (log wrapper)
    pub log_wrapper: Program<'info, Noop>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateTreeV2>, args: CreateTreeV2Args) -> Result<()> {
    // Guard rails
    require!(!ctx.accounts.global_config.frozen, GenuineGradsError::Frozen);
    require!(ctx.accounts.university.is_active, GenuineGradsError::UniversityInactive);
    require_keys_eq!(ctx.accounts.bubblegum_program.key(), MplBubblegum::id(), GenuineGradsError::InvalidProgramExecutable);
    require_keys_eq!(ctx.accounts.compression_program.key(), SplAccountCompression::id(), GenuineGradsError::InvalidProgramExecutable);
    require_keys_eq!(ctx.accounts.log_wrapper.key(), Noop::id(), GenuineGradsError::InvalidProgramExecutable);
    
    // Validate Bubblegum's tree_config PDA matches expected derivation
    let (expected_tree_config, _bump) = Pubkey::find_program_address(
        &[ctx.accounts.merkle_tree.key.as_ref()],
        &MplBubblegum::id()
    );
    require_keys_eq!(
        ctx.accounts.tree_config.key(),
        expected_tree_config,
        GenuineGradsError::InvalidTreeConfig
    );

    // --- CPI: CreateTreeConfigV2 ---
    // This allocates/initializes the merkle tree & tree config under Bubblegum, using
    // the University Authority as payer. No CPI signer PDAs needed here.
    let mut cpi = CreateTreeConfigV2CpiBuilder::new(&ctx.accounts.bubblegum_program);

    let payer = &ctx.accounts.university_authority.to_account_info();
    let tree_config = &ctx.accounts.tree_config.to_account_info();
    let merkle_tree = &ctx.accounts.merkle_tree.to_account_info();
    let system_program = &ctx.accounts.system_program.to_account_info();
    let log_wrapper = &ctx.accounts.log_wrapper.to_account_info();
    let compression_program = &ctx.accounts.compression_program.to_account_info();
    let tree_creator = &ctx.accounts.university_authority.to_account_info();

    cpi.payer(payer);
    cpi.tree_config(tree_config);
    cpi.merkle_tree(merkle_tree);
    cpi.system_program(system_program);
    cpi.log_wrapper(log_wrapper);
    cpi.compression_program(compression_program);
    cpi.tree_creator(Some(tree_creator));

    // Parameters
    cpi.max_depth(args.max_depth);
    cpi.max_buffer_size(args.max_buffer_size);
    cpi.public(args.is_public);

    // Invoke Bubblegum
    cpi.invoke()?;

    // --- Persist our record ---
    let bump = ctx.bumps.university_tree;
    let now = Clock::get()?.unix_timestamp;

    let rec = &mut ctx.accounts.university_tree;
    rec.admin = ctx.accounts.global_config.owner;
    rec.university = ctx.accounts.university.key();
    rec.authority = ctx.accounts.university_authority.key();
    rec.merkle_tree = ctx.accounts.merkle_tree.key();
    rec.tree_config = ctx.accounts.tree_config.key();
    rec.max_depth = args.max_depth;
    rec.max_buffer_size = args.max_buffer_size;
    rec.is_public = args.is_public;
    rec.created_at = now;
    rec.bump = bump;

    emit!(TreeCreatedV2 {
        admin: rec.admin,
        university: rec.university,
        authority: rec.authority,
        merkle_tree: rec.merkle_tree,
        tree_config: rec.tree_config,
        max_depth: rec.max_depth,
        max_buffer_size: rec.max_buffer_size,
        is_public: rec.is_public,
    });

    Ok(())
}