import express from "express";
import cors from "cors";
import { healthRouter } from "./routes/healthRoutes.js";
import { galleryRouter } from "./routes/galleryRoutes.js";
import { uploadRouter } from "./routes/uploadRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(healthRouter);
app.use(galleryRouter);
app.use(uploadRouter);

export { app };
