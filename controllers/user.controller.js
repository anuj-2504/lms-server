import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { generateToken } from "../utils/generateToken.js";
import { deleteMediaFromCloudinary, uploadMedia } from "../utils/cloudinary.js";

/**
 * @desc    Register new user
 * @route   POST /api/v1/user/register
 * @access  Public
 */
export const register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: "All fields are required." });
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ success: false, message: "User already exists with this email." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: role || "student" // Default to "student" if not provided
        });

        return res.status(201).json({
            success: true,
            message: "Account created successfully.",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error("❌ Error in register:", error);
        return res.status(500).json({ success: false, message: "Failed to register" });
    }
};

/**
 * @desc    Login user & get token
 * @route   POST /api/v1/user/login
 * @access  Public
 */
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, message: "User not found." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Invalid password." });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        return res.status(200).json({
            success: true,
            message: `Welcome back ${user.name}`,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("❌ Error in login:", error);
        return res.status(500).json({ success: false, message: "Login failed" });
    }
};

/**
 * @desc    Logout user
 * @route   POST /api/v1/user/logout
 * @access  Private
 */
export const logout = async (_, res) => {
    try {
        return res.status(200).cookie("token", "", { maxAge: 0 }).json({
            message: "Logged out successfully.",
            success: true
        });
    } catch (error) {
        console.error("❌ Error in logout:", error);
        return res.status(500).json({ success: false, message: "Failed to logout" });
    }
};

/**
 * @desc    Get user profile
 * @route   GET /api/v1/user/profile
 * @access  Private
 */
/**
 * @desc    Get user profile
 * @route   GET /api/v1/user/profile
 * @access  Private
 */
 export const getUserProfile = async (req, res) => {
    console.log("🔍 Received request in /profile");

    const userId = req.user?.id;
    console.log("👤 User ID from req.user.id:", userId);

    if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    try {
        const user = await User.findById(userId)
        .select("-password")
        .populate("enrolledCourses");
      

        if (!user) {
            console.log("❌ User not found in DB");
            return res.status(404).json({ success: false, message: "Profile not found" });
        }

        console.log("✅ Sending user with populated enrolledCourses");
        return res.status(200).json({ success: true, user });
    } catch (error) {
        console.error("❌ Error in getUserProfile:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};


/**
 * @desc    Update user profile
 * @route   PUT /api/v1/user/profile
 * @access  Private
 */
export const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name } = req.body;
        const profilePhoto = req.file;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found", success: false });
        }

        // Delete old profile image if exists
        if (user.photoUrl) {
            const publicId = user.photoUrl.split("/").pop().split(".")[0]; // Extract public ID
            deleteMediaFromCloudinary(publicId);
        }

        // Upload new photo
        const cloudResponse = await uploadMedia(profilePhoto.path);
        const photoUrl = cloudResponse.secure_url;

        const updatedUser = await User.findByIdAndUpdate(userId, { name, photoUrl }, { new: true }).select("-password");

        return res.status(200).json({ success: true, user: updatedUser, message: "Profile updated successfully." });

    } catch (error) {
        console.error("❌ Error in updateProfile:", error);
        return res.status(500).json({ success: false, message: "Failed to update profile" });
    }
};
