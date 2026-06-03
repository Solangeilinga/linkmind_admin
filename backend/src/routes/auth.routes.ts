import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import { protect, AdminRequest } from "../middleware/auth.middleware";
import { User } from "../models";
import logger from "../utils/logger";

const router = Router();

// POST /api/auth/login
router.post(
  "/login",
  [body("email").isEmail().normalizeEmail(), body("password").notEmpty()],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email, isAdmin: true, isActive: true }).lean();

      if (!user || !user.password) {
        logger.warn(`Login failed for ${email}`);
        return res.status(401).json({ error: "Email ou mot de passe incorrect" });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(401).json({ error: "Email ou mot de passe incorrect" });

      const token = jwt.sign(
        { id: user._id, email: user.email, isAdmin: true, adminRole: user.adminRole },
        process.env.JWT_SECRET || "secret",
        { expiresIn: "8h" }
      );

      logger.info(`Admin login: ${email} (${user.adminRole})`);
      res.json({
        token,
        admin: { id: user._id, name: user.name, email: user.email, role: user.adminRole },
      });
    } catch (err) {
      logger.error("Login error: " + err);
      res.status(500).json({ error: "Erreur serveur" });
    }
  }
);

// POST /api/auth/logout
router.post("/logout", protect, (req: AdminRequest, res: Response) => {
  logger.info(`Admin logout: ${req.admin?.email}`);
  res.json({ success: true });
});

// GET /api/auth/me
router.get("/me", protect, (req: AdminRequest, res: Response) => {
  res.json({ admin: req.admin });
});

export default router;
