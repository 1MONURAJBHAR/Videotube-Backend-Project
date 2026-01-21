import { v2 as cloudinary } from "cloudinary"; // ✅ correct

import fs from "fs"


//This configuration is important for uploading files,pdf,images,videos,audios to cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


const uploadOnCloudinary = async (localFilePath) => {
    try {
      if (!localFilePath) return null; //if the file path not found return null
      //upload the file on cloudinary
      const response = await cloudinary.uploader.upload(localFilePath, {
        resource_type: "auto",
      });

      //file has been uploaded successfully
      console.log("file is uploaded on cloudinary ", response.url);
      //console.log("This is response object",response);
      

      // Remove the local file after successful upload
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath); //means delete a file from your local filesystem.
      }

      return response;  //It will return an object which conations a lot of info like size,url,type & etc..
                          //It is returning this response object to the  DB/Frontend
    } catch (error) {
      // Remove local file even if upload fails
      if (fs.existsSync(localFilePath)) {  //Remove the locally saved temporary file as the upload operation got failed
        fs.unlinkSync(localFilePath);
      }

      //console.error("Error uploading file to Cloudinary:", error);
      return null;


      
    }
}



// delete function
const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  try {
    if (!publicId) return null; // if publicId not provided return null

    // delete the file from cloudinary
    const response = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType, // "image", "video", or "raw"
    });

    console.log("file deleted from cloudinary", response);

    return response; // returns an object { result: 'ok' } or { result: 'not found' }
  } catch (error) {
    console.error("Error deleting file from Cloudinary:", error);
    return null;
  }
};











export { uploadOnCloudinary, deleteFromCloudinary };


