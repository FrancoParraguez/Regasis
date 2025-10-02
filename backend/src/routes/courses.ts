import { Router, type Request, type Response, type NextFunction } from "express";
import { Prisma, PrismaClient } from "@prisma/client";
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
      include: { instructors: { include: { user: true } }, provider: true }
    });
    return res.json(courses);
  } catch (error) {
    if (!isPrismaUnavailable(error)) return next(error);
    return res.json(listAllDemoCourses());
  }
});

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
      const course = await prisma.course.create({
        data: {
          code,
          name,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          providerId,
          instructors: {
            create: (instructorIds ?? []).map((id) => ({ userId: id }))
          }
        }
      });
      return res.status(201).json(course);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
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
          instructorIds
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
          providerId: true
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
