import express from "express";
import cors from "cors"
import cookieParser from "cookie-parser";

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

/********************************************************************************************************************************************** */
//Using winston & morgan loggers
//Morgan intercepts every request and logs it using the format we defined.
import logger from "./utils/loggers.js";
import morgan from "morgan";

const morganFormat = ":method :url :status :response-time ms";

app.use(
  morgan(morganFormat, {
    stream: {
      write: (message) => {
        const logObject = {
          method: message.split(" ")[0],
          url: message.split(" ")[1],
          status: message.split(" ")[2],
          responseTime: message.split(" ")[3],
        };
        logger.info(JSON.stringify(logObject));
      },
    },
  })
);
/**This will log the messages to the console and the file app.log.
 *  The morgan package is used to format the log messages and the stream option is used to write the log messages to the console. */
/********************************************************************************************************************************************************* */

//basic configurations
app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({ extended: true, limit: "16kb" }))
app.use(express.static("public"))
app.use(cookieParser())

//routes import
import userRouter from './routes/user.route.js'  //importing router from routes
import healthcheckRouter from "./routes/healthcheck.route.js";
import tweetRouter from "./routes/tweet.routes.js"
import subscriptionRouter from "./routes/subscription.routes.js"
import videoRouter from "./routes/video.routes.js"
import commentRouter from "./routes/comment.routes.js"
import likeRouter from "./routes/like.routes.js"
import playlistRouter from "./routes/playlist.routes.js"
import dashboardRouter from "./routes/dashboard.routes.js"




//routes declaration
app.use("/api/v1/users", userRouter)  ///api/v1/users--> jaise hi ye hit hoga control "userRouter" i.e-->"router"  pe chala jayega
app.use("/api/v1/healthcheck", healthcheckRouter)
app.use("/api/v1/tweet", tweetRouter)
app.use("/api/v1/subscription", subscriptionRouter)
app.use("/api/v1/video", videoRouter)
app.use("/api/v1/comment", commentRouter)
app.use("/api/v1/like", likeRouter)
app.use("/api/v1/playlist", playlistRouter)
app.use("/api/v1/dashboard", dashboardRouter)


//http://localhost:8000/api/v1/users/register


export { app }








/**app.use(cookieParser())
is used in an Express.js app to enable parsing cookies from incoming HTTP requests.

Breakdown:
cookie-parser → a middleware that reads cookies from the request headers.
Without it, if a request comes with cookies (in the Cookie header), you’d have to manually parse the string.
With it, Express automatically makes cookies available as a neat object on req.cookies.
*/