import express from "express";
import cors from "cors";
import { apiRouter } from "./routes";
import { errorHandler } from "./middleware/error.middleware";

export const app = express();

const allowedOrigins = ["http://localhost:5173", process.env.FRONTEND_URL].filter(Boolean) as string[];
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "2mb" }));
app.use("/api", apiRouter);

app.use(errorHandler);
