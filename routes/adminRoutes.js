const express = require("express");
const adminController = require("../controllers/adminController");
const adminBlogController = require("../controllers/adminBlogController");
const requireAdmin = require("../middleware/requireAdmin");

const router = express.Router();
router.use(requireAdmin);
router.get("/dashboard", adminController.getDashboard);
router.get("/analytics", adminController.getAnalytics);
router.get("/photographers", adminController.listPhotographers);
router.get("/photographers/:id", adminController.getPhotographer);
router.patch("/photographers/:id/status", adminController.updatePhotographerStatus);
router.get("/bookings", adminController.listBookings);
router.get("/blog-categories", adminBlogController.listCategories);
router.get("/blogs", adminBlogController.listPosts);
router.post("/blogs/preview", adminBlogController.previewArticle);
router.post("/blogs", adminBlogController.createPost);
router.put("/blogs/:id", adminBlogController.updatePost);
router.delete("/blogs/:id", adminBlogController.deletePost);

module.exports = router;
