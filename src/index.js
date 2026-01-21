//The key thing is: dotenv must be loaded before you access process.env. Using import "dotenv/config"; at the very top ensures that.

import dotenv from "dotenv";  //old classic method must explicitly call dotenv.config(),Only after calling config() are your environment variables available via process.env.//Explicit control over .env file path,Can call it multiple times if needed.
import "dotenv/config"; //Its explanation is written down, use only one methd here currently i am using both one at a time,becoz there is problem in configuering the .env variables from root directory.

import connectDB from "./db/index.js"; 
import { app } from "./app.js";


dotenv.config({   //it will inject variable from this path of .env
  //path: './.env' → means you are telling dotenv to look for a file literally named .env ,. // loads .env file into process.env
  path: "./.env",
});

/**dotenv.config()-->It’s a function from the dotenv package.
Its job: read your .env file and load the variables into process.env. */


 
connectDB()  //since it is async method it will return a promise, so handle with .then()&.catch()
    .then(() => {
      //promise will either be resolve or will be reject

      app.on("error", (error) => {
        console.log(" Server level error: ", error);
        throw error;
      });

      app.listen(process.env.PORT || 8000, () => {
        //Now the server will listen to the database via port 8000 || process.env.PORT
        console.log(` Server is running at port : ${process.env.PORT}`);
      });
    })  
    .catch((err) => {
      //.then if promise resolve & .catch if promise reject, i.e resolve hota hai toh .then() handle karega, & reject hota hai toh .catch() handel karega.
        console.log("MongoDB connection Failed !!! ", err);
    })  






    