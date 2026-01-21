import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponce } from "../utils/ApiResponce.js";
import  asyncHandler  from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query; //ex: GET /videos?page=2&limit=5&query=funny&sortBy=views&sortType=desc&userId=650a2b3c4d5e

  // get all videos based on query, sort, pagination
  const pipeline = [];

  //search filter
  if (query) {
    //query → search text (default empty).
    pipeline.push({
      $match: {
        //If someone types "funny", it finds videos whose title contains "funny" (case-insensitive).
        title: { $regex: query, $options: "i" }, //case insensitive
      },
    });
  }

  //user filter
  if (userId && isValidObjectId(userId)) {
    //If a userId is given, only fetch that user’s videos.
    pipeline.push({
      $match: { owner: userId },
    });
  }

  //lookup to get owner details(optional)
  pipeline.push({
    //This adds owner details (username & email) from the users collection into each video.
    $lookup: {
      from: "users",
      localField: "owner",
      foreignField: "_id",
      as: "owner",
      pipeline: [{ $project: { username: 1, email: 1 } }],
    },
  });

  pipeline.push({ $unwind: "$owner" }); //$unwind makes sure owner is an object, not an array.

  //sort
  pipeline.push({
    //: If sortBy=views&sortType=desc, results will be sorted by most viewed first.
    $sort: { [sortBy || "createdAt"]: sortType === "asc" ? 1 : -1 },
  });
  /**If sortBy is undefined (user didn’t pass query param), $sort: { undefined: -1 } is invalid.
    You should provide a default sort: */
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
  };

  const videos = await Video.aggregatePaginate(
    Video.aggregate(pipeline),
    options
  );

  /**In MongoDB, aggregation means:
 Taking documents from a collection and processing them step by step to get a transformed result.
It’s like a data pipeline: each stage takes input, does some operation, and passes the output to the next stage.

Why use aggregation?
To filter data ($match)
To group data ($group)
To sort data ($sort)
To join collections ($lookup)
To calculate things like averages, sums, counts
Basically, aggregation is used for reporting, analytics, and transforming data. */

  return res
    .status(200)
    .json(new ApiResponce(200, videos, "Videos fetched successfully"));
});

//upload a video
const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  if (!title || !description) {
    throw new ApiError(400, "Title and description are required");
  }

  if (!req.files || !req.files.videoFile || !req.files.thumbnail) {
    throw new ApiError(400, "Video file and thumbnail are required");
  }
 //console.log(req.files);
 

  //upload to cloudinary
  const videoFile = await uploadOnCloudinary(req.files.videoFile[0].path);
  const thumbnailFile = await uploadOnCloudinary(req.files.thumbnail[0].path);
  //console.log(videoFile)
  if (!videoFile?.url) {
    throw new ApiError(500, "Video upload failed");
  }
  if (!thumbnailFile?.url) {
    throw new ApiError(500, "Thumbnail upload failed");
  }

  const video = await Video.create({
    title,
    description,
    videoFile: videoFile.secure_url,
    thumbnail: thumbnailFile.secure_url,
    owner: req.user._id, // logged-in user
    isPublished: true,
    duration: videoFile.duration,
  });

  return res
    .status(201)
    .json(new ApiResponce(201, video, "Video published successfully"));
  

});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId).populate("owner", "username email");

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  return res
    .status(200)
    .json(new ApiResponce(200, video, "video fetched successfully"));
  

});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const { title, description } = req.body;

  if (!title && !description && !req.file) {
    throw new ApiError(400, "Title and description are required ");
  }


  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  //Only owner can update
  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You cannot update this video");
  }

  //update the video
  video.title = title;
  video.description = description;

  const thumbnailFile = await uploadOnCloudinary(req.file.path);

  if (thumbnailFile.secure_url) {
    video.thumbnail = thumbnailFile.secure_url;
  }

  await video.save()

  return res
    .status(200)
    .json(new ApiResponce(200, video, "Video updated successfully"));
  

});



const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }
 
  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(400, "Video not found");
  }

  //Only owner can delete this video
  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You cannot delete this video");
  }

  const videodeleted = await video.deleteOne();
  if (!videodeleted) {
    throw new ApiError(400,"Video is not deleted")
  }

  return res
    .status(200)
    .json(new ApiResponce(200, videodeleted,"Video deleted successfully"));

});

/**Validate videoId.
Flip the isPublished flag. */
const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Video ID");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(400, "You are not allowed to toggle the publish flag");
  }

  video.ispublished = !video.ispublished;
  console.log(video.ispublished);
  
  await video.save();

  return res
    .status(200)
    .json(new ApiResponce(200, video, `Video ${video.ispublished ? "published" : "unpublished"} successfully`))
  
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
