import { Router } from "express";
import { syncGallery } from "../controllers/galleryController.js";

const router = Router();

router.post("/gallery/sync", syncGallery);

export { router as galleryRouter };
