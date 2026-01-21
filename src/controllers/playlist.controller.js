import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponce } from "../utils/ApiResponce.js";
import  asyncHandler from "../utils/asyncHandler.js";

// Create a new playlist
const createPlaylist = asyncHandler(async (req, res) => {

  const { name, description } = req.body;
  
  if (!name || !description) {
    throw new ApiError(400, "Playlist name and description are required");
  }
  
  const playlist = await Playlist.create({
    name,
    description,
    owner: req.user._id,
    video: [],
  });

  return res
    .status(201)
    .json(new ApiResponce(201, playlist, "Playlist created successfully"));

});

// Get all playlists of a user
const getUserPlaylists = asyncHandler(async (req, res) => {

  const { userId } = req.params;
  
  if (!mongoose.isValidObjectId(userId)) {
    throw new ApiError(400, "Inavlid user ID");
  }

  const playlists = await Playlist.find({ owner: userId }).populate("video").populate("owner", "username fullName avatar");

  return res
    .status(200)
    .json(new ApiResponce(200, playlists, "user playlist fetched successfully"));

});

// Get a playlist by ID
const getPlaylistById = asyncHandler(async (req, res) => {

  const { playlistId } = req.params;
  
  if (!mongoose.isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist ID")
    
  }
        
  const playlist = await Playlist.findById(playlistId).populate("video").populate("owner", "fullName username avatar")
  
  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  return res
    .status(200)
    .json(new ApiResponce(200, playlist, "Playlist fetched successfully"));
  

});


// Add a video to playlist
const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (!mongoose.isValidObjectId(playlistId) || !mongoose.isValidObjectId(videoId)) {
    throw new ApiError(200, "Invalid playlist or video ID");
  }
  
  const playlist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $addToSet: { video: videoId } //prevents duplicate
    },
    {
      new: true
    }
  ).populate("video");


  if (!playlist) {
    throw new ApiError(404, "Playlist not found")
  }

  return res
    .status(200)
    .json(new ApiResponce(200, playlist, "Video added to playlist"));

});


// Remove a video from playlist
const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  
  const { playlistId, videoId } = req.params;

  if (
    !mongoose.isValidObjectId(playlistId) ||
    !mongoose.isValidObjectId(videoId)
  ) {
    throw new ApiError(400, "Invalid playlist or video ID");
  }

 
  const playlist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $pull: { video: videoId },
    },
    {
      new: true,
    }
  ).populate("video");

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  return res
    .status(200)
    .json(new ApiResponce(200, playlist, "Video removed from playlist"));
});

// Delete a playlist
const deletePlaylist = asyncHandler(async (req, res) => {
 
  const { playlistId } = req.params;

  if (!mongoose.isValidObjectId(playlistId)) {
    throw new ApiError(404, "Invalid playlist ID");
  }

  const playlist = await Playlist.findByIdAndDelete(playlistId);

  if (!playlist) { //this playlist contains the deleted playlist document
    throw new ApiError(404, "Playlist not found");
  }

  return res.status(200).json(new ApiResponce(200, "Playlist deleted succcessfully"));
  
});

// Update a playlist
const updatePlaylist = asyncHandler(async (req, res) => {
 
  const { playlistId } = req.params;
  const { name, description } = req.body;

  if (!mongoose.isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist ID");
  }

  const playlist = await Playlist.findByIdAndUpdate(
    playlistId,
    { $set: { name, description } },
    { new: true }
  );

  if (!playlist) {
    throw new ApiError(404,"Playlist not found")
  }

  return res
    .status(200)
    .json(new ApiResponce(200, playlist, "Playlist updated successfully"));

});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
