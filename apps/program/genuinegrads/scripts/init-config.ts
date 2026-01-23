import * as anchor from "@coral-xyz/anchor";
import {
  Program,
  AnchorProvider,
} from "@coral-xyz/anchor";
import {
  PublicKey,
  SystemProgram,
  Connection,
  Keypair,
  clusterApiUrl,
} from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import { Genuinegrads } from "../target/types/genuinegrads";

// ------------------- Load Keypair -------------------
function loadKeypair(fromPath?: string): Keypair {
  const resolved =
    fromPath ||
    process.env.KEYPAIR_PATH ||
    path.join(__dirname, "..", "..", "..", "main-deploy-wallet.json");
  if (!fs.existsSync(resolved)) {
    throw new Error(
      `Keypair not found at ${resolved}. Set KEYPAIR_PATH or ensure main-deploy-wallet.json exists`
    );
  }
  const secret = JSON.parse(fs.readFileSync(resolved, "utf-8"));
  return Keypair.fromSecretKey(Buffer.from(secret));
}

(async () => {
  // ------------------- Setup Provider -------------------
  const rpc = process.env.RPC_URL || clusterApiUrl("devnet");
  const connection = new Connection(rpc, "confirmed");
  const superAdmin = loadKeypair(); // renamed from payer/admin
  const provider = new AnchorProvider(connection, new anchor.Wallet(superAdmin), {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
  anchor.setProvider(provider);

  // ------------------- Load IDL + Program -------------------
  const idlPath = path.join(__dirname, "..", "target", "idl", "genuinegrads.json");
  if (!fs.existsSync(idlPath)) {
    throw new Error(`IDL not found at ${idlPath} — run "anchor build" first.`);
  }
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  const program = new Program(idl, provider) as Program<Genuinegrads>;

  console.log("RPC URL         :", rpc);
  console.log("Program ID      :", program.programId.toString());
  console.log("Super Admin     :", superAdmin.publicKey.toString());

  // ------------------- Derive PDA -------------------
  const [globalConfigPda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("global-config"), superAdmin.publicKey.toBuffer()],
    program.programId
  );

  console.log("GlobalConfig PDA:", globalConfigPda.toString());
  console.log("Bump             :", bump);

  // ------------------- Try Fetch Existing -------------------
  try {
    const existing = await program.account.globalConfig.fetch(globalConfigPda);
    console.log("✅ GlobalConfig already exists.");
    console.log("   owner :", (existing as any).owner.toString());
    console.log("   frozen:", (existing as any).frozen);
    console.log("   bump  :", (existing as any).bump);
    return;
  } catch {
    console.log("No existing config found. Proceeding to initialize…");
  }

  // ------------------- Initialize Config -------------------
  try {
    const txSig = await program.methods
      .initializeConfig() // matches Rust instruction name
      .accountsPartial({
        superAdmin: superAdmin.publicKey,
        globalConfig: globalConfigPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([superAdmin])
      .rpc();

    console.log("\n🟩 Initialized GlobalConfig");
    console.log("Transaction Signature:", txSig);

    const cfg = await program.account.globalConfig.fetch(globalConfigPda);
    console.log("\n📋 GlobalConfig Data:");
    console.log("   owner :", (cfg as any).owner.toString());
    console.log("   frozen:", (cfg as any).frozen);
    console.log("   bump  :", (cfg as any).bump);
  } catch (err) {
    console.error("❌ Initialization failed:", err);
    process.exit(1);
  }
})();
