// programs/genuinegrads/src/instructions/register_university.rs
use anchor_lang::prelude::*;
use crate::states::{GlobalConfig, University, GLOBAL_CONFIG_SEED, UNIVERSITY_SEED};
use crate::errors::GenuineGradsError;
use crate::events::UniversityRegistered;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct RegisterUniversityArgs {
    pub name: String,
    pub metadata_uri: Option<String>,
}

#[derive(Accounts)]
pub struct RegisterUniversity<'info> {
    /// University authority is also the payer
    #[account(mut)]
    pub university_authority: Signer<'info>,

    /// Global singleton config (read-only)
    #[account(
        seeds = [GLOBAL_CONFIG_SEED, global_config.owner.as_ref()],
        bump = global_config.bump
    )]
    pub global_config: Account<'info, GlobalConfig>,

    /// University account PDA:
    /// seeds = ["university", university_authority]  // (payer == authority)
    #[account(
        init,
        payer = university_authority,
        space = 8 + University::INIT_SPACE,
        seeds = [
            UNIVERSITY_SEED,
            university_authority.key().as_ref()
        ],
        bump
    )]
    pub university: Account<'info, University>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RegisterUniversity>, args: RegisterUniversityArgs) -> Result<()> {
    
    validate_name(&args.name)?;

    let bump = ctx.bumps.university;
    let now = Clock::get()?.unix_timestamp;

    let uni = &mut ctx.accounts.university;

    // Program-level owner (super admin)
    uni.admin = ctx.accounts.global_config.owner;

    // Operational authority (and payer)
    uni.authority = ctx.accounts.university_authority.key();

    uni.name = args.name;
    uni.metadata_uri = args.metadata_uri.unwrap_or_default();
    uni.is_active = false; // will be approved by super admin later
    uni.created_at = now;
    uni.bump = bump;

    emit!(UniversityRegistered {
        admin: uni.admin,
        university_authority: uni.authority,
        university: uni.key(),
        name: uni.name.clone(),
        is_active: uni.is_active,
        metadata_uri: uni.metadata_uri.clone()
    });

    msg!("University: {} registered into the GenuineGrads system:", uni.name);

    Ok(())
}

fn validate_name(name: &str) -> Result<()> {
    require!(name.len() >= 3 && name.len() <= 64, GenuineGradsError::InvalidName);
    Ok(())
}
