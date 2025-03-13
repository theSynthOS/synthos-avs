# Policy-based Transaction Validation AVS

### This repository implements a policy-based transaction validation AVS built on the Othentic Stack.

## Table of Contents

1. [Overview](#overview)
2. [Project Structure](#project-structure)
3. [Architecture](#architecture)
4. [Prerequisites](#prerequisites)
5. [Installation](#installation)
6. [Usage](#usage)

---

## Overview

The Policy-based Transaction Validation AVS is a decentralized framework that enables the validation of blockchain transactions against predefined policies. It leverages the Othentic Stack to provide a secure and transparent validation mechanism.

### Features

- **Safe Transaction Validation:** Validates transactions against customizable policies
- **Policy Registry Integration:** Connects with on-chain policy registry
- **IPFS Proof Storage:** Stores validation results on IPFS
- **Containerised deployment:** Simplifies deployment and scaling
- **Prometheus and Grafana integration:** Enables real-time monitoring and observability

## Project Structure

```mdx
📂 policy-based-transaction-validation-avs
├── 📂 Execution_Service # Implements transaction validation execution - Express JS Backend
│ ├── 📂 config/
│ │ └── app.config.js # Express.js app setup with task controller route
│ ├── 📂 src/
│ │ └── dal.service.js # IPFS data storage and task sending service
│ │ ├── policy.service.js # Safe transaction fetching and policy validation service
│ │ ├── task.controller.js # Express.js router handling `/execute` endpoint for transaction validation
│ │ ├── 📂 utils # Custom response and error handling utilities
│ ├── Dockerfile # Docker configuration for the Execution Service
│ ├── index.js # Node.js server entry point
│ └── package.json # Node.js dependencies and scripts
│
├── 📂 Validation_Service # Implements transaction validation verification - Express JS Backend
│ ├── 📂 config/
│ │ └── app.config.js # Express.js app setup for validation endpoints
│ ├── 📂 src/
│ │ └── dal.service.js # IPFS data retrieval service
│ │ ├── policy.service.js # Policy contract interaction for independent validation
│ │ ├── task.controller.js # Express.js router handling `/validate` endpoint
│ │ ├── validator.service.js # Service that verifies execution results against policy
│ │ ├── 📂 utils # Custom response and error handling utilities
│ ├── Dockerfile # Docker configuration for the Validation Service
│ ├── index.js # Node.js server entry point
│ └── package.json # Node.js dependencies and scripts
│
├── 📂 grafana # Grafana monitoring configuration
├── docker-compose.yml # Docker setup for all services and monitoring
├── .env.example # Environment configuration example with required variables
├── README.md # Project documentation
└── prometheus.yaml # Prometheus configuration for monitoring
```

## Architecture

1. **Policy Creation**: Policy creators define conditions (When, How) for transactions and register them with the Policy Registry contract

2. **Execution Service**:

   - Receives a Safe transaction hash (safeTxHash) and agent ID

   - Uses Safe SDK to fetch transaction details

   - Validates the transaction against policies in the Policy Registry

   - Publishes results to IPFS and returns the CID as proof

3. **Validation Service**:

   - Receives the IPFS CID as proof of task

   - Retrieves the execution result from IPFS

   - Independently validates the same transaction against the Policy Registry

   - Confirms that the execution result matches the validator's own check

4. **Attestation Process**:

   - Attester nodes use the validation result to determine whether to attest to the transaction

   - Valid transactions receive attestations, which can be used by the Safe Multisig

![Diagram](https://github.com/user-attachments/assets/8c60b9c4-e1b1-468b-a8cb-e0a59a604d21)

---
