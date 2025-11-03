use anchor_lang::prelude::*;
use crate::states::{GlobalConfig, University, GLOBAL_CONFIG_SEED, UNIVERSITY_SEED};
use crate::errors::GenuineGradsError;
use crate::events::UniversityDeactivated;

#[derive(Accounts)]
pub struct DeactivateUniversity<'info> {
    /// Super admin (no new accounts created here)
    pub super_admin: Signer<'info>,

    /// GlobalConfig bound to this super admin
    /// PDA = ["global-config", super_admin]
    #[account(
        mut,
        seeds = [GLOBAL_CONFIG_SEED, super_admin.key().as_ref()],
        bump = global_config.bump
    )]
    pub global_config: Account<'info, GlobalConfig>,

    /// Authority used to derive the target university PDA
    /// CHECK: validated against `university.authority`
    pub university_authority: UncheckedAccount<'info>,

    /// Target University
    /// PDA = ["university", university_authority]
    #[account(
        mut,
        seeds = [UNIVERSITY_SEED, university_authority.key().as_ref()],
        bump = university.bump
    )]
    pub university: Account<'info, University>,
}

pub fn handler(ctx: Context<DeactivateUniversity>) -> Result<()> {
    let gc = &ctx.accounts.global_config;
    let uni = &mut ctx.accounts.university;

    // Governance checks
    require_keys_eq!(ctx.accounts.super_admin.key(), gc.owner, GenuineGradsError::Unauthorized);
    require!(!gc.frozen, GenuineGradsError::Frozen);

    // PDA sanity
    require_keys_eq!(
        ctx.accounts.university_authority.key(),
        uni.authority,
        GenuineGradsError::Unauthorized
    );

    // Idempotency guard
    require!(uni.is_active, GenuineGradsError::AlreadyInactive);

    // Deactivate
    uni.is_active = false;
    // If you maintain timestamps, uncomment:
    // uni.deactivated_at = Clock::get()?.unix_timestamp;

    emit!(UniversityDeactivated {
        admin: gc.owner,
        authority: uni.authority,
        university: uni.key(),
        is_active: uni.is_active,
    });

    Ok(())
}
