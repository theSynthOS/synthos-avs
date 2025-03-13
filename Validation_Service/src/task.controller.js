"use strict";
const { Router } = require("express");
const CustomError = require("./utils/validateError");
const CustomResponse = require("./utils/validateResponse");
const validatorService = require("./validator.service");

const router = Router();

router.post("/validate", async (req, res) => {
  var proofOfTask = req.body.proofOfTask;
  console.log(`Validate task: proof of task: ${proofOfTask}`);

  if (!proofOfTask) {
    return res
      .status(400)
      .send(new CustomError("Missing required parameter: proofOfTask", {}));
  }

  try {
    const result = await validatorService.validate(proofOfTask);
    console.log(
      "Validation result:",
      result.isValid ? "Approved" : "Not Approved"
    );
    return res.status(200).send(new CustomResponse(result.isValid));
  } catch (error) {
    console.log(error);
    return res.status(500).send(new CustomError("Something went wrong", {}));
  }
});

module.exports = router;
