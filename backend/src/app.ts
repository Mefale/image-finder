import express from "express";
import cors from "cors";
import { apiRouter } from "./routes";
import { errorHandler } from "./middleware/error.middleware";

export const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use("/api", apiRouter);

app.use(errorHandler);
