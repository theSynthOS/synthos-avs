require("dotenv").config();
const { ethers } = require("ethers");
const dalService = require("./dal.service");
const policyService = require("./policy.service");

// ABI for Policy Coordinator and Agent Registry contracts
const POLICY_COORDINATOR_ABI = [
  "function validateTransaction(bytes32 safeTxHash, uint256 agentId) view returns (bool isValid, string memory reason)",
];

const AGENT_REGISTRY_ABI = [
  "function getAgentHashById(uint256 agentId) view returns (string memory)",
];

let policyCoordinator;
let agentRegistry;
let wallet;

function init() {
  const provider = new ethers.JsonRpcProvider(
    process.env.OTHENTIC_CLIENT_RPC_ADDRESS
  );
  wallet = new ethers.Wallet(process.env.PRIVATE_KEY_VALIDATOR, provider);

  policyCoordinator = new ethers.Contract(
    process.env.POLICY_COORDINATOR_ADDRESS,
    POLICY_COORDINATOR_ABI,
    wallet
  );

  agentRegistry = new ethers.Contract(
    process.env.AGENT_REGISTRY_ADDRESS,
    AGENT_REGISTRY_ABI,
    wallet
  );
}

async function validate(proofOfTask) {
  try {
    // 1. Fetch the execution result from IPFS
    const executionResult = await dalService.fetchFromIpfs(proofOfTask);

    // 2. Extract the safeTxHash and agentId from the execution result
    const { safeTxHash, agentId } = executionResult;

    if (!safeTxHash || !agentId) {
      return {
        isValid: false,
        reason: "Missing safeTxHash or agentId in execution result",
      };
    }

    // 3. Get the agent hash from the agent registry
    const agentHash = await agentRegistry.getAgentHashById(agentId);

    // 4. Run our own validation against the policy coordinator
    const validationResult = await policyCoordinator.validateTransaction(
      safeTxHash,
      agentHash
    );

    console.log("executionResult:", executionResult);
    console.log("validationResult:", validationResult);

    // 4. Compare the execution result with our validation result
    const expectedStatus = validationResult.isValid ? "APPROVED" : "DENIED";

    // Determine if the validation is correct based on the requirements
    // When executing agent denied a transaction:
    //   - If our validator says it should be denied (isValid=false) → validation is correct (isValid=true)
    //   - If our validator says it should be approved (isValid=true) → validation is incorrect (isValid=false)
    // When executing agent approved a transaction:
    //   - If our validator says it should be approved (isValid=true) → validation is correct (isValid=true)
    //   - If our validator says it should be denied (isValid=false) → validation is incorrect (isValid=false)
    const isValid =
      (executionResult.status === "APPROVED" && validationResult.isValid) ||
      (executionResult.status === "DENIED" && !validationResult.isValid);

    console.log("expectedStatus:", expectedStatus);
    console.log("Execution matched validation:", isValid);

    return {
      isValid,
      reason: isValid
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
