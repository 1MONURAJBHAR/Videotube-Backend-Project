import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponce } from "../utils/ApiResponce.js";
import  asyncHandler  from "../utils/asyncHandler.js";


const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }


  const aggregateQuery = Comment.aggregate([
    {
      $match: {  
        video: new mongoose.Types.ObjectId(videoId), 
      },
    },
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
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $unwind:
        "$owner",
    },
    {
      $sort: { createdAt: -1 },
    },
  ]);

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
  };

  const paginatedComments = await Comment.aggregatePaginate(
    aggregateQuery,
    options
  );

  return res
    .status(200)
    .json(
      new ApiResponce(200, paginatedComments, "Comments fetched successfully")
    );
});


const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { content } = req.body;

  if (!content) {
    throw new ApiError(400,"Comment content is required")
  }

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const comment = await Comment.create({  //As defined in user schema
    content,
    video: videoId,
    owner: req.user._id
  });
    
  return res
    .status(201)
    .json(new ApiResponce(201, comment, "comment added successfully"));
  
    
});


const updateComment = asyncHandler(async (req, res) => {
 
  const { commentId } = req.params;
  const { content } = req.body;

  if (!content) {
    throw new ApiError(400, "Comment content is required");
  }
  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }

  const comment = await Comment.findOneAndUpdate(
    { _id: commentId, owner: req.user?._id }, //only user can update
    { content },
    { new: true }
  );

  if (!comment) {
    throw new ApiError(404, "Comment not found or you are not the owner");
  }

  return res
    .status(200)
    .json(new ApiResponce(200, comment, "Comment updated successfully"));
});


const deleteComment = asyncHandler(async (req, res) => {
 
  const { commentId } = req.params;
  
  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }
  
  const comment = await Comment.findOneAndDelete({
 
    _id: commentId,
    owner: req.user?._id,
  });

  if (!comment) {    
    throw new ApiError(404,"Comment not found or you are not the owner")
  }

  return res   
    .status(200)
    .json(new ApiResponce(200, comment, "Comment deleted successfully"))
  

});

export { getVideoComments, addComment, updateComment, deleteComment };


