import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(
          `${process.env.MONGODB_URI}/${DB_NAME}`
        );
        console.log(`\n MongoDB connected !! DB HOST : ${connectionInstance.connection.host}`); // connectionInstance.connection gives the actual MongoDB connection. , .host tells you the hostname of the MongoDB server your app connected to.
    } catch (error) {
      console.log("MongoDB connection error ", error);
      process.exit(1); //exit from process no.1, read Nodejs Docs for more info || ChatGPT
      //process.exit(1) is a Node.js command used to immediately stop the running process.
    }
}

export default connectDB; 

