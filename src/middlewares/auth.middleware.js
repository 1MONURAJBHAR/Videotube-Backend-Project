import { ApiError } from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js"
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js";


export const verifyJWT = asyncHandler(async (req, _, next) => {   // res -->no use we can replace it with "_"
 try {
     const token =
       req.cookies?.accessToken ||
       req.header("Authorization")?.replace("Bearer ", "");
      //console.log(token);
      
     if (!token) {
       throw new ApiError(401, "Unauthorized request");
     }
   
     const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET); //token ke andar bhi  ACCESS_TOKEN_SECRET key hai aur hum isko bahar se bhi ACCESS_TOKEN_SECRET key de rahe hain ye dono ko match karega if true it decodes it else throw error
   
     const user = await User.findById(decodedToken?._id).select(
       "-password -refreshToken"
     );
   
     if (!user) {
       throw new ApiError(401, "Invalid Access Token");
       }
       
     // Attach user to request
     req.user = user; //it means you are attaching the logged-in user’s data to the request object in Express.
     next();
 } catch (error) {
    throw new ApiError(401, error?.meaasge || "Invalid access token there")
 }
})


































































/**req.user = user; → stores the logged-in user object in the request.
Makes the user available across middlewares & route handlers.
Avoids repeating database queries & token verification multiple times. */


/**Where cookies live
 * 
Cookies are stored in the browser (client-side).
But when the browser makes an HTTP request to your server, it can automatically attach cookies to the request if:
The cookie was set with the same domain and path as the server.
And the cookie’s HttpOnly, Secure, SameSite rules allow it. 


Even though cookies are stored in the browser, the browser attaches them to requests automatically (if configured properly).
That’s why your server can read them from req.cookies.*/

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**PROCESS */

/**How the server sees cookies

When you set a cookie from your server, you usually send it in the response header:

Set-Cookie: accessToken=abcd1234; HttpOnly; Secure; SameSite=None


→ The browser saves it.

Next time the browser makes a request to your server, it automatically sends the cookie in the request headers:

Cookie: accessToken=abcd1234


On the server, using middleware like cookie-parser in Express:

import cookieParser from "cookie-parser";

app.use(cookieParser());


Now you can access it in your route handlers:

console.log(req.cookies.accessToken); // "abcd1234" */































































/**app.use(cookieParser()) explain
ChatGPT said:
Good question 👍
app.use(cookieParser())
is used in an Express.js app to enable parsing cookies from incoming HTTP requests.

🔎 Breakdown:
cookie-parser → a middleware that reads cookies from the request headers.
Without it, if a request comes with cookies (in the Cookie header), you’d have to manually parse the string.
With it, Express automatically makes cookies available as a neat object on req.cookies.
Example without cookie-parser:
HTTP request header:
Cookie: token=abc123; theme=dark


In raw Express, you’d have to parse that string manually.

Example with cookie-parser:
import express from "express";
import cookieParser from "cookie-parser";

const app = express();

// Enable cookie parsing
app.use(cookieParser());

app.get("/", (req, res) => {
  console.log(req.cookies); 
  // 👉 { token: "abc123", theme: "dark" }
  res.send("Cookies parsed!");
});

⚡ Why do we use it?
To read cookies (e.g., session ID, JWT, CSRF token).
To easily access values like req.cookies.token.
Makes authentication & sessions simpler.

✅ With signed cookies
You can also pass a secret:
app.use(cookieParser("mySecret"));
Then cookies signed with "mySecret" are available in req.signedCookies.

⚠️ Important: cookie-parser only reads cookies — it does not set them.
For setting cookies, you use res.cookie("name", "value"). */