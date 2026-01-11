#![allow(deprecated, unexpected_cfgs)]
use anchor_lang::prelude::*;

pub mod errors;
pub mod events;
pub mod instructions;
pub mod utils;
pub mod states;

use instructions::*;

declare_id!("5CBnkDYCPPu9tzNqdgYJkjQpsFgeiTkdR2R64TP9HQUZ");

#[program]
pub mod genuinegrads {

    use super::*;

    pub fn initialize_config(ctx: Context<InitializeConfig>) -> Result<()> {
        initialize_config::handler(ctx)
    }

    pub fn register_university(
        ctx: Context<RegisterUniversity>,
        args: RegisterUniversityArgs
    ) -> Result<()> {
        register_university::handler(ctx,args)
    }

    pub fn approve_university(
        ctx: Context<ApproveUniversity>
    ) -> Result<()> {
        approve_university::handler(ctx)
    }

    pub fn deactivate_university(
        ctx: Context<DeactivateUniversity>
    ) -> Result<()> {
        deactivate_university::handler(ctx)
    }

    pub fn create_tree_v2(
        ctx: Context<CreateTreeV2>,
        args: CreateTreeV2Args
    ) -> Result<()> {
        create_tree_v2::handler(ctx, args)
    }

    pub fn create_core_collection_v2_cpi(
        ctx: Context<CreateCoreCollectionV2Cpi>,
        args: CreateCoreCollectionV2Args,
    ) -> Result<()> {
        create_core_collection_v2_cpi::handler(ctx, args)
    }

    pub fn mint_certificate_v2(
        ctx: Context<MintCertificateV2>,
        args: MintCertificateArgs,
    ) -> Result<()> {
        mint_certificate_v2::handler(ctx, args)
    }

    pub fn burn_certificate_v2<'info>(
        ctx: Context<'_, '_, '_, 'info, BurnCertificateV2<'info>>,
        args: BurnCertificateArgs,
    ) -> Result<()> {
        burn_certificate_v2::handler(ctx, args)
    }

    // pub fn set_non_transferable_v2(ctx: Context<SetNonTransferableV2>, args: SetNonTransferableArgs) -> Result<()> {
    //     set_non_transferable_v2::handler(ctx, args)
    // }


    // pub fn update_university(
    //     ctx: Context<UpdateUniversity>,
    //     args: update_university::UpdateUniversityArgs,
    // ) -> Result<()> {
    //     update_university::handler(ctx, args)
    // }


}
