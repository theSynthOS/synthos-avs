require("dotenv").config();
const { ethers } = require("ethers");
const dalService = require("./dal.service");
const policyService = require("./policy.service");

// ABI for Policy Registry and Attestation contracts
const POLICY_REGISTRY_ABI = [
  "function validateTransaction(bytes32 safeTxHash, uint256 agentId) view returns (bool isValid, string memory reason)",
  "function getAgentPolicies(uint256 agentId) view returns (uint256[] memory policyIds)",
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

async function validate(proofOfTask) {
  try {
    // 1. Fetch the execution result from IPFS
    const executionResult = await dalService.fetchFromIpfs(proofOfTask);

    // 2. Extract the safeTxHash and agentId from the execution result
    const { safeTxHash, agentId } = executionResult;

    if (!safeTxHash || agentId == undefined) {
      return {
        isValid: false,
        reason: "Missing safeTxHash or agentId in execution result",
      };
    }

    // 3. Run our own validation against the policy registry
    const validationResult = await policyService.validateTransaction(
      safeTxHash,
      agentId
    );

    // 4. Compare the execution result with our validation result
    const expectedStatus = validationResult.isValid ? "APPROVED" : "DENIED";
    const resultsMatch = executionResult.status === expectedStatus;

    return {
      isValid: resultsMatch,
      reason: resultsMatch
        ? "Execution result matches validator's policy check"
        : "Execution result does not match validator's policy check",
      executionStatus: executionResult.status,
      validatorStatus: expectedStatus,
    };
  } catch (error) {
    console.error("Validation failed:", error);
    return {
      isValid: false,
      reason: `Validation error: ${error.message}`,
    };
  }
}

module.exports = {
  init,
  validate,
};
