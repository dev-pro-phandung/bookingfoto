const express = require("express");
const router = express.Router();
const photographerController = require("../controllers/photographerController");
const requireAuth = require("../middleware/requireAuth");

router.get("/", photographerController.listPhotographers);
router.get("/me", requireAuth, photographerController.getOwnPhotographerProfile);
router.put("/me", requireAuth, photographerController.updateOwnPhotographerProfile);
router.get("/:id", photographerController.getPhotographer);
router.get("/:id/reviews", photographerController.getPhotographerReviews);
router.post("/:id/reviews", photographerController.createPhotographerReview);

module.exports = router;