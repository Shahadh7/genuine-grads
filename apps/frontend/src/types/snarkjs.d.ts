declare module 'snarkjs' {
  export interface Groth16Proof {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    protocol: string;
    curve: string;
  }

  export interface PublicSignals extends Array<string> {}

  export interface VerificationKey {
    protocol: string;
    curve: string;
    nPublic: number;
    vk_alpha_1: string[];
    vk_beta_2: string[][];
    vk_gamma_2: string[][];
    vk_delta_2: string[][];
    vk_alphabeta_12: string[][][];
    IC: string[][];
  }

  export namespace groth16 {
    function fullProve(
      input: Record<string, bigint | string | number>,
      wasmFile: string | Uint8Array,
      zkeyFile: string | Uint8Array
    ): Promise<{ proof: Groth16Proof; publicSignals: PublicSignals }>;

    function verify(
      verificationKey: VerificationKey,
      publicSignals: PublicSignals,
      proof: Groth16Proof
    ): Promise<boolean>;

    function exportSolidityCallData(
      proof: Groth16Proof,
      publicSignals: PublicSignals
    ): Promise<string>;
  }

  export namespace zKey {
    function exportVerificationKey(zkeyFileName: string): Promise<VerificationKey>;
  }
}
