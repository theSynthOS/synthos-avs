"use strict";
const { Router } = require("express");
const CustomError = require("./utils/validateError");
const CustomResponse = require("./utils/validateResponse");
const oracleService = require("./oracle.service");
const dalService = require("./dal.service");

const router = Router();

router.post("/execute", async (req, res) => {
  console.log("Validating execution request");

  try {
    const { safeTxHash, agentId } = req.body;

    if (!safeTxHash || !agentId) {
      return res
        .status(400)
        .send(
          new CustomError(
            "Missing required parameters: safeTxHash and agentId",
            {}
          )
        );
    }

    // Validate transaction against policy registry
    const validationResult = await dalService.validateTransaction(
      safeTxHash,
      agentId
    );

    // Create execution result
    const executionResult = {
      safeTxHash,
      agentId,
      timestamp: Date.now(),
      status: validationResult.isValid ? "APPROVED" : "DENIED",
      reason: validationResult.reason,
    };

    // Publish result to IPFS
    const resultCid = await dalService.publishJSONToIpfs(executionResult);

    return res.status(200).send(
      new CustomResponse(
        {
          executionResult,
          proofCid: resultCid,
        },
        "Execution validation completed"
      )
    );
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .send(
        new CustomError("Execution validation failed", { error: error.message })
      );
  }
});

module.exports = router;
