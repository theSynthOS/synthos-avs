"use strict";
const { Router } = require("express");
const CustomError = require("./utils/validateError");
const CustomResponse = require("./utils/validateResponse");
const validatorService = require("./validator.service");
const dalService = require("./dal.service");

const router = Router();

router.post("/validate", async (req, res) => {
  console.log("Validating execution result");

  try {
    const { proofCid, safeTxHash, agentId } = req.body;

    if (!proofCid || !safeTxHash || !agentId) {
      return res
        .status(400)
        .send(
          new CustomError(
            "Missing required parameters: proofCid, safeTxHash, and agentId",
            {}
          )
        );
    }

    // Validate execution and generate attestation
    const { attestation, validationResult } =
      await validatorService.validateExecution(proofCid, safeTxHash, agentId);

    // Store attestation on IPFS
    const attestationCid = await dalService.publishJSONToIpfs(attestation);

    return res.status(200).send(
      new CustomResponse(
        {
          attestation,
          attestationCid,
          validationResult,
        },
        "Validation completed and attestation generated"
      )
    );
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .send(new CustomError("Validation failed", { error: error.message }));
  }
});

module.exports = router;
