import asyncHandler from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js"
import { ApiResponce } from "../utils/ApiResponce.js"
import { Subscription } from "../models/subscription.model.js";
import mongoose from "mongoose"
import jwt from "jsonwebtoken"

const registerUser = asyncHandler(async (req, res) => {

  const { fullName, email, username, password } = req.body; //We get user data when it comes from body, if it comes from url use req.params
  // console.log("email ", email);
 // console.log("This is req.body object", req.body);

  if (
    [fullName, email, username, password].some((field) => field?.trim() === "") //it will check that each field is there
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    //It will find inside the DB either username or either email.
    $or: [{ username }, { email }], //findOne & findById are the database calls i.e : find inside the database
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }

  const avatarLocalPath = req.files?.avatar?.[0]?.path; //Jo file user ne upload kari hain vo file temporarily server ke uper hoti hai kisi folder me, toh unka path nikal rahe hain yaha per ,cloudinary me un file ko upload kerne ke liye
  const coverImageLocalPath = req.files?.coverimage?.[0]?.path; //middleware file ko dest pe upload kerdeta hai with unique file name, uske baad vo ek object deta hai jisme  array fields hote (ex: {avatar:[{},{},{}.....{}], coverimage:[{},{}.....{}]<--object files inside array field -->coverimage}) hain aur un array field ke andar bahut saare files ke object hote hain.

  //  req.files hame ek object-->{} deta hai, jisme saari info hoti hai including path usi ki ko access kar re hain
  //console.log("This is req.files object ", req.files); //check it by debugging it on terminal
  //console.log("This is req.files?.avatar?.[0] object ", req.files?.avatar?.[0]); //check it by debugging it on terminal, //req.files ke andar avatar field array ke andar jo 0th index pe file object hai vo log karo

  //another method
  /*let coverImageLocalPath;   //similarly we can do for avatarLocalPath also 
  if (req.files && Array.isArray(req.files.coverimage) && req.files.coverimage.length > 0) {
    coverImageLocalPath = req.files.coverimage[0].path;
  }*/


  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverimage = await uploadOnCloudinary(coverImageLocalPath);

  /*console.log("Avatar path", avatar);  //For only debugging purpose
  console.log("coverimage", coverimage);*/

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required now");
  }

  const user = await User.create({
    //"User" directly interacts with the database & creates this object in the database
    fullName, // & store it in variable named user
    avatar: avatar.url,
    coverimage: coverimage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    //find the user with his id from the database, here "User" directly interacts with the database
    "-password "
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res.status(201).json(
    new ApiResponce(
      200, //statuscode
      createdUser, //Data
      "user registered successfully" //message
    )
  );
})


const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false }); //Save the document to MongoDB, but skip running Mongoose validators before saving. Directly pushes the document to MongoDB. see below for more info

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500,"Something went wrong while generating access and refresh token")
  }
}



const loginUser = asyncHandler(async (req, res) => {
  //fetch data from req.body
  //find username or email
  //find the user
  //Password check
  //access and refresh token
  //send cookie

  const { email, username, password } = req.body;

  if (!username && !email) {
    //or (!(username || email)) this is also correct
    throw new ApiError(400, "username or email is required");
  }

  const user = await User.findOne({    /**User.findOne() is an asynchronous mongoose function.It returns a Promise, not the actual user document.Hence must use "await"*/
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  //Here "User"-->it is object of mongoose from mongodb so using this we can access only methods given by mongoose like findById(),findOne() & etc..
  //"user"--> it is our user which we have taken from the database, using this we can access the custom methods like isPasswordcorrect(),generateAccessToken(),generateRefreshToken()
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponce(
        200,
        {
          //we are resending this acctkn & rfshtkn becs if user wants to save these tokens in their local storage then they can do it, and also in mobile apps no cookies are stored so this is important.
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged In successfully"
      )
    );
})

 

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id, //This req.user will come from verifyJWT midleware
    {
      $unset: { refreshToken: 1 },   //This removes the field from document
    },
    {
      new: true, //{ new: true } → Makes sure you get back the updated document instead of the old one.
    }
  );


  const options = {
    httpOnly: true,
    secure: true,
  };


  return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponce(200, {}, "User logged Out Successfully"))
  
})



const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized Request");
  }

  try {
    const decodeToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
  
    const user = await User.findById(decodeToken?._id);
  
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }
  
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }
  
    const options = {
      httpOnly: true,
      secure: true,
    };
  
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user._id
    );
  
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponce(
          200,
          { accessToken, refreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token")
  }

  /**user is a Mongoose document (an object representing a MongoDB document).
    refreshToken: newRefreshToken--> This line updates the refreshToken field in memory.
    refreshToken is usually long-lived, used only to generate a new short-lived access token when it expires.
    If you just assign it but don’t call save(), it won’t persist in MongoDB.
    Always ensure your schema defines it:refreshToken: { type: String, default: null }
 */
})


const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body
  
  //if we provide confirm password field then write this code also
  // if(!(newPassword === confPassword)){
  //   throw new ApiError(401,"new password and confirm password must be same")
  // } 


  const user = await User.findById(req.user?._id)
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

  if (!isPasswordCorrect) {
    throw new ApiError(400,"Invalid old password")
  }

  user.password = newPassword
  await user.save({ validateBeforeSave: false })
  
  return res
    .status(200)
    .json(new ApiResponce(200, {}, "Password changed successfully"))
  
})


const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponce(200, req.user, "current user fetched successfully"));
  
})

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body
  
  if (!fullName || !email) {
    throw new ApiError(400,"All fields are required")
  }
  
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName: fullName, //or fullName only
        email: email     //or email only
      }
    },
    {
      new:true
    }
  ).select("-password")


  return res
    .status(200)
    .json(new ApiResponce(200, user, "Account details updated succcessfully"))
  

})

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path; //This is only "file" not "files" since we are updating only one file

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading avatar");
  }

  /*const user = await User.findById(req.user._id).select("-password ")

  user.avatar = avatar.url
  await user.save({ validateBeforeSave: false})*/
  /****************OR************************** */
  /*const user = await User.findByIdAndUpdate( 
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");*/

  // Find the user first to get old avatar
  const user = await User.findById(req.user?._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Delete old avatar if it exists
  if (user.avatar) {
    await deleteFromCloudinary(user.avatar);
  }

  //  Update with new avatar
  user.avatar = avatar.url;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponce(200, req.user, "Avatar Updated successfully")); //use "req.user"-->coming from verifyJWT(automatically excludes refreshToken and password) not "user"--> coming from DB(cantain all whole document information)
})


const updateUserCoverimage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "cover image file is missing");
  }

  const coverimage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverimage.url) {
    throw new ApiError(400, "Error while uploading avatar");
  }

  /*const user = await User.findById(req.user._id).select("-password ")

  user.coverimage = coverimage.url
  await user.save({ validateBeforeSave: false})*/
  /***************OR************************* */
  /*const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverimage: coverimage.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");*/

  // Find the user first to get old avatar
  const user = await User.findById(req.user?._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Delete old avatar if it exists
  if (user.coverimage) {
    await deleteFromCloudinary(user.coverimage);
  }

  // Update with new avatar
  user.coverimage = coverimage.url;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponce(200, req.user, "Cover image Updated successfully"));  //use "req.user"-->coming from verifyJWT(automatically excludes refreshToken and password) not "user"--> coming from DB(cantain all whole document information)
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params
  
  if (!username?.trim()) {
    throw new ApiError(400,"username is missing")
  }

  const channel = await User.aggregate([
    {
      $match: {
        //This will give me the user document form the mongodb as my username matches.
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        //channel ko kitne logo ne subscribe kiya
        from: "Subscription",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers", //subscribers field-->(array of objects) ko add kar do user document me, isme saare subscriptions ke objects jinki channel ki id meri local id se match kar rhi hai, vo hai.
      },
    },
    {
      $lookup: {
        //user ne kitne channel jo subscribe kiya
        from: "Subscription",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo", //subscribedTo field-->(array of objects) ko add kar do user document me, isme saare subscriptions ke objects jinki subcriber ki id meri local id se match kar rhi hai, vo hai.
      },
    },
    {
      $addFields: {
        //add fields to user document
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            //$in ---> ye array and objects dono ke andar dekhta hai
            if: { $in: [req.user?.id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverimage: 1,
        email: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(404,"channel does not exist")
  }

  return res
    .status(200)
    .json(new ApiResponce(200, channel[0], "User channel fetched successfully"))
  

})

const getWatchHistory = asyncHandler(async (req, res) => {
  //console.log(req.user._id); --> for debugging
  
  const user = await User.aggregate([
    {
      $match: {
         _id: req.user._id
       }
    },
    {
      $lookup: {
        from: "videos",
        localField: "WatchHistory",
        foreignField: "_id",
        as: "WatchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar:1
                  }
                }
              ]
            }
          },
          {
            $addFields: {
              owner: {
                $first: "$owner" 
                       //or
                //$arrayElemAt: ["owner",0]
              }
            }
          }
        ]
      }
    }
  ])


  return res
    .status(200)
    .json(new ApiResponce(
      200,
      user[0].watchHistory,
      "Watch History fetched successfully"
  ))
})


export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverimage,
  getUserChannelProfile,
  getWatchHistory,
};
  
