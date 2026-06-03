import { Router, Response } from "express";
import { body, param, query, validationResult } from "express-validator";
import { protect, requireRole, AdminRequest } from "../middleware/auth.middleware";
import { Professional } from "../models";
import logger from "../utils/logger";

const router = Router();
router.use(protect);

const TYPES = ["psychologist", "coach", "doctor"];

// GET /api/professionals
router.get("/", requireRole("admin"), async (req: AdminRequest, res: Response) => {
  try {
    const page   = Number(req.query.page)  || 1;
    const limit  = Number(req.query.limit) || 20;
    const search = req.query.search as string | undefined;
    const filter: any = {};
    if (req.query.verified !== undefined) filter.isVerified = req.query.verified === "true";
    if (req.query.active   !== undefined) filter.isActive   = req.query.active   === "true";
    if (req.query.type)   filter.type = req.query.type;
    if (search) filter.$or = [
      { firstName: { $regex: search, $options: "i" } },
      { lastName:  { $regex: search, $options: "i" } },
      { city:      { $regex: search, $options: "i" } },
    ];

    const [pros, total] = await Promise.all([
      Professional.find(filter).sort({ createdAt: -1 })
        .skip((page - 1) * limit).limit(limit).lean(),
      Professional.countDocuments(filter),
    ]);
    res.json({ data: pros, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    logger.error("Professionals list: " + err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET /api/professionals/:id
router.get("/:id", requireRole("admin"), param("id").isMongoId(),
  async (req: AdminRequest, res: Response) => {
    try {
      const pro = await Professional.findById(req.params.id).lean();
      if (!pro) return res.status(404).json({ error: "Professionnel introuvable" });
      res.json({ data: pro });
    } catch { res.status(500).json({ error: "Erreur serveur" }); }
  }
);

// POST /api/professionals — Créer (super_admin)
router.post("/", requireRole("super_admin"),
  [
    body("firstName").notEmpty().trim(),
    body("lastName").notEmpty().trim(),
    body("type").isIn(TYPES),
    body("sessionPrice").optional().isNumeric(),
    body("email").optional().isEmail().normalizeEmail(),
  ],
  async (req: AdminRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const pro = await Professional.create({ ...req.body, isVerified: false });
      logger.info(`Professional created: ${req.body.firstName} ${req.body.lastName} by ${req.admin?.email}`);
      res.status(201).json({ data: pro });
    } catch (err) {
      logger.error("Professional create: " + err);
      res.status(500).json({ error: "Erreur serveur" });
    }
  }
);

// PATCH /api/professionals/:id — Modifier (super_admin)
router.patch("/:id", requireRole("super_admin"), param("id").isMongoId(),
  async (req: AdminRequest, res: Response) => {
    try {
      const updated = await Professional.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!updated) return res.status(404).json({ error: "Professionnel introuvable" });
      logger.info(`Professional updated: ${req.params.id} by ${req.admin?.email}`);
      res.json({ data: updated });
    } catch { res.status(500).json({ error: "Erreur serveur" }); }
  }
);

// PATCH /api/professionals/:id/verify — Vérifier (admin)
router.patch("/:id/verify", requireRole("admin"), param("id").isMongoId(),
  async (req: AdminRequest, res: Response) => {
    try {
      const pro = await Professional.findByIdAndUpdate(
        req.params.id,
        { isVerified: true },
        { new: true }
      );
      if (!pro) return res.status(404).json({ error: "Professionnel introuvable" });
      logger.info(`Professional verified: ${req.params.id} by ${req.admin?.email}`);
      res.json({ data: { isVerified: true } });
    } catch { res.status(500).json({ error: "Erreur serveur" }); }
  }
);

// PATCH /api/professionals/:id/toggle — Activer/Désactiver (admin)
router.patch("/:id/toggle", requireRole("admin"), param("id").isMongoId(),
  async (req: AdminRequest, res: Response) => {
    try {
      const pro = await Professional.findById(req.params.id);
      if (!pro) return res.status(404).json({ error: "Professionnel introuvable" });
      pro.isActive = !pro.isActive;
      await pro.save();
      logger.info(`Professional toggled: ${req.params.id} → ${pro.isActive} by ${req.admin?.email}`);
      res.json({ data: { isActive: pro.isActive } });
    } catch { res.status(500).json({ error: "Erreur serveur" }); }
  }
);

// DELETE /api/professionals/:id (super_admin)
router.delete("/:id", requireRole("super_admin"), param("id").isMongoId(),
  async (req: AdminRequest, res: Response) => {
    try {
      await Professional.findByIdAndDelete(req.params.id);
      logger.warn(`Professional deleted: ${req.params.id} by ${req.admin?.email}`);
      res.json({ success: true });
    } catch { res.status(500).json({ error: "Erreur serveur" }); }
  }
);

export default router;
