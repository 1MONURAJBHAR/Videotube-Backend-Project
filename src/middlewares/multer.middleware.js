import multer from "multer"

const storage = multer.diskStorage({
    destination: function (req, file, cb) {  //cb --> callback function, In express req.body can hold/warp/configure only json data not file,thats why we use multer.
                                             //multer gives us the fuctionality to upload files, express does not have that capability.
    cb(null, "./public/image"); // folder to save files
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname); // custom filename
  },
});

export const upload = multer({ storage: storage });
 