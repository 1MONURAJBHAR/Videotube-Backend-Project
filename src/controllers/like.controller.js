import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponce } from "../utils/ApiResponce.js";
import  asyncHandler  from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";

const toggleVideoLike = asyncHandler(async (req, res) => {

  const { videoId } = req.params;
  const userId = req.user._id;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const existingLike = await Like.findOne({ video: videoId, likedBy: userId });

  if (existingLike) { 
    
    await existingLike.deleteOne(); 
    return res.status(200).json(new ApiResponce(200, "Video Unliked"));
  } else {
    const likeddoc = await Like.create({ video: videoId, likedBy: userId });
    return res.status(200).json(new ApiResponce(200, likeddoc, "Video Liked"));
  }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
 
  const { commentId } = req.params;
  const userId = req.user._id;
  

  if (!mongoose.isValidObjectId(commentId)) { 
    throw new ApiError(400,"Invalid comment ID")
  }
    
  const existingLike = Like.findOne({ comment: commentId, likedBy: userId })
  
  if (existingLike) {
    await existingLike.deleteOne();
    return res.status(200).json(new ApiResponce(200, "Comment Unliked"));
  } else {
    const commentLiked = await Like.create({ comment: commentId, likedBy: userId })
    return res.status(200).json(new ApiResponce(200, commentLiked, "Comment Liked"));
  }

});

const toggleTweetLike = asyncHandler(async (req, res) => {
  
  const { tweetId } = req.params;
  const userId = req.user._id;

  if (!mongoose.isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID");
  }

  const existingLike = await Like.findOne({ tweet: tweetId, likedBy: userId })
  

  if (existingLike) {
    await existingLike.deleteOne();
    return res.status(200).json(new ApiResponce(400,"Tweet Unliked"))
  } else {
    const tweetLiked = await Like.create({ tweet: tweetId, likedBy: userId });
    return res.status(200).json(new ApiResponce(400,tweetLiked ,"Tweet liked"))
  }


});

const getLikedVideos = asyncHandler(async (req, res) => {

  const userId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }


  const likedVideoIds = await Like.find({ likedBy: userId }).distinct("video");

  const videosOnly = await Video.find({ _id: { $in: likedVideoIds } })
    .populate("owner", "username fullName avatar")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(
      new ApiResponce(200, videosOnly, "Liked videos fetched successfully")
    );

});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
