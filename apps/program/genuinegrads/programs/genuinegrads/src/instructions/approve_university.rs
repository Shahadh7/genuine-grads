use anchor_lang::prelude::*;
use crate::states::{GlobalConfig, University, GLOBAL_CONFIG_SEED, UNIVERSITY_SEED};
use crate::errors::GenuineGradsError;
use crate::events::UniversityApproved;

#[derive(Accounts)]
pub struct ApproveUniversity<'info> {
    /// Super admin (also payer in your model, but no new accounts created here)
    pub super_admin: Signer<'info>,

    /// GlobalConfig bound to this super admin
    /// PDA = ["global-config", super_admin]
    #[account(
        mut,
        seeds = [GLOBAL_CONFIG_SEED, super_admin.key().as_ref()],
        bump = global_config.bump
    )]
    pub global_config: Account<'info, GlobalConfig>,

    /// The authority that originally registered the university
    /// (Included so we can deterministically derive the university PDA.)
    /// CHECK: validated against `university.authority` below
    pub university_authority: UncheckedAccount<'info>,

    /// Target University to approve
    /// PDA = ["university", university_authority]
    #[account(
        mut,
        seeds = [UNIVERSITY_SEED, university_authority.key().as_ref()],
        bump = university.bump
    )]
    pub university: Account<'info, University>,
}

pub fn handler(ctx: Context<ApproveUniversity>) -> Result<()> {
    let gc = &ctx.accounts.global_config;
    let uni = &mut ctx.accounts.university;

    // Governance & safety checks
    require_keys_eq!(ctx.accounts.super_admin.key(), gc.owner, GenuineGradsError::Unauthorized);
    require!(!gc.frozen, GenuineGradsError::Frozen);

    // Sanity: university PDA must correspond to the same authority stored on-chain
    require_keys_eq!(
        ctx.accounts.university_authority.key(),
        uni.authority,
        GenuineGradsError::Unauthorized
    );

    // Idempotency guard
    require!(!uni.is_active, GenuineGradsError::AlreadyActive);

    // Approve
    uni.is_active = true;

    // If you keep an approval timestamp in your University struct, set it here:
    // uni.approved_at = Clock::get()?.unix_timestamp;

    emit!(UniversityApproved {
        admin: gc.owner,
        authority: uni.authority,
        university: uni.key(),
        is_active: uni.is_active,
    });

    Ok(())
}
