import { Router } from "express"
import {
  loginUser,
  logoutUser,
  registerUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverimage,
  getUserChannelProfile,
  getWatchHistory,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
                                   //api/v1/users/? iske baad jo bhi hum dalenge vo execute ho jayega
router.route("/register").post(   //example:api/v1/users/register -->toh phir control pehle middleware per phir registerUser pe jayega
  upload.fields([ // upload.fields()--> middleware
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverimage",
      maxCount: 1,
    },
  ]),
  registerUser
); //As soon as you hit /register, then register method will get executed/called.


router.route("/login").post(loginUser)

//secured routes -->i.e: user must be loggedin
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-passwrod").post(verifyJWT,changeCurrentPassword)
router.route("/current-user").get(verifyJWT, getCurrentUser)
router.route("/update-account").patch(verifyJWT, updateAccountDetails)
router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar)
router.route("/coverimage").patch(verifyJWT, upload.single("coverimage"), updateUserCoverimage)
router.route("/c/:username").get(verifyJWT, getUserChannelProfile)
router.route("/watchHistory").get(verifyJWT, getWatchHistory)




export default router;


