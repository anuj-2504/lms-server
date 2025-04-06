import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import {
    createCheckoutSession,
    getAllPurchasedCourse,
    getCourseDetailWithPurchaseStatus,
    stripeWebhookHandler
  } from "../controllers/coursePurchase.controller.js";
  
  


const router = express.Router();

router.route("/checkout/create-checkout-session").post(isAuthenticated, createCheckoutSession);
router.route("/webhook").post(express.raw({ type: "application/json" }), stripeWebhookHandler);

router.route("/course/:courseId/detail-with-status").get(isAuthenticated, getCourseDetailWithPurchaseStatus);
router.route("/").get(isAuthenticated, getAllPurchasedCourse);

export default router;
