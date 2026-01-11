const jwt = require("jsonwebtoken");
const User = require("../models/User");

const getToken = (req) => {
  // 1️⃣ From cookie (production)
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }

  // 2️⃣ From Authorization header (local/dev)
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    return req.headers.authorization.replace("Bearer ", "");
  }

  return null;
};

const auth = async (req, res, next) => {
  try {
    const token = getToken(req);

    if (!token) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id || decoded.userId).select("-password");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    next();

  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

const adminAuth = async (req, res, next) => {
  try {
    const token = getToken(req);

    if (!token) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id || decoded.userId).select("-password");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    req.user = user;
    next();

  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = {
  protect: auth,
  admin: adminAuth,
  auth,
  adminAuth
};
