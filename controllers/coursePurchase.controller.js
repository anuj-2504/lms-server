import Stripe from "stripe";
import { Course } from "../models/course.model.js";
import { CoursePurchase } from "../models/coursePurchase.model.js";
import { Lecture } from "../models/lecture.model.js";
import { User } from "../models/user.model.js";
import mongoose from "mongoose";


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createCheckoutSession = async (req, res) => {
  try {
    const userId = req.id;
    const { courseId } = req.body;

    if (!courseId || typeof courseId !== "string") {
      return res.status(400).json({ success: false, message: "Invalid courseId provided" });
    }

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ success: false, message: "Invalid Course ID format" });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found!" });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: course.courseTitle,
              images: [course.courseThumbnail],
            },
            unit_amount: course.coursePrice * 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `http://localhost:5173/course-progress/${courseId}`,
      cancel_url: `http://localhost:5173/course-detail/${courseId}`,
      metadata: { courseId, userId }, // ✅ Pass userId here
      shipping_address_collection: { allowed_countries: ["IN"] },
    });

    await CoursePurchase.create({
      courseId: course._id,
      userId: req.id,
      paymentId: session.id,
      amount: course.coursePrice,
      status: "pending",
    });

    return res.status(200).json({ success: true, url: session.url });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const stripeWebhookHandler = async (req, res) => {
  try {
    const sig = req.headers["stripe-signature"];
    const secret = process.env.WEBHOOK_ENDPOINT_SECRET;
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, secret);
    } catch (err) {
      console.error("Webhook signature verification failed.", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      try {
        const session = event.data.object;

        const purchase = await CoursePurchase.findOne({
          paymentId: session.id,
        }).populate("courseId");

        if (!purchase) return res.status(404).json({ message: "Purchase not found" });

        // ✅ Recover userId from metadata if missing
        if (!purchase.userId && session.metadata.userId) {
          purchase.userId = session.metadata.userId;
          console.log("✅ Fallback userId from metadata:", purchase.userId);
        }

        purchase.amount = session.amount_total / 100;
        purchase.status = "completed";

        if (purchase.courseId && purchase.courseId.lectures.length > 0) {
          await Lecture.updateMany(
            { _id: { $in: purchase.courseId.lectures } },
            { $set: { isPreviewFree: true } }
          );
        }

        await purchase.save();

        await User.findByIdAndUpdate(
          purchase.userId,
          { $addToSet: { enrolledCourses: purchase.courseId._id } },
          { new: true }
        );

        await Course.findByIdAndUpdate(
          purchase.courseId._id,
          { $addToSet: { enrolledStudents: purchase.userId } },
          { new: true }
        );
      } catch (error) {
        console.error("Error handling webhook event:", error);
        return res.status(500).json({ message: "Internal Server Error" });
      }
    }

    res.status(200).send();
  } catch (error) {
    console.error("Webhook processing error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getCourseDetailWithPurchaseStatus = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.id;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ message: "Invalid courseId format" });
    }

    const course = await Course.findById(courseId).populate("creator lectures");
    const purchased = await CoursePurchase.findOne({ userId, courseId });

    if (!course) return res.status(404).json({ message: "Course not found!" });

    return res.status(200).json({
      course,
      purchased: !!purchased,
    });
  } catch (error) {
    console.error("Error in getCourseDetailWithPurchaseStatus:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getAllPurchasedCourse = async (req, res) => {
  try {
    const userId = req.id;
    console.log("📥 getAllPurchasedCourse called by userId:", userId); // ✅ Add logging
    const purchasedCourse = await CoursePurchase.find({
      userId,
      status: "completed",
    }).populate("courseId");

    console.log("🎓 Purchased courses found:", purchasedCourse); // ✅ Log result

    return res.status(200).json({ purchasedCourse });
  } catch (error) {
    console.error("❌ Error in getAllPurchasedCourse:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};


export const getAllPurchasesAdmin = async (req, res) => {
  try {
    const purchases = await CoursePurchase.find({})
      .populate("userId", "fullName email")
      .populate("courseId", "courseTitle coursePrice");

    res.status(200).json({ success: true, purchases });
  } catch (error) {
    console.error("Error in getAllPurchasesAdmin:", error);
    res.status(500).json({ success: false, message: "Failed to load admin purchases" });
  }
};
