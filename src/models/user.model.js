import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken"  //jwt is a bearer token
import bcrypt from "bcrypt"

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String, //cloudinary url will be used here
      required: true,
    },
    coverimage: {
      type: String, //cloudinary url will be used here
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    refreshToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();  //if not modified move ahead
                                                    //if modified encrypt it

  this.password = await bcrypt.hash(this.password, 10)
  next()
})

userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};



userSchema.methods.generateAccessToken = function () {
  return jwt.sign(    
    {  //This is payload
      _id: this._id,     
      email: this.email,  
      username: this.username,
      fullName:this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
       expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    }
  )
}



userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(    //.sign method will create a token
    {  //This is payload
      _id: this._id,     //Here we are accessing all this info from the database (like:_id,username,email,etc..)
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
       expiresIn: process.env.REFRESH_TOKEN_EXPIRY
    }
  )
}


export const User = mongoose.model("User", userSchema); 



/**  format: xxxxx.yyyyy.zzzzz
 * Header – Algorithm & token type (e.g., { "alg": "HS256", "typ": "JWT" }) forms first part of the token: xxxxx.
Payload – Contains the actual data you want to transmit (claims)., e.g. { "userId": 123, "role": "admin" }  forms second part: yyyyy.
Signature – Ensures the token hasn’t been tampered with i.e: We want to make sure that the token received from the client is the same token we originally issued, and no one has modified it in between.
          

Take Header (base64) + Payload (base64) → join with a dot.
Sign it using a secret key and the algorithm from the header.
The result is the Signature (third part of JWT, zzzzz).*/
