import { ApiError } from "../utils/ApiError.js";
import { ApiResponce } from "../utils/ApiResponce.js";
import  asyncHandler  from "../utils/asyncHandler.js";

const healthcheck = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponce(200,{ status:"Ok", timestamp: new Date().toISOString() }, "Server is running"))
  
});

export { healthcheck };
