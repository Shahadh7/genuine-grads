use anchor_lang::prelude::*;
use mpl_core::ID as MPL_CORE_ID;
use mpl_bubblegum::{
    instructions::SetNonTransferableV2CpiBuilder
};
use crate::utils::{MplBubblegum, Noop, SplAccountCompression};

use crate::errors::GenuineGradsError;
use crate::events::CertificateLockedV2;
use crate::state::{GlobalConfig, University, UniversityCollection, UniversityTree, CertificateRecord};


#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct SetNonTransferableArgs {
    pub root: [u8; 32],
    pub data_hash: [u8; 32],
    pub creator_hash: [u8; 32],
    pub nonce: u64,
    pub index: u32,
}

#[derive(Accounts)]
pub struct SetNonTransferableV2<'info> {
    /// Payer for CPI fees
    #[account(mut)]
    pub payer: Signer<'info>,

    pub global_config: Account<'info, GlobalConfig>,

    #[account(
        constraint = university.admin == global_config.admin
            @ GenuineGradsError::Unauthorized,
        constraint = university.is_active @ GenuineGradsError::UniversityInactive
    )]
    pub university: Account<'info, University>,

    /// Must be the university authority (PermanentFreezeDelegate via MPL Core plugin)
    pub university_authority: Signer<'info>,

    /// The current owner of the leaf (student)
    /// CHECK: only used as pubkey passthrough to Bubblegum
    pub receiver: UncheckedAccount<'info>,

    /// Your recorded tree
    pub university_tree: Account<'info, UniversityTree>,

    /// CHECK: must match record
    #[account(mut, address = university_tree.merkle_tree)]
    pub merkle_tree: UncheckedAccount<'info>,

    /// CHECK: must match record
    #[account(mut, address = university_tree.tree_config)]
    pub tree_config: UncheckedAccount<'info>,

    /// Link to the MPL-Core collection
    pub university_collection: Account<'info, UniversityCollection>,

    /// CHECK: must be owned by MPL Core
    #[account(address = university_collection.core_collection)]
    pub core_collection: UncheckedAccount<'info>,

    /// We update the same record we created at mint time
    #[account(mut,
        constraint = certificate_record.university == university.key(),
        constraint = certificate_record.merkle_tree == merkle_tree.key(),
        constraint = certificate_record.receiver == receiver.key(),
    )]
    pub certificate_record: Account<'info, CertificateRecord>,

    // Programs
    pub bubblegum_program: Program<'info, MplBubblegum>,
    pub compression_program: Program<'info, SplAccountCompression>,
    pub log_wrapper: Program<'info, Noop>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<SetNonTransferableV2>, args: SetNonTransferableArgs) -> Result<()> {
    // Auth checks
    require_keys_eq!(
        ctx.accounts.university_authority.key(),
        ctx.accounts.university.authority,
        GenuineGradsError::Unauthorized
    );
    require_keys_eq!(
        *ctx.accounts.core_collection.owner,
        MPL_CORE_ID,
        GenuineGradsError::NotMplCoreOwned
    );

    // CPI: SetNonTransferableV2 (authority must be PermanentFreezeDelegate on collection per Bubblegum V2)
    SetNonTransferableV2CpiBuilder::new(&ctx.accounts.bubblegum_program.to_account_info())
        .merkle_tree(&ctx.accounts.merkle_tree.to_account_info())
        .tree_config(&ctx.accounts.tree_config.to_account_info())
        .leaf_owner(&ctx.accounts.receiver.to_account_info())
        .leaf_delegate(Some(&ctx.accounts.receiver.to_account_info()))
        .core_collection(&ctx.accounts.core_collection.to_account_info())
        .payer(&ctx.accounts.payer.to_account_info())
        .system_program(&ctx.accounts.system_program.to_account_info())
        .compression_program(&ctx.accounts.compression_program.to_account_info())
        .log_wrapper(&ctx.accounts.log_wrapper.to_account_info())
        .authority(Some(&ctx.accounts.payer.to_account_info()))
        .root(args.root)
        .data_hash(args.data_hash)
        .creator_hash(args.creator_hash)
        .nonce(args.nonce)
        .index(args.index)
        .invoke()?;

    // Mark record locally
    let rec = &mut ctx.accounts.certificate_record;
    rec.is_non_transferable = true;

    emit!(CertificateLockedV2 {
        admin: rec.admin,
        university: rec.university,
        merkle_tree: rec.merkle_tree,
        receiver: rec.receiver,
        collection: rec.collection,
    });

    Ok(())
}
