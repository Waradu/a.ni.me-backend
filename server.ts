import express from "express";
import path from "path";
import fs from "fs";

const startTime = Date.now();
const port = parseInt(process.env.PORT || "4000");
const app = express();

declare global {
  namespace Express {
    interface Request {
      rawBody: string;
    }
  }
}

app.use(function (req, res, next) {
  req.rawBody = "";
  req.setEncoding("utf8");

  req.on("data", function (chunk) {
    req.rawBody += chunk;
  });

  req.on("end", function () {
    next();
  });
});

const apiRouter = express.Router();

const routesPath = path.join(__dirname, "routes");
fs.readdirSync(routesPath).forEach((file) => {
  const route = require(path.join(routesPath, file)).default;
  if (typeof route === "function") {
    console.log(`Loading route: ${file}`);
    route(apiRouter);
  }
});

app.use("/api", apiRouter);

app.use((req, res, next) => {
  res.status(500).json({
    error: `'${req.path}' not found`,
  });
});

app.listen(port, (e) => {
  const endTime = Date.now();
  console.log(
    `Server is running at http://localhost:${port} in ${endTime - startTime}ms`
  );
});
