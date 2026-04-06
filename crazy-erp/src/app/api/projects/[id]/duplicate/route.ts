import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import {
  authenticateRequest,
  successResponse,
  errorResponse,
  createAuditLog,
  getClientInfo,
} from '@/lib/api-utils';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(req);
  if (auth instanceof Response) return auth;

  const { user, companyId } = auth;
  if (!companyId) return errorResponse('Empresa no seleccionada', 400);

  const { id } = await params;

  try {
    const original = await prisma.project.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        phases: { orderBy: { order: 'asc' } },
        tasks: true,
        materials: true,
      },
    });

    if (!original) return errorResponse('Proyecto no encontrado', 404);

    // Generate new code
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return errorResponse('Empresa no encontrada', 404);

    const year = new Date().getFullYear();
    const num = String(company.nextProjectNum).padStart(3, '0');
    const code = `${company.prefixProject}-${year}-${num}`;

    // Create duplicated project without dates, amounts or people
    const newProject = await prisma.project.create({
      data: {
        companyId,
        clientId: null,
        code,
        name: `${original.name} (copia)`,
        description: original.description,
        status: 'borrador',
        priority: original.priority,
        location: original.location,
      },
    });

    // Duplicate phases
    const phaseIdMap = new Map<string, string>();
    for (const phase of original.phases) {
      const newPhase = await prisma.projectPhase.create({
        data: {
          projectId: newProject.id,
          name: phase.name,
          type: phase.type,
          order: phase.order,
          status: 'pendiente',
          progress: 0,
          notes: phase.notes,
        },
      });
      phaseIdMap.set(phase.id, newPhase.id);
    }

    // Duplicate tasks without assignee or dates
    for (const task of original.tasks) {
      await prisma.projectTask.create({
        data: {
          projectId: newProject.id,
          phaseId: task.phaseId ? phaseIdMap.get(task.phaseId) || null : null,
          title: task.title,
          description: task.description,
          status: 'pendiente',
          priority: task.priority,
          order: task.order,
          checklist: task.checklist,
        },
      });
    }

    // Duplicate materials without costs
    for (const mat of original.materials) {
      await prisma.projectMaterial.create({
        data: {
          projectId: newProject.id,
          name: mat.name,
          quantity: mat.quantity,
          unit: mat.unit,
          unitCost: 0,
          totalCost: 0,
          status: 'pendiente',
          notes: mat.notes,
        },
      });
    }

    // Increment nextProjectNum
    await prisma.company.update({
      where: { id: companyId },
      data: { nextProjectNum: company.nextProjectNum + 1 },
    });

    const fullProject = await prisma.project.findUnique({
      where: { id: newProject.id },
      include: {
        client: { select: { id: true, name: true } },
        phases: { orderBy: { order: 'asc' } },
      },
    });

    const { ipAddress, userAgent } = getClientInfo(req);
    await createAuditLog({
      userId: user.userId,
      companyId,
      action: 'DUPLICATE',
      entity: 'Project',
      entityId: newProject.id,
      newData: { originalId: id, newId: newProject.id },
      ipAddress,
      userAgent,
    });

    return successResponse(fullProject, 201);
  } catch (error) {
    console.error('Error duplicating project:', error);
    return errorResponse('Error al duplicar el proyecto', 500);
  }
}
