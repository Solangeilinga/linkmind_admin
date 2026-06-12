import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import rateLimit from "express-rate-limit";
import { protect, AdminRequest } from "../middleware/auth.middleware";
import { User } from "../models";
import logger from "../utils/logger";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de tentatives de connexion. Réessayez dans 15 minutes." },
});

// POST /api/auth/login
router.post(
  "/login",
  loginLimiter,
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

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        logger.error("JWT_SECRET is not set");
        return res.status(500).json({ error: "Configuration serveur manquante" });
      }

      const token = jwt.sign(
        { id: user._id, email: user.email, isAdmin: true, adminRole: user.adminRole },
        secret,
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

// PATCH /api/auth/profile — mettre à jour son nom
router.patch(
  "/profile",
  protect,
  [body("name").notEmpty().trim().isLength({ min: 2, max: 60 })],
  async (req: AdminRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const updated = await User.findByIdAndUpdate(
        req.admin?.id,
        { $set: { name: req.body.name } },
        { new: true }
      ).select("-password -fcmToken").lean();
      if (!updated) return res.status(404).json({ error: "Utilisateur introuvable" });
      logger.info(`Profile updated: ${req.admin?.email}`);
      res.json({ admin: { id: updated._id, name: updated.name, email: updated.email, role: updated.adminRole } });
    } catch (err) {
      logger.error("Profile update error: " + err);
      res.status(500).json({ error: "Erreur serveur" });
    }
  }
);

// PATCH /api/auth/password — changer son mot de passe
router.patch(
  "/password",
  protect,
  [
    body("currentPassword").notEmpty(),
    body("newPassword").isLength({ min: 8 }).matches(/[A-Z]/).matches(/[0-9]/),
  ],
  async (req: AdminRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const user = await User.findById(req.admin?.id);
      if (!user || !user.password) return res.status(404).json({ error: "Utilisateur introuvable" });

      const valid = await bcrypt.compare(req.body.currentPassword, user.password);
      if (!valid) return res.status(400).json({ error: "Mot de passe actuel incorrect" });

      user.password = await bcrypt.hash(req.body.newPassword, 12);
      await user.save();
      logger.info(`Password changed: ${req.admin?.email}`);
      res.json({ success: true });
    } catch (err) {
      logger.error("Password change error: " + err);
      res.status(500).json({ error: "Erreur serveur" });
    }
  }
);

export default router;
