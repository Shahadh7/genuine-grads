// programs/genuinegrads/src/instructions/initialize_config.rs
use anchor_lang::prelude::*;
use crate::states::{GlobalConfig, GLOBAL_CONFIG_SEED};
use crate::events::ConfigInitialized;

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    /// Super admin is also the payer
    #[account(mut)]
    pub super_admin: Signer<'info>,

    /// One-time GlobalConfig PDA for *this* super admin
    /// PDA = ["global-config", super_admin]
    #[account(
        init,
        payer = super_admin,
        space = 8 + GlobalConfig::INIT_SPACE,
        seeds = [GLOBAL_CONFIG_SEED, super_admin.key().as_ref()],
        bump
    )]
    pub global_config: Account<'info, GlobalConfig>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeConfig>) -> Result<()> {
    let bump = ctx.bumps.global_config;
    let gc = &mut ctx.accounts.global_config;

    gc.owner = ctx.accounts.super_admin.key();
    gc.frozen = false;
    gc.bump = bump;

    emit!(ConfigInitialized { 
        owner: gc.owner 
    });

    msg!("GenuineGrads Program initiated by owner: {}", gc.owner);
    Ok(())
}
