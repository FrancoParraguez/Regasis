import { Router, type Request, type Response, type NextFunction } from "express";
import { PrismaClient, CourseStatus, type GradeType } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { requireRole } from "../middleware/auth.js";
import {
  listDemoCourses,
  listAllDemoCourses,
  createDemoCourse,
  deleteDemoCourse
} from "../services/demo-data.js";
import { isPrismaUnavailable } from "../utils/prisma.js";

const prisma = new PrismaClient();
const router = Router();

router.get("/", requireRole("ADMIN"), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const courses = await prisma.course.findMany({
      include: {
        instructors: { include: { user: true } },
        provider: true,
        evaluationSchemes: true
      }
    });
    return res.json(courses);
  } catch (error) {
    if (!isPrismaUnavailable(error)) return next(error);
    return res.json(listAllDemoCourses());
  }
});

interface EvaluationSchemeInput {
  label: string;
  gradeType: GradeType;
  weight: number;
  minScore?: number;
  maxScore?: number;
}

interface CourseBody {
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  providerId: string;
  instructorIds?: string[];
  description?: string;
  location?: string;
  modality?: string;
  status?: CourseStatus;
  evaluationSchemes?: EvaluationSchemeInput[];
}

router.post(
  "/",
  requireRole("ADMIN"),
  async (req: Request<unknown, unknown, CourseBody>, res: Response, next: NextFunction) => {
    const {
      code,
      name,
      startDate,
      endDate,
      providerId,
      instructorIds,
      description,
      location,
      modality,
      status,
      evaluationSchemes
    } = req.body;

    const trimmedDescription = description?.trim();
    const trimmedLocation = location?.trim();
    const trimmedModality = modality?.trim();
    const validStatus = status && Object.values(CourseStatus).includes(status) ? status : undefined;
    const parsedEvaluationSchemes = (evaluationSchemes ?? [])
      .filter((scheme): scheme is EvaluationSchemeInput =>
        Boolean(scheme?.label) && typeof scheme.weight === "number"
      )
      .map((scheme) => ({
        label: scheme.label.trim(),
        gradeType: scheme.gradeType,
        weight: scheme.weight,
        minScore: scheme.minScore ?? 0,
        maxScore: scheme.maxScore ?? 20
      }));

    try {

      const course = await prisma.course.create({
        data: {
          code,
          name,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          providerId,
          description: trimmedDescription || undefined,
          location: trimmedLocation || undefined,
          modality: trimmedModality || undefined,
          status: validStatus,
          instructors: {
            create: (instructorIds ?? []).map((id) => ({ userId: id }))
          },
          evaluationSchemes: parsedEvaluationSchemes.length
            ? { create: parsedEvaluationSchemes }
            : undefined
        },
        include: { evaluationSchemes: true }
      });
      return res.status(201).json(course);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === "P2003") {
          return res.status(400).json({ error: "Proveedor inválido. Selecciona un proveedor existente." });
        }
        if (error.code === "P2002") {
          return res.status(400).json({ error: "El código del curso ya está registrado." });
        }
      }

      if (!isPrismaUnavailable(error)) return next(error);

      try {
        const course = createDemoCourse({
          code,
          name,
          startDate,
          endDate,
          providerId,
          instructorIds,
          description: trimmedDescription,
          location: trimmedLocation,
          modality: trimmedModality,
          status: validStatus,
          evaluationSchemes: parsedEvaluationSchemes
        });
        return res.status(201).json(course);
      } catch (creationError) {
        if (
          creationError instanceof Error &&
          [
            "Código requerido",
            "Nombre requerido",
            "Proveedor requerido",
            "Fecha inválida",
            "La fecha de término debe ser posterior al inicio"
          ].includes(creationError.message)
        ) {
          return res.status(400).json({ error: creationError.message });
        }
        return next(creationError);
      }
    }
  }
);

router.delete(
  "/:id",
  requireRole("ADMIN"),
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    const { id } = req.params;
    try {
      await prisma.course.delete({ where: { id } });
      return res.status(204).send();
    } catch (error) {
      if (!isPrismaUnavailable(error)) return next(error);

      if (deleteDemoCourse(id)) {
        return res.status(204).send();
      }

      return res.status(404).json({ error: "Curso no encontrado" });
    }
  }
);

router.get(
  "/mios",
  requireRole("INSTRUCTOR", "ADMIN"),
  async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user!;
    const userId = user.id;
    const where = user.role === "INSTRUCTOR" ? { instructors: { some: { userId } } } : {};

    try {
      const courses = await prisma.course.findMany({
        where,
        select: {
          id: true,
          code: true,
          name: true,
          startDate: true,
          endDate: true,
          createdAt: true,
          updatedAt: true,
          providerId: true,
          status: true,
          description: true,
          location: true,
          modality: true
        }
      });
      return res.json(courses);
    } catch (error) {
      if (!isPrismaUnavailable(error)) return next(error);
      return res.json(listDemoCourses(userId, user.role));
    }
  }
);

export default router;
