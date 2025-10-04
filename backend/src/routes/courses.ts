import { Router, type Request, type Response, type NextFunction } from "express";
import { requireRole } from "../middleware/auth.js";
import { isDatabaseUnavailable } from "../utils/database.js";
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
      if (isDatabaseUnavailable(error)) {
        return res
          .status(503)
          .json({ error: "La base de datos no está disponible. Intenta nuevamente más tarde." });
      }
      return next(error);
    }
  }
);

interface CourseBody {
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  providerId: string;
  instructorIds?: string[];
}

router.post(
  "/",
  requireRole("ADMIN"),
  async (req: Request<unknown, unknown, CourseBody>, res: Response, next: NextFunction) => {
    const { code, name, startDate, endDate, providerId, instructorIds } = req.body;

    try {
      const course = await createCourseRecord({
        code,
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        providerId,
        instructorIds
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

      if (isDatabaseUnavailable(error)) {
        return res
          .status(503)
          .json({ error: "La base de datos no está disponible. Intenta nuevamente más tarde." });
      }

      return next(error);
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
      if (isDatabaseUnavailable(error)) {
        return res
          .status(503)
          .json({ error: "La base de datos no está disponible. Intenta nuevamente más tarde." });
      }

      return next(error);
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
      if (isDatabaseUnavailable(error)) {
        return res
          .status(503)
          .json({ error: "La base de datos no está disponible. Intenta nuevamente más tarde." });
      }
      return next(error);
    }
  }
);

export default router;
