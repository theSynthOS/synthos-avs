require("dotenv").config();
const { ethers, JsonRpcProvider } = require("ethers");
const axios = require("axios");

// ABI for Policy Registry contract interface
const POLICY_COORDINATOR_ABI = [
  "function validateTransaction(string calldata dockerfileHash, address targetAddress, bytes4 functionSignature, uint256 executionTime) external view returns (bool isValid, string memory reason)",
];

// ABI for Agent Registry contract interface
const AGENT_REGISTRY_ABI = [
  "function getAgentHashById(uint256 agentId) view returns (string memory)",
];

let policyCoordinatorChainRpcUrl = "";
let policyCoordinatorAddress = "";
let agentRegistryAddress = "";
let safeServiceUrl = "";

function init() {
  policyCoordinatorChainRpcUrl = process.env.POLICY_COORDINATOR_CHAIN_RPC_URL;
  policyCoordinatorAddress = process.env.POLICY_COORDINATOR_ADDRESS;
  agentRegistryAddress = process.env.AGENT_REGISTRY_ADDRESS;
  safeServiceUrl =
    process.env.SAFE_SERVICE_URL ||
    "https://safe-transaction-goerli.safe.global";
}

async function getSafeTransactionDetails(safeTxHash) {
  try {
    // Make direct API call to the Safe Transaction Service using the correct endpoint
    const response = await axios.get(
      `${safeServiceUrl}/api/v2/multisig-transactions/${safeTxHash}/`
    );
    const safeTransaction = response.data;

    console.log("Transaction data received:", safeTransaction);

    // Extract key details
    return {
      to: safeTransaction.to,
      data: safeTransaction.data || "0x",
      value: safeTransaction.value,
      operation: safeTransaction.operation,
      safeTxGas: safeTransaction.safeTxGas,
      baseGas: safeTransaction.baseGas,
      gasPrice: safeTransaction.gasPrice,
      gasToken: safeTransaction.gasToken,
      refundReceiver: safeTransaction.refundReceiver,
      nonce: safeTransaction.nonce,
      executionTime: Date.now(), // Current time as execution time
      // Extract function signature (first 4 bytes of data)
      functionSignature:
        safeTransaction.data && safeTransaction.data.length >= 10
          ? safeTransaction.data.substring(0, 10)
          : "0x00000000",
    };
  } catch (error) {
    console.error("Error fetching Safe transaction details:", error);
    if (error.response) {
      console.error("API response error:", error.response.data);
    }
    throw new Error(`Failed to fetch transaction details: ${error.message}`);
  }
}

async function validateTransaction(safeTxHash, agentHash) {
  try {
    // 1. Get transaction details from Safe
    const txDetails = await getSafeTransactionDetails(safeTxHash);

    // 2. Connect to policy coordinator
    const provider = new JsonRpcProvider(policyCoordinatorChainRpcUrl);
    const policyCoordinator = new ethers.Contract(
      policyCoordinatorAddress,
      POLICY_COORDINATOR_ABI,
      provider
    );

    // 3. Call the policy coordinator with all the required details
    const [isValid, reason] = await policyCoordinator.validateTransaction(
      agentHash,
      txDetails.to, // Target address (Resources)
      txDetails.functionSignature, // Function signature (How)
      txDetails.executionTime // Execution time (When)
    );

    return {
      isValid,
      reason,
      timestamp: Date.now(),
      transactionDetails: {
        target: txDetails.to,
        functionSignature: txDetails.functionSignature,
        executionTime: txDetails.executionTime,
      },
    };
  } catch (error) {
    console.error("Error validating transaction:", error);
    throw new Error(`Policy validation failed: ${error.message}`);
  }
}

module.exports = {
  init,
  validateTransaction,
  getSafeTransactionDetails, // Export this for testing or other use cases
};
