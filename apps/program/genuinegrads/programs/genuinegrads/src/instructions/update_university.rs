use anchor_lang::prelude::*;

use crate::errors::GenuineGradsError;
use crate::events::UniversityUpdated;
use crate::state::{
    GlobalConfig, University, UNIVERSITY_NAME_MAX, UNIVERSITY_URI_MAX,
};

#[derive(Accounts)]
pub struct UpdateUniversity<'info> {
    /// Payer (optional top-up if you ever add realloc later)
    #[account(mut)]
    pub payer: Signer<'info>,

    /// Namespacing config (read-only)
    pub global_config: Account<'info, GlobalConfig>,

    /// The university to update; must match the config’s admin namespace
    #[account(
        mut,
        constraint = university.admin == global_config.admin
            @ GenuineGradsError::Unauthorized
    )]
    pub university: Account<'info, University>,

    /// Must be the university’s authority
    pub university_authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Update args (simple and fixed-size so we don't need realloc)
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UpdateUniversityArgs {
    pub new_name: Option<String>,
    pub new_metadata_uri: Option<String>,
    pub set_active: Option<bool>,
}

pub fn handler(ctx: Context<UpdateUniversity>, args: UpdateUniversityArgs) -> Result<()> {
    // Signer must be the current authority
    require_keys_eq!(
        ctx.accounts.university_authority.key(),
        ctx.accounts.university.authority,
        GenuineGradsError::Unauthorized
    );

    let uni = &mut ctx.accounts.university;

    if let Some(name) = args.new_name {
        require!(name.len() <= UNIVERSITY_NAME_MAX, GenuineGradsError::NameTooLong);
        uni.name = name;
    }

    if let Some(uri) = args.new_metadata_uri {
        require!(uri.len() <= UNIVERSITY_URI_MAX, GenuineGradsError::UriTooLong);
        uni.metadata_uri = uri;
    }

    if let Some(flag) = args.set_active {
        uni.is_active = flag;
    }

    emit!(UniversityUpdated {
        admin: uni.admin,
        university: uni.key(),
        authority: uni.authority,
        name: uni.name.clone(),
        metadata_uri: uni.metadata_uri.clone(),
        is_active: uni.is_active,
    });

    Ok(())
}
