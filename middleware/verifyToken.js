import { createRemoteJWKSet, jwtVerify } from "jose";

const CLIENT_URL =
  process.env.CLIENT_URL || "http://localhost:3000";

const JWKS = createRemoteJWKSet(
  new URL(`${CLIENT_URL}/api/auth/jwks`)
);

export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication token is required.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const { payload } = await jwtVerify(token, JWKS);

    if (!payload.sub || !payload.email) {
      return res.status(401).json({
        success: false,
        message: "Invalid user token.",
      });
    }

    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name || "",
      image: payload.image || "",
    };

    next();
  } catch (error) {
    console.error("JWT verification failed:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token.",
    });
  }
};