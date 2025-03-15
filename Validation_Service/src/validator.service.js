require("dotenv").config();
const { ethers } = require("ethers");
const dalService = require("./dal.service");
const policyService = require("./policy.service");

let policyRegistry;
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
}

async function validate(proofOfTask) {
  try {
    // 1. Fetch the execution result from IPFS
    const executionResult = await dalService.fetchFromIpfs(proofOfTask);

    // 2. Extract the txUUID and agentId from the execution result
    const { txUUID, agentId } = executionResult;

    if (!txUUID || agentId == undefined) {
      return {
        isValid: false,
        reason: "Missing txUUID or agentId in execution result",
      };
    }

    // 3. Run our own validation against the policy registry
    const validationResult = await policyService.validateTransaction(
      txUUID,
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
