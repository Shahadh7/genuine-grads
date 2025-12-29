pragma circom 2.1.6;

include "../node_modules/circomlib/circuits/poseidon.circom";

/*
 * Achievement Membership Circuit v1
 *
 * Proves that a student possesses an achievement for a specific credential
 * without revealing their secret credentials.
 *
 * Public Inputs:
 *   - commitment: The stored Poseidon commitment C
 *   - credential_hash: Hash of the credential ID (Solana mintAddress)
 *   - achievement_hash: Hash of the achievement code
 *
 * Private Inputs:
 *   - student_secret: 254-bit secret known only to student
 *   - salt: 254-bit random salt for additional entropy
 *
 * Constraint:
 *   Poseidon(credential_hash, student_secret, salt, achievement_hash) === commitment
 *
 * This proves the student knows the secret that was used to create the commitment,
 * binding them to the specific credential and achievement.
 */

template AchievementMembership() {
    // Public inputs
    signal input commitment;
    signal input credential_hash;
    signal input achievement_hash;

    // Private inputs (witness)
    signal input student_secret;
    signal input salt;

    // Compute Poseidon hash of (credential_hash, student_secret, salt, achievement_hash)
    // Using 4-input Poseidon
    component poseidon = Poseidon(4);
    poseidon.inputs[0] <== credential_hash;
    poseidon.inputs[1] <== student_secret;
    poseidon.inputs[2] <== salt;
    poseidon.inputs[3] <== achievement_hash;

    // Constraint: computed hash must equal the public commitment
    commitment === poseidon.out;
}

// Main component with public inputs specified
component main {public [commitment, credential_hash, achievement_hash]} = AchievementMembership();
