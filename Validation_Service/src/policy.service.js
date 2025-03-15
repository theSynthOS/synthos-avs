require("dotenv").config();
const { ethers, JsonRpcProvider } = require("ethers");
const axios = require("axios");

// ABI for Policy Coordinator contract interface
const POLICY_COORDINATOR_ABI = [
  "function validateTransaction(string calldata dockerfileHash, address targetAddress, bytes4 functionSignature, uint256 executionTime) external view returns (bool isValid, string memory reason)",
];

// ABI for Agent Registry contract interface
const AGENT_REGISTRY_ABI = [
  "function getAgentHashById(uint256 agentId) view returns (string memory)",
];

const TASK_REGISTRY_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "bytes32", name: "uuid", type: "bytes32" },
      { indexed: true, internalType: "address", name: "from", type: "address" },
      { indexed: true, internalType: "address", name: "to", type: "address" },
    ],
    name: "TaskRegistered",
    type: "event",
  },
  {
    inputs: [{ internalType: "bytes32", name: "uuid", type: "bytes32" }],
    name: "getTask",
    outputs: [
      {
        components: [
          { internalType: "address", name: "from", type: "address" },
          { internalType: "address", name: "to", type: "address" },
          { internalType: "bytes", name: "callData", type: "bytes" },
          { internalType: "uint256", name: "timestamp", type: "uint256" },
        ],
        internalType: "struct TaskRegistry.Task",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "uuid", type: "bytes32" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "bytes", name: "callData", type: "bytes" },
    ],
    name: "registerTask",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    name: "tasks",
    outputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "bytes", name: "callData", type: "bytes" },
      { internalType: "uint256", name: "timestamp", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
];

let policyCoordinatorChainRpcUrl = "";
let policyCoordinatorAddress = "";
let agentRegistryAddress = "";
let taskRegistryAddress = "";

function init() {
  policyCoordinatorChainRpcUrl = process.env.POLICY_COORDINATOR_CHAIN_RPC_URL;
  policyCoordinatorAddress = process.env.POLICY_COORDINATOR_ADDRESS;
  agentRegistryAddress = process.env.AGENT_REGISTRY_ADDRESS;
  taskRegistryAddress = process.env.TASK_REGISTRY_ADDRESS;
}

async function getTxDetails(txUUID) {
  try {
    const provider = new JsonRpcProvider(policyCoordinatorChainRpcUrl);

    const taskRegistry = new ethers.Contract(
      taskRegistryAddress,
      TASK_REGISTRY_ABI,
      provider
    );

    const task = await taskRegistry.getTask(txUUIDBytes);

    if (task.timestamp === 0n) {
      throw new Error("Task does not exist");
    }

    // Extract key details
    return {
      to: task.to,
      data: task.callData,
      executionTime: task.timestamp,
      functionSignature:
        task.callData && task.callData.length >= 10
          ? task.callData.substring(0, 10)
          : "0x00000000",
    };
  } catch (error) {
    console.error("Error fetching Task details:", error);
    if (error.response) {
      console.error("API response error:", error.response.data);
    }
    throw new Error(`Failed to fetch transaction details: ${error.message}`);
  }
}

async function validateTransaction(txUUID, agentId) {
  try {
    // 1. Get transaction details from Task Registry
    const txDetails = await getTxDetails(txUUID);

    // 2. Connect to policy coordinator
    const provider = new JsonRpcProvider(policyCoordinatorChainRpcUrl);
    const policyCoordinator = new ethers.Contract(
      policyCoordinatorAddress,
      POLICY_COORDINATOR_ABI,
      provider
    );

    // 3. Connect to agent registry
    const agentRegistry = new ethers.Contract(
      agentRegistryAddress,
      AGENT_REGISTRY_ABI,
      provider
    );

    // 4. Get the agent hash from the agent registry
    const agentHash = await agentRegistry.getAgentHashById(agentId);

    // 5. Call the policy coordinator with all the required details
    const [isValid, reason] = await policyCoordinator.validateTransaction(
      agentHash,
      txDetails.to, // Target address (Resources)
      txDetails.functionSignature, // Function signature (How)
      txDetails.executionTime // Execution time (When)
    );

    // 6. Format the data according to CrosschainSender's expected format
    const abiCoder = new ethers.AbiCoder();
    const encodedData = abiCoder.encode(
      ["bytes32", "uint256", "uint256", "string", "string"],
      [
        txUUID, // bytes32 txUUID
        BigInt(agentId), // uint256 agentId
        BigInt(Date.now()), // uint256 timestamp
        isValid ? "APPROVED" : "REJECTED", // string status
        reason, // string reason
      ]
    );

    return {
      data: encodedData,
      proofOfTask: agentHash,
      taskDefinitionId: 0,
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
  getTxDetails, // Export this for testing or other use cases
};
