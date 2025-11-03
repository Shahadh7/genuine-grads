// tests/genuinegrads.new-flow.spec.ts
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MPL_BUBBLEGUM_PROGRAM_ID } from "@metaplex-foundation/mpl-bubblegum";
import { MPL_CORE_PROGRAM_ID } from "@metaplex-foundation/mpl-core";

import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import { expect } from "chai";
import { Genuinegrads } from "../target/types/genuinegrads";
import {
  getMerkleTreeSize,
} from "@metaplex-foundation/spl-account-compression";

// Seeds
const GLOBAL_SEED = Buffer.from("global-config");
const UNIVERSITY_SEED = Buffer.from("university");
const UNI_COLLECTION_SEED = Buffer.from("university_collection");
const UNI_TREE_SEED = Buffer.from("university_tree");

const SPL_NOOP_PROGRAM_ID = new PublicKey("mnoopTCrg4p8ry25e4bcWA9XZjbNjMTfgYVGGEdRsf3")
const SPL_ACCOUNT_COMPRESSION_PROGRAM_ID = new PublicKey("mcmt6YrQEMKw8Mw43FmpRLmf7BqRnFMKmAcbxE3xkAW")
const mplCoreCpiSigner = new PublicKey("CbNY3JiXdXNE9tPNEk1aRZVEkWdj2v7kfJLNQwZZgpXk");

describe("genuinegrads", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Genuinegrads as Program<Genuinegrads>;

  // Actors
  let superAdmin: Keypair;
  let uniAuth: Keypair;        // university authority (also payer for uni ops)
  let uniAuth2: Keypair;

  // Global config PDA
  let globalPda: PublicKey;

  // University PDA(s)
  let uniPda: PublicKey;
  let uniPda2: PublicKey;

  // Collection artifacts
  let coreCollection: Keypair;
  let uniCollectionPda: PublicKey;

  // Tree artifacts
  let merkleTree: Keypair;
  let treeConfigPda: PublicKey;
  let uniTreePda: PublicKey;

  // Recipient (student)
  let student: Keypair;

  async function airdrop(pubkey: PublicKey, sol = 5) {
    const sig = await provider.connection.requestAirdrop(
      pubkey,
      sol * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig, "confirmed");
  }

  function findGlobal(superAdminPk: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [GLOBAL_SEED, superAdminPk.toBuffer()],
      program.programId
    );
  }

  function findUniversity(authority: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [UNIVERSITY_SEED, authority.toBuffer()],
      program.programId
    );
  }

  function findUniCollection(uni: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [UNI_COLLECTION_SEED, uni.toBuffer()],
      program.programId
    );
  }

  function findUniTree(merkle: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [UNI_TREE_SEED, merkle.toBuffer()],
       program.programId
    );
  }

  function findTreeConfig(merkleTree: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [merkleTree.toBuffer()],
      new PublicKey(MPL_BUBBLEGUM_PROGRAM_ID)
    );
  }

  before("bootstrap keypairs + airdrops", async () => {
    superAdmin = Keypair.generate();
    uniAuth = Keypair.generate();
    uniAuth2 = Keypair.generate();
    student = Keypair.generate();

    await Promise.all([
      airdrop(superAdmin.publicKey, 10),
      airdrop(uniAuth.publicKey, 10),
      airdrop(uniAuth2.publicKey, 10),
      airdrop(student.publicKey, 2),
    ]);

    // PDAs
    [globalPda] = findGlobal(superAdmin.publicKey);
    [uniPda] = findUniversity(uniAuth.publicKey);
    [uniPda2] = findUniversity(uniAuth2.publicKey);
  });

  // -------------------------------------------------------
  // initialize_config
  // -------------------------------------------------------
  describe("initialize_config", () => {
    it("creates the global config for superAdmin (payer==superAdmin)", async () => {
      await program.methods
        .initializeConfig()
        .accounts({
          superAdmin: superAdmin.publicKey,
          globalConfig: globalPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([superAdmin])
        .rpc();

      const cfg = await program.account.globalConfig.fetch(globalPda);
      expect(cfg.owner.toBase58()).to.eq(superAdmin.publicKey.toBase58());
      expect(cfg.frozen).to.eq(false);
    });

    it("fails to re-initialize same PDA", async () => {
      let threw = false;
      try {
        await program.methods
          .initializeConfig()
          .accounts({
            superAdmin: superAdmin.publicKey,
            globalConfig: globalPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([superAdmin])
          .rpc();
      } catch (e: any) {
        threw = true;
        expect(e.message).to.match(/already in use/i);
      }
      expect(threw).to.eq(true);
    });
  });

  // -------------------------------------------------------
  // register_university (inactive by default)
  // approve_university / deactivate_university (super-admin gated)
  // -------------------------------------------------------
  describe("universities (register/approve/deactivate)", () => {
    it("registers a university (payer==authority) → inactive", async () => {
      await program.methods
        .registerUniversity({ name: "Solana U", metadataUri: "https://u/1.json" })
        .accounts({
          universityAuthority: uniAuth.publicKey,
          globalConfig: globalPda,
          university: uniPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([uniAuth])
        .rpc();

      const uni = await program.account.university.fetch(uniPda);
      expect(uni.authority.toBase58()).to.eq(uniAuth.publicKey.toBase58());
      expect(uni.admin.toBase58()).to.eq(superAdmin.publicKey.toBase58());
      expect(uni.isActive).to.eq(false);
    });

    it("superAdmin approves the university", async () => {
      await program.methods
        .approveUniversity()
        .accounts({
          superAdmin: superAdmin.publicKey,
          globalConfig: globalPda,
          universityAuthority: uniAuth.publicKey,
          university: uniPda,
        })
        .signers([superAdmin])
        .rpc();

      const uni = await program.account.university.fetch(uniPda);
      expect(uni.isActive).to.eq(true);
    });

    it("registers a second university (inactive), then deactivates after approval", async () => {
      await program.methods
        .registerUniversity({ name: "Another U", metadataUri: "https://u/2.json" })
        .accounts({
          universityAuthority: uniAuth2.publicKey,
          globalConfig: globalPda,
          university: uniPda2,
          systemProgram: SystemProgram.programId,
        })
        .signers([uniAuth2])
        .rpc();

      // approve then deactivate
      await program.methods
        .approveUniversity()
        .accounts({
          superAdmin: superAdmin.publicKey,
          globalConfig: globalPda,
          universityAuthority: uniAuth2.publicKey,
          university: uniPda2,
        })
        .signers([superAdmin])
        .rpc();

      let uni2 = await program.account.university.fetch(uniPda2);
      expect(uni2.isActive).to.eq(true);

      await program.methods
        .deactivateUniversity()
        .accounts({
          superAdmin: superAdmin.publicKey,
          globalConfig: globalPda,
          universityAuthority: uniAuth2.publicKey,
          university: uniPda2,
        })
        .signers([superAdmin])
        .rpc();

      uni2 = await program.account.university.fetch(uniPda2);
      expect(uni2.isActive).to.eq(false);
    });
  });

  // -------------------------------------------------------
  // create_core_collection_v2_cpi
  // -------------------------------------------------------
  describe("create_core_collection_v2_cpi", () => {
    before("ensure uni is approved", async () => {
      const uni = await program.account.university.fetch(uniPda);
      if (!uni.isActive) {
        await program.methods
          .approveUniversity()
          .accounts({
            superAdmin: superAdmin.publicKey,
            globalConfig: globalPda,
            universityAuthority: uniAuth.publicKey,
            university: uniPda,
          })
          .signers([superAdmin])
          .rpc();
      }
    });

    it("creates a real Core collection via CPI and records it", async () => {
      coreCollection = Keypair.generate();
      [uniCollectionPda] = findUniCollection(uniPda);

     const tx = await program.methods
        .createCoreCollectionV2Cpi({ name: "GG Degrees", uri: "https://coll/gg.json" })
        .accounts({
          universityAuthority: uniAuth.publicKey,
          globalConfig: globalPda,
          university: uniPda,
          universityCollection: uniCollectionPda,
          coreCollection: coreCollection.publicKey,
          mplCoreProgram: MPL_CORE_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([uniAuth, coreCollection])
        .rpc();
      
      console.log(`tx for created core collection: ${tx}`)

      // Verify ownership + our record
      const ai = await provider.connection.getAccountInfo(
        coreCollection.publicKey,
        "confirmed"
      );
      expect(ai).to.not.eq(null);
      expect(ai!.owner.toBase58()).to.eq(new PublicKey(MPL_CORE_PROGRAM_ID).toBase58());

      const rec = await program.account.universityCollection.fetch(uniCollectionPda);
      expect(rec.university.toBase58()).to.eq(uniPda.toBase58());
      expect(rec.collection.toBase58()).to.eq(coreCollection.publicKey.toBase58());
      expect(rec.name).to.eq("GG Degrees");
      expect(rec.uri).to.eq("https://coll/gg.json");
    });
  });

  // -------------------------------------------------------
  // create_tree_v2 (Bubblegum V2)
  // -------------------------------------------------------
  describe("create_tree_v2", () => {
    const MAX_DEPTH = 14;
    const MAX_BUFFER = 64;
    const IS_PUBLIC = true;

    it("creates a Bubblegum V2 tree via CPI and records it", async () => {
      // 1. Generate new merkle tree keypair
      merkleTree = Keypair.generate();
      
      // 2. PRE-CREATE the merkle tree account (owned by compression program)
      const space = getMerkleTreeSize(MAX_DEPTH, MAX_BUFFER);
      const lamports = await provider.connection.getMinimumBalanceForRentExemption(space);

      const createIx = SystemProgram.createAccount({
        fromPubkey: uniAuth.publicKey,  // uniAuth pays
        newAccountPubkey: merkleTree.publicKey,
        lamports,
        space,
        programId: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
      });

      const createTx = new anchor.web3.Transaction().add(createIx);
      await anchor.web3.sendAndConfirmTransaction(
        provider.connection, 
        createTx, 
        [uniAuth, merkleTree]  // Both must sign the account creation
      );

      // 3. Derive tree_config PDA from the merkle tree
      [treeConfigPda] = findTreeConfig(merkleTree.publicKey);
      
      // 4. Derive university_tree PDA from the merkle tree
      [uniTreePda] = findUniTree(merkleTree.publicKey);

      console.log("Merkle Tree:", merkleTree.publicKey.toBase58());
      console.log("Tree Config:", treeConfigPda.toBase58());
      console.log("Uni Tree PDA:", uniTreePda.toBase58());

      // 5. Call createTreeV2
      await program.methods
        .createTreeV2({
          maxDepth: MAX_DEPTH,
          maxBufferSize: MAX_BUFFER,
          isPublic: IS_PUBLIC,
        })
        .accounts({
          universityAuthority: uniAuth.publicKey,
          globalConfig: globalPda,
          university: uniPda,
          universityTree: uniTreePda,
          merkleTree: merkleTree.publicKey,
          treeConfig: treeConfigPda,
          bubblegumProgram: MPL_BUBBLEGUM_PROGRAM_ID,
          compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
          logWrapper: SPL_NOOP_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([uniAuth, merkleTree])
        .rpc();

      // 6. Verify the tree was created
      const tree = await program.account.universityTree.fetch(uniTreePda);
      expect(tree.merkleTree.toBase58()).to.eq(merkleTree.publicKey.toBase58());
      expect(tree.maxDepth).to.eq(MAX_DEPTH);
      expect(tree.maxBufferSize).to.eq(MAX_BUFFER);
      expect(tree.isPublic).to.eq(IS_PUBLIC);
    });
  });

  // -------------------------------------------------------
  // mint_certificate_v2 (recipient must be a SystemAccount)
  // -------------------------------------------------------
  describe("mint_certificate_v2", () => {
    it("mints a compressed certificate (collection attached)", async () => {
      // MPL Core CPI signer PDA: seeds = ["cpi_signer", coreCollection, BUBBLEGUM_ID] under MPL_CORE_ID

      const tx = await program.methods
        .mintCertificateV2({
          name: "BSc Computer Science — 2025",
          uri: "https://certs/alice.json",
          recipient: student.publicKey,
          attachCollection: true,
        })
        .accounts({
          universityAuthority: uniAuth.publicKey,
          globalConfig: globalPda,
          university: uniPda,
          universityCollection: uniCollectionPda,
          universityTree: uniTreePda,
          merkleTree: merkleTree.publicKey,
          treeConfig: treeConfigPda,
          recipient: student.publicKey, // SystemAccount
          coreCollection: coreCollection.publicKey,
          mplCoreCpiSigner: mplCoreCpiSigner,
          bubblegumProgram: MPL_BUBBLEGUM_PROGRAM_ID,
          compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
          logWrapper: SPL_NOOP_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([uniAuth])
        .rpc();

        console.log(`tx: ${tx}`)

      // No on-program cert PDA was defined in the latest code; we rely on event/leaf existence.
      // (Optional) You can add a CertificateRecord PDA and fetch/validate it here.
    });
  });
});
