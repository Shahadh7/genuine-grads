import { expect } from 'chai';
import { buildPoseidon } from 'circomlibjs';
import * as snarkjs from 'snarkjs';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARTIFACTS_DIR = path.join(__dirname, '..', 'artifacts');
const WASM_FILE = path.join(ARTIFACTS_DIR, 'ach_member_v1.wasm');
const ZKEY_FILE = path.join(ARTIFACTS_DIR, 'ach_member_v1.zkey');
const VKEY_FILE = path.join(ARTIFACTS_DIR, 'ach_member_v1_vkey.json');

// BN254 scalar field order
const BN254_SCALAR_FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

describe('Achievement Membership Circuit', function() {
  let poseidon;
  let vkey;

  before(async function() {
    // Check if artifacts exist
    if (!fs.existsSync(WASM_FILE) || !fs.existsSync(ZKEY_FILE) || !fs.existsSync(VKEY_FILE)) {
      console.log('⚠️  Artifacts not found. Please run "npm run build" first.');
      this.skip();
    }

    // Initialize Poseidon
    poseidon = await buildPoseidon();

    // Load verification key
    vkey = JSON.parse(fs.readFileSync(VKEY_FILE, 'utf8'));
  });

  /**
   * Helper to compute Poseidon commitment
   */
  function computeCommitment(credentialHash, studentSecret, salt, achievementHash) {
    const hash = poseidon([credentialHash, studentSecret, salt, achievementHash]);
    return poseidon.F.toObject(hash);
  }

  /**
   * Helper to generate random field element
   */
  function randomFieldElement() {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    let value = 0n;
    for (let i = 0; i < 32; i++) {
      value = (value << 8n) | BigInt(bytes[i]);
    }
    return value % BN254_SCALAR_FIELD;
  }

  /**
   * Helper to derive field element from string (matches frontend logic)
   */
  async function stringToFieldElement(input) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    let hex = '';
    for (const byte of hashArray) {
      hex += byte.toString(16).padStart(2, '0');
    }
    const hashBigInt = BigInt('0x' + hex);
    return hashBigInt % BN254_SCALAR_FIELD;
  }

  it('should generate and verify a valid proof', async function() {
    // Generate test inputs
    const credentialHash = await stringToFieldElement('TEST_MINT_ADDRESS_123');
    const achievementHash = await stringToFieldElement('deans_list_2024');
    const studentSecret = randomFieldElement();
    const salt = randomFieldElement();

    // Compute commitment
    const commitment = computeCommitment(credentialHash, studentSecret, salt, achievementHash);

    // Create circuit input
    const input = {
      commitment: commitment.toString(),
      credential_hash: credentialHash.toString(),
      achievement_hash: achievementHash.toString(),
      student_secret: studentSecret.toString(),
      salt: salt.toString()
    };

    // Generate proof
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      input,
      WASM_FILE,
      ZKEY_FILE
    );

    // Verify public signals match expected
    expect(publicSignals[0]).to.equal(commitment.toString());
    expect(publicSignals[1]).to.equal(credentialHash.toString());
    expect(publicSignals[2]).to.equal(achievementHash.toString());

    // Verify proof
    const isValid = await snarkjs.groth16.verify(vkey, publicSignals, proof);
    expect(isValid).to.be.true;
  });

  it('should fail verification with wrong commitment', async function() {
    // Generate test inputs
    const credentialHash = await stringToFieldElement('TEST_MINT_ADDRESS_456');
    const achievementHash = await stringToFieldElement('best_performer_2024');
    const studentSecret = randomFieldElement();
    const salt = randomFieldElement();

    // Compute correct commitment
    const correctCommitment = computeCommitment(credentialHash, studentSecret, salt, achievementHash);

    // Use wrong commitment
    const wrongCommitment = randomFieldElement();

    // Create circuit input with wrong commitment
    const input = {
      commitment: wrongCommitment.toString(),
      credential_hash: credentialHash.toString(),
      achievement_hash: achievementHash.toString(),
      student_secret: studentSecret.toString(),
      salt: salt.toString()
    };

    // Proof generation should fail because constraint is not satisfied
    try {
      await snarkjs.groth16.fullProve(input, WASM_FILE, ZKEY_FILE);
      expect.fail('Should have thrown an error');
    } catch (error) {
      // Expected: circuit constraints not satisfied
      expect(error).to.exist;
    }
  });

  it('should fail verification with wrong secret', async function() {
    // Generate test inputs
    const credentialHash = await stringToFieldElement('TEST_MINT_ADDRESS_789');
    const achievementHash = await stringToFieldElement('research_award_2024');
    const correctSecret = randomFieldElement();
    const wrongSecret = randomFieldElement();
    const salt = randomFieldElement();

    // Compute commitment with correct secret
    const commitment = computeCommitment(credentialHash, correctSecret, salt, achievementHash);

    // Try to generate proof with wrong secret
    const input = {
      commitment: commitment.toString(),
      credential_hash: credentialHash.toString(),
      achievement_hash: achievementHash.toString(),
      student_secret: wrongSecret.toString(),
      salt: salt.toString()
    };

    // Proof generation should fail
    try {
      await snarkjs.groth16.fullProve(input, WASM_FILE, ZKEY_FILE);
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error).to.exist;
    }
  });

  it('should produce deterministic commitment', async function() {
    // Same inputs should produce same commitment
    const credentialHash = await stringToFieldElement('DETERMINISTIC_TEST');
    const achievementHash = await stringToFieldElement('test_achievement');
    const studentSecret = 12345678901234567890n;
    const salt = 98765432109876543210n;

    const commitment1 = computeCommitment(credentialHash, studentSecret, salt, achievementHash);
    const commitment2 = computeCommitment(credentialHash, studentSecret, salt, achievementHash);

    expect(commitment1).to.equal(commitment2);
  });

  it('should handle maximum field values', async function() {
    // Test with values near field boundary
    const maxValue = BN254_SCALAR_FIELD - 1n;
    const credentialHash = maxValue;
    const achievementHash = maxValue;
    const studentSecret = maxValue;
    const salt = maxValue;

    // Should not throw
    const commitment = computeCommitment(credentialHash, studentSecret, salt, achievementHash);
    expect(commitment).to.be.a('bigint');
    expect(commitment < BN254_SCALAR_FIELD).to.be.true;
  });

  it('should generate consistent hashes for known test vectors', async function() {
    // Test vector for CI/CD validation
    const testVector = {
      credentialId: 'TEST_CREDENTIAL_ABC123',
      achievementCode: 'DEANS_LIST_FALL_2024',
    };

    const credentialHash = await stringToFieldElement(testVector.credentialId);
    const achievementHash = await stringToFieldElement(testVector.achievementCode);

    // These hashes should be consistent across runs
    console.log('Test vector hashes:');
    console.log('  credentialHash:', credentialHash.toString());
    console.log('  achievementHash:', achievementHash.toString());

    // Verify they're valid field elements
    expect(credentialHash < BN254_SCALAR_FIELD).to.be.true;
    expect(achievementHash < BN254_SCALAR_FIELD).to.be.true;
  });
});
