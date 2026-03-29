import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import {
  authenticateRequest,
  successResponse,
  errorResponse,
  createAuditLog,
  getClientInfo,
} from '@/lib/api-utils';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req);
  if (auth instanceof Response) return auth;

  const { companyId } = auth;
  if (!companyId) return errorResponse('Empresa no seleccionada', 400);

  const { id } = await params;

  const client = await prisma.client.findFirst({
    where: { id, companyId, deletedAt: null },
  });

  if (!client) return errorResponse('Cliente no encontrado', 404);

  // Get project stats
  const projects = await prisma.project.findMany({
    where: { clientId: id, deletedAt: null },
    select: { id: true, status: true, name: true, code: true },
  });

  const projectStats = {
    total: projects.length,
    active: projects.filter(p => ['en_curso', 'en_pausa'].includes(p.status)).length,
    completed: projects.filter(p => p.status === 'completado').length,
  };

  return successResponse({ ...client, projectStats, recentProjects: projects.slice(0, 5) });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req);
  if (auth instanceof Response) return auth;

  const { user, companyId } = auth;
  if (!companyId) return errorResponse('Empresa no seleccionada', 400);

  const { id } = await params;

  const existing = await prisma.client.findFirst({
    where: { id, companyId, deletedAt: null },
  });

  if (!existing) return errorResponse('Cliente no encontrado', 404);

  try {
    const body = await req.json();
    const { name, cif, address, postalCode, city, province, country, phone, email, contactPerson, contactRole, web, paymentTerms, iban, notes, tags, status } = body;

    // If CIF changed, check uniqueness
    if (cif && cif !== existing.cif) {
      const duplicate = await prisma.client.findFirst({
        where: { companyId, cif, deletedAt: null, id: { not: id } },
      });
      if (duplicate) {
        return errorResponse('Ya existe un cliente con ese CIF en esta empresa', 409);
      }
    }

    const client = await prisma.client.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(cif !== undefined && { cif }),
        ...(address !== undefined && { address }),
        ...(postalCode !== undefined && { postalCode }),
        ...(city !== undefined && { city }),
        ...(province !== undefined && { province }),
        ...(country !== undefined && { country }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(contactPerson !== undefined && { contactPerson }),
        ...(contactRole !== undefined && { contactRole }),
        ...(web !== undefined && { web }),
        ...(paymentTerms !== undefined && { paymentTerms }),
        ...(iban !== undefined && { iban }),
        ...(notes !== undefined && { notes }),
        ...(tags !== undefined && { tags: JSON.stringify(tags) }),
        ...(status !== undefined && { status }),
      },
    });

    const { ipAddress, userAgent } = getClientInfo(req);
    await createAuditLog({
      userId: user.userId,
      companyId,
      action: 'UPDATE',
      entity: 'Client',
      entityId: id,
      oldData: existing,
      newData: client,
      ipAddress,
      userAgent,
    });

    return successResponse(client);
  } catch (error) {
    console.error('Error updating client:', error);
    return errorResponse('Error al actualizar el cliente', 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req);
  if (auth instanceof Response) return auth;

  const { user, companyId } = auth;
  if (!companyId) return errorResponse('Empresa no seleccionada', 400);

  const { id } = await params;

  const existing = await prisma.client.findFirst({
    where: { id, companyId, deletedAt: null },
  });

  if (!existing) return errorResponse('Cliente no encontrado', 404);

  await prisma.client.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  const { ipAddress, userAgent } = getClientInfo(req);
  await createAuditLog({
    userId: user.userId,
    companyId,
    action: 'DELETE',
    entity: 'Client',
    entityId: id,
    oldData: existing,
    ipAddress,
    userAgent,
  });

  return successResponse({ message: 'Cliente eliminado correctamente' });
}
