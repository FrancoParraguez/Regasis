import { Router, type Request, type Response, type NextFunction } from "express";
import { requireRole } from "../middleware/auth.js";
import {
  listDemoCourses,
  listAllDemoCourses,
  createDemoCourse,
  deleteDemoCourse
} from "../services/demo-data.js";
import { isDatabaseUnavailable } from "../utils/database.js";
import type { GradeType } from "../types/grades.js";
import type { CourseStatus } from "../types/courses.js";
import {
  listCourses,
  createCourse as createCourseRecord,
  deleteCourse as removeCourse,
  listCoursesForUser
} from "../database/courses.js";

const router = Router();

router.get(
  "/",
  requireRole("ADMIN"),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const courses = await listCourses();
      return res.json(courses);
    } catch (error) {
      if (!isDatabaseUnavailable(error)) return next(error);
      return res.json(listAllDemoCourses());
    }
  }
);

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
    const courseStatuses: CourseStatus[] = ["DRAFT", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
    const validStatus = status && courseStatuses.includes(status) ? status : undefined;
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
      const course = await createCourseRecord({
        code,
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        providerId,
        description: trimmedDescription,
        location: trimmedLocation,
        modality: trimmedModality,
        status: validStatus,
        instructorIds,
        evaluationSchemes: parsedEvaluationSchemes
      });
      return res.status(201).json(course);
    } catch (error) {
      const codeValue = (error as { code?: string }).code;
      if (codeValue === "23503") {
        return res
          .status(400)
          .json({ error: "Proveedor inválido. Selecciona un proveedor existente." });
      }
      if (codeValue === "23505") {
        return res.status(400).json({ error: "El código del curso ya está registrado." });
      }

      if (!isDatabaseUnavailable(error)) return next(error);

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
      const deleted = await removeCourse(id);
      if (!deleted) {
        return res.status(404).json({ error: "Curso no encontrado" });
      }
      return res.status(204).send();
    } catch (error) {
      if (!isDatabaseUnavailable(error)) return next(error);

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
    const instructorId = user.role === "INSTRUCTOR" ? userId : undefined;

    try {
      const courses = await listCoursesForUser(instructorId);
      return res.json(courses);
    } catch (error) {
      if (!isDatabaseUnavailable(error)) return next(error);
      return res.json(listDemoCourses(userId, user.role));
    }
  }
);

export default router;
