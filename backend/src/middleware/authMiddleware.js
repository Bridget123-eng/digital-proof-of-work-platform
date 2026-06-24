import jwt from "jsonwebtoken";
import User from "../models/user.js";

const protect = async (req, res, next) => {

  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {

    try {

      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );

      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user || req.user.status === "suspended") {
        return res.status(401).json({
          message: "Account is not allowed to perform this action",
        });
      }

      next();

    } catch (error) {
      res.status(401).json({
        message: "Not authorized",
      });
    }

  } else {
    res.status(401).json({
      message: "No token",
    });
  }
};

export const authorize = (...roles) => (req, res, next) => {
  const requestedRoles = new Set(roles);

  if (requestedRoles.has("admin")) {
    requestedRoles.add("administrator");
  }

  if (requestedRoles.has("administrator")) {
    requestedRoles.add("admin");
  }

  if (!req.user || !requestedRoles.has(req.user.role)) {
    return res.status(403).json({
      message: "You do not have permission to perform this action",
    });
  }

  next();
};

export default protect;
