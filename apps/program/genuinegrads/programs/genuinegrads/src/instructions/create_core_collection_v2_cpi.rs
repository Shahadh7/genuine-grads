#![allow(deprecated, unexpected_cfgs)]  

use anchor_lang::prelude::*;
use crate::errors::GenuineGradsError;
use crate::events::CollectionCreatedV2;
use crate::states::{
    GlobalConfig, University, UniversityCollection,
    GLOBAL_CONFIG_SEED, UNIVERSITY_SEED, UNIVERSITY_COLLECTION_SEED,
};

use mpl_core::{
    ID as MPL_CORE_ID,
    types::{
        Plugin, PluginAuthorityPair,
        BubblegumV2, PermanentFreezeDelegate, PermanentBurnDelegate,
    },
    instructions::CreateCollectionV2CpiBuilder
};

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateCoreCollectionV2Args {
    /// Human-readable display name for the collection
    pub name: String,
    /// Off-chain metadata URI (JSON)
    pub uri: String,
}

#[derive(Accounts)]
pub struct CreateCoreCollectionV2Cpi<'info> {
    /// University authority is also the payer for CPI
    #[account(mut)]
    pub university_authority: Signer<'info>,

    /// GlobalConfig bound to the program's super admin. We derive it using the
    /// admin pubkey stored inside `university.admin` to ensure consistency.
    /// PDA: ["global-config", university.admin]
    #[account(
        seeds = [GLOBAL_CONFIG_SEED, global_config.owner.as_ref()],
        bump = global_config.bump
    )]
    pub global_config: Account<'info, GlobalConfig>,

    /// University must already be registered and ACTIVE.
    /// PDA: ["university", university_authority]
    #[account(
        mut,
        seeds = [UNIVERSITY_SEED, university_authority.key().as_ref()],
        bump = university.bump,
        constraint = university.is_active @ GenuineGradsError::UniversityInactive,
        constraint = university.authority == university_authority.key() @ GenuineGradsError::Unauthorized,
        constraint = university.admin == global_config.owner @ GenuineGradsError::Unauthorized
    )]
    pub university: Account<'info, University>,

    /// Our program's record that links this University -> Core Collection
    /// PDA: ["university_collection", university]
    #[account(
        init,
        payer = university_authority,
        space = 8 + UniversityCollection::INIT_SPACE,
        seeds = [UNIVERSITY_COLLECTION_SEED, university.key().as_ref()],
        bump
    )]
    pub university_collection: Account<'info, UniversityCollection>,

    /// CHECK: The new Core Collection (MPL Core asset) to be created by CPI.
    /// This is created by the MPL Core program during CPI (so it must be a
    /// writable placeholder account here).
    #[account(mut)]
    pub core_collection: Signer<'info>, 

    /// The MPL Core program
    /// We keep it as an UncheckedAccount and enforce the well-known ID below.
    /// You can also wrap with a typed Program if you prefer.
    /// CHECK: program ID checked against constant
    pub mpl_core_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateCoreCollectionV2Cpi>,
    args: CreateCoreCollectionV2Args,
) -> Result<()> {
    // Basic checks
    require!(!ctx.accounts.global_config.frozen, GenuineGradsError::Frozen);
    require!(ctx.accounts.university.is_active, GenuineGradsError::UniversityInactive);
    require_keys_eq!(ctx.accounts.mpl_core_program.key(), MPL_CORE_ID, GenuineGradsError::InvalidProgramExecutable);
    require!(args.name.len() > 0 && args.name.len() <= 80, GenuineGradsError::InvalidName);
    require!(args.uri.len() > 0 && args.uri.len() <= 256, GenuineGradsError::InvalidUri);
    

    let ua = &ctx.accounts.university_authority;
    let collection = &ctx.accounts.core_collection;

    let mut cpi = CreateCollectionV2CpiBuilder::new(&ctx.accounts.mpl_core_program);

    let payer = &ua.to_account_info();
    let update_authority = &ua.to_account_info();
    let collection = &collection.to_account_info();
    let system_program = &ctx.accounts.system_program.to_account_info();

    let plugins: Vec<PluginAuthorityPair> = vec![
        PluginAuthorityPair {
            plugin: Plugin::BubblegumV2(BubblegumV2 {}),
            // Safe default per docs: UpdateAuthority manages it.
            authority: None,
        },
        PluginAuthorityPair {
            plugin: Plugin::PermanentFreezeDelegate(PermanentFreezeDelegate { frozen: false }),
            authority: None,
        },
        PluginAuthorityPair {
            plugin: Plugin::PermanentBurnDelegate(PermanentBurnDelegate {}),
            authority: None,
        },
    ];

    cpi.payer(payer);
    cpi.update_authority(Some(update_authority)); // authority that can update this collection later
    cpi.collection(collection);
    cpi.name(args.name.clone());
    cpi.uri(args.uri.clone());
    cpi.system_program(system_program);
    cpi.plugins(plugins);
    cpi.invoke()?;

    let bump = ctx.bumps.university_collection;
    let now = Clock::get()?.unix_timestamp;

    let rec = &mut ctx.accounts.university_collection;
    rec.admin = ctx.accounts.global_config.owner;
    rec.university = ctx.accounts.university.key();
    rec.authority = ua.key();
    rec.collection = collection.key();
    rec.name = args.name;
    rec.uri = args.uri;
    rec.created_at = now;
    rec.bump = bump;

    // Emit event for indexers / clients
    emit!(CollectionCreatedV2 {
        admin: rec.admin,
        university: rec.university,
        authority: rec.authority,
        collection: rec.collection,
        name: rec.name.clone(),
        uri: rec.uri.clone(),
    });

    msg!("Collection created for {}: ", rec.university);

    Ok(())
}