import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import {
  authenticateRequest,
  successResponse,
  errorResponse,
  createAuditLog,
  getClientInfo,
} from '@/lib/api-utils';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(req);
  if (auth instanceof Response) return auth;

  const { companyId } = auth;
  if (!companyId) return errorResponse('Empresa no seleccionada', 400);

  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: { id, companyId, deletedAt: null },
  });
  if (!project) return errorResponse('Proyecto no encontrado', 404);

  const materials = await prisma.projectMaterial.findMany({
    where: { projectId: id },
    include: { supplier: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return successResponse(materials);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(req);
  if (auth instanceof Response) return auth;

  const { user, companyId } = auth;
  if (!companyId) return errorResponse('Empresa no seleccionada', 400);

  const { id } = await params;

  try {
    const project = await prisma.project.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!project) return errorResponse('Proyecto no encontrado', 404);

    const body = await req.json();
    const { name, quantity, unit, unitCost, supplierId, status, notes } = body;

    if (!name) return errorResponse('El nombre del material es obligatorio', 400);

    const qty = quantity || 1;
    const cost = unitCost || 0;

    const material = await prisma.projectMaterial.create({
      data: {
        projectId: id,
        supplierId: supplierId || null,
        name,
        quantity: qty,
        unit: unit || 'ud',
        unitCost: cost,
        totalCost: qty * cost,
        status: status || 'pendiente',
        notes: notes || null,
      },
      include: { supplier: { select: { id: true, name: true } } },
    });

    const { ipAddress, userAgent } = getClientInfo(req);
    await createAuditLog({
      userId: user.userId,
      companyId,
      action: 'CREATE',
      entity: 'ProjectMaterial',
      entityId: material.id,
      newData: material,
      ipAddress,
      userAgent,
    });

    return successResponse(material, 201);
  } catch (error) {
    console.error('Error creating material:', error);
    return errorResponse('Error al crear el material', 500);
  }
}
