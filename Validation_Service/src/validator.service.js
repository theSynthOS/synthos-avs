require("dotenv").config();
const { ethers } = require("ethers");
const dalService = require("./dal.service");

// ABI for Policy Registry and Attestation contracts
const POLICY_REGISTRY_ABI = [
  "function validateTransaction(bytes32 safeTxHash, uint256 agentId) view returns (bool isValid, string memory reason)",
  "function getAgentPolicies(uint256 agentId) view returns (uint256[] memory policyIds)",
];

const ATTESTATION_CENTER_ABI = [
  "function generateAttestation(bytes32 executionHash, bytes32 validationHash, address agent) returns (bytes32 attestationId)",
  "function verifyAttestation(bytes32 attestationId) view returns (bool isValid)",
];

let policyRegistry;
let attestationCenter;
let wallet;

function init() {
  const provider = new ethers.JsonRpcProvider(
    process.env.OTHENTIC_CLIENT_RPC_ADDRESS
  );
  wallet = new ethers.Wallet(process.env.PRIVATE_KEY_VALIDATOR, provider);

  policyRegistry = new ethers.Contract(
    process.env.POLICY_REGISTRY_ADDRESS,
    POLICY_REGISTRY_ABI,
    wallet
  );

  attestationCenter = new ethers.Contract(
    process.env.ATTESTATION_CENTER_ADDRESS,
    ATTESTATION_CENTER_ABI,
    wallet
  );
}

async function validateExecution(proofCid, safeTxHash, agentId) {
  try {
    // Fetch execution result from IPFS
    const executionResult = await dalService.fetchFromIpfs(proofCid);

    // Verify parameters match
    if (
      executionResult.safeTxHash !== safeTxHash ||
      executionResult.agentId !== agentId
    ) {
      throw new Error(
        "Execution result parameters do not match provided values"
      );
    }

    // Re-run policy validation
    const [isValid, reason] = await policyRegistry.validateTransaction(
      safeTxHash,
      agentId
    );

    const validationResult = {
      isValid,
      reason,
      timestamp: Date.now(),
    };

    // Compare results
    const resultsMatch =
      executionResult.status === (isValid ? "APPROVED" : "DENIED");
    if (!resultsMatch) {
      throw new Error("Validation results do not match execution results");
    }

    // Generate attestation
    const attestation = await generateAttestation(
      proofCid,
      executionResult,
      validationResult
    );

    return {
      attestation,
      validationResult,
    };
  } catch (error) {
    console.error("Validation failed:", error);
    throw error;
  }
}

async function generateAttestation(
  proofCid,
  executionResult,
  validationResult
) {
  try {
    // Create hashes for attestation
    const executionHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["string", "bytes32", "uint256", "uint256", "string"],
        [
          proofCid,
          executionResult.safeTxHash,
          executionResult.agentId,
          executionResult.timestamp,
          executionResult.status,
        ]
      )
    );

    const validationHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["bool", "string", "uint256"],
        [
          validationResult.isValid,
          validationResult.reason,
          validationResult.timestamp,
        ]
      )
    );

    // Generate attestation on-chain
    const attestationId = await attestationCenter.generateAttestation(
      executionHash,
      validationHash,
      wallet.address
    );

    // Verify the attestation
    const isValid = await attestationCenter.verifyAttestation(attestationId);
    if (!isValid) {
      throw new Error("Generated attestation verification failed");
    }

    return {
      attestationId,
      executionHash,
      validationHash,
      validator: wallet.address,
      timestamp: Date.now(),
      proofCid,
      executionResult,
      validationResult,
    };
  } catch (error) {
    console.error("Attestation generation failed:", error);
    throw error;
  }
}

module.exports = {
  init,
  validateExecution,
};
