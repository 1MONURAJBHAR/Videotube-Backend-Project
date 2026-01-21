import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponce } from "../utils/ApiResponce.js";
import  asyncHandler  from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {

  const channelId = req.user._id;
                      
  const totalVideos = await Video.countDocuments({ owner: channelId });

  const videoStats = await Video.aggregate([
    {
      
      $match: { owner: channelId }, 
    },
    {
      $group: {
        _id: null,
        totalViews: { $sum: "$views" }, 
      },
    },
  ]);
 
  const totalViews = videoStats[0]?.totalViews || 0;
 
  const totalSubscribers = await Subscription.countDocuments({ channel: channelId })

  const totalLikes = await Like.countDocuments({
    video: { $in: await Video.find({ owner: channelId }).distinct("_id") },
  })

  return res
    .status(200)
    .json(new ApiResponce(200, { totalVideos, totalViews, totalSubscribers, totalLikes }, "Channel statistics fetched successfully"))
  
});

const getChannelVideos = asyncHandler(async (req, res) => {

  const channelId = req.params.channelId || req.user._id; 

  const videos = await Video.find({ owner: channelId }) 
    .populate("owner", "username avatar") 
    .sort({ createdAt: -1 }); 


  return res
    .status(200)
    .json(new ApiResponce(200, videos, "Channel videos fetched successfully"));
});

export { getChannelStats, getChannelVideos };
