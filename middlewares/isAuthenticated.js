import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

const isAuthenticated = async (req, res, next) => {
  try {
    console.log("🔍 Cookies received:", req.cookies);

    const token = req.cookies.token;
    if (!token) {
      console.log("❌ No token found in cookies");
      return res.status(401).json({ message: "Unauthorized: No token provided", success: false });
    }

    console.log("✅ Token received:", token);

    // Verify the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("✅ Decoded token:", decoded);

    if (!decoded || !decoded.id) {
      console.log("❌ Invalid token structure");
      return res.status(401).json({ message: "Unauthorized: Invalid token", success: false });
    }

    // Attach userId for use in controllers like coursePurchase.controller.js
    req.id = decoded.id; // ✅ Essential for course purchase

    // Optionally fetch full user details
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      console.log("❌ No user found with this ID:", decoded.id);
      return res.status(401).json({ message: "Unauthorized: User not found", success: false });
    }

    console.log("✅ Authenticated user:", user);

    req.user = user;
    next();
  } catch (error) {
    console.error("❌ Error in authentication middleware:", error);

    let message = "Internal Server Error";
    if (error.name === "JsonWebTokenError") {
      message = "Unauthorized: Invalid token";
    } else if (error.name === "TokenExpiredError") {
      message = "Unauthorized: Token expired";
    }

    return res.status(401).json({ message, success: false });
  }
};

export default isAuthenticated;
