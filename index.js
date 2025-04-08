import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import connectDB from "./database/db.js";
import userRoute from "./routes/user.route.js";
import courseRoute from "./routes/course.route.js";
import mediaRoute from "./routes/media.route.js";
import purchaseRoutes from "./routes/purchaseCourse.route.js";
import courseProgressRoute from "./routes/courseProgress.route.js";
import { stripeWebhookHandler } from "./controllers/coursePurchase.controller.js";
 // ✅ Import this too if you haven't

dotenv.config();

// connect to DB
connectDB();
const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Stripe raw body middleware must come before any express.json()
app.post("/api/v1/payment/webhook", express.raw({ type: "application/json" }), stripeWebhookHandler);

// ✅ Now add JSON and other middlewares
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: ["http://localhost:5173", "https://lms-client-voqc.vercel.app"],
    credentials: true
}));

// Routes
app.use("/api/v1/media", mediaRoute);
app.use("/api/v1/user", userRoute);
app.use("/api/v1/course", courseRoute);
app.use("/api/v1/purchase", purchaseRoutes);
app.use("/api/v1/progress", courseProgressRoute);

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
