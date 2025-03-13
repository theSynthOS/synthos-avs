require("dotenv").config();
const { ethers } = require("ethers");
const Safe = require("@safe-global/safe-core-sdk").default;
const EthersAdapter = require("@safe-global/safe-ethers-lib").default;
const SafeServiceClient = require("@safe-global/safe-service-client").default;

// ABI for Policy Registry contract interface
const POLICY_REGISTRY_ABI = [
  "function validateTransaction(bytes32 safeTxHash, uint256 agentId, address targetAddress, bytes4 functionSignature, uint256 executionTime) view returns (bool isValid, string memory reason)",
  "function getAgentPolicies(uint256 agentId) view returns (uint256[] memory policyIds)",
];

let policyRegistryChainRpcUrl = "";
let policyRegistryAddress = "";
let safeServiceUrl = "";

function init() {
  policyRegistryChainRpcUrl = process.env.POLICY_REGISTRY_CHAIN_RPC_URL;
  policyRegistryAddress = process.env.POLICY_REGISTRY_ADDRESS;
  safeServiceUrl =
    process.env.SAFE_SERVICE_URL ||
    "https://safe-transaction-goerli.safe.global";
}

async function getSafeTransactionDetails(safeTxHash) {
  try {
    // Initialize provider and adapter
    const provider = new ethers.JsonRpcProvider(policyRegistryChainRpcUrl);
    const ethAdapter = new EthersAdapter({
      ethers,
      signerOrProvider: provider,
    });

    // Initialize Safe Service Client
    const safeService = new SafeServiceClient({
      txServiceUrl: safeServiceUrl,
      ethAdapter,
    });

    // Get transaction details from the service
    const safeTransaction = await safeService.getTransaction(safeTxHash);

    // Extract key details
    return {
      to: safeTransaction.to,
      data: safeTransaction.data,
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
        safeTransaction.data.length >= 10
          ? safeTransaction.data.substring(0, 10)
          : "0x00000000",
    };
  } catch (error) {
    console.error("Error fetching Safe transaction details:", error);
    throw new Error(`Failed to fetch transaction details: ${error.message}`);
  }
}

async function validateTransaction(safeTxHash, agentId) {
  try {
    // 1. Get transaction details from Safe
    const txDetails = await getSafeTransactionDetails(safeTxHash);

    // 2. Connect to policy registry
    const provider = new ethers.JsonRpcProvider(policyRegistryChainRpcUrl);
    const policyRegistry = new ethers.Contract(
      policyRegistryAddress,
      POLICY_REGISTRY_ABI,
      provider
    );

    // 3. Call the policy registry with all the required details
    const [isValid, reason] = await policyRegistry.validateTransaction(
      safeTxHash,
      agentId,
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
