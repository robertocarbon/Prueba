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

  const supplier = await prisma.supplier.findFirst({
    where: { id, companyId, deletedAt: null },
  });

  if (!supplier) return errorResponse('Proveedor no encontrado', 404);

  return successResponse(supplier);
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

  const existing = await prisma.supplier.findFirst({
    where: { id, companyId, deletedAt: null },
  });

  if (!existing) return errorResponse('Proveedor no encontrado', 404);

  try {
    const body = await req.json();
    const { name, cif, address, postalCode, city, province, country, phone, email, contactPerson, web, category, paymentTerms, iban, irpfRetention, notes, rating, ratingComment, status } = body;

    // If CIF changed, check uniqueness
    if (cif && cif !== existing.cif) {
      const duplicate = await prisma.supplier.findFirst({
        where: { companyId, cif, deletedAt: null, id: { not: id } },
      });
      if (duplicate) {
        return errorResponse('Ya existe un proveedor con ese CIF en esta empresa', 409);
      }
    }

    const supplier = await prisma.supplier.update({
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
        ...(web !== undefined && { web }),
        ...(category !== undefined && { category }),
        ...(paymentTerms !== undefined && { paymentTerms }),
        ...(iban !== undefined && { iban }),
        ...(irpfRetention !== undefined && { irpfRetention: parseFloat(irpfRetention) }),
        ...(notes !== undefined && { notes }),
        ...(rating !== undefined && { rating: rating ? parseInt(rating) : null }),
        ...(ratingComment !== undefined && { ratingComment }),
        ...(status !== undefined && { status }),
      },
    });

    const { ipAddress, userAgent } = getClientInfo(req);
    await createAuditLog({
      userId: user.userId,
      companyId,
      action: 'UPDATE',
      entity: 'Supplier',
      entityId: id,
      oldData: existing,
      newData: supplier,
      ipAddress,
      userAgent,
    });

    return successResponse(supplier);
  } catch (error) {
    console.error('Error updating supplier:', error);
    return errorResponse('Error al actualizar el proveedor', 500);
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

  const existing = await prisma.supplier.findFirst({
    where: { id, companyId, deletedAt: null },
  });

  if (!existing) return errorResponse('Proveedor no encontrado', 404);

  await prisma.supplier.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  const { ipAddress, userAgent } = getClientInfo(req);
  await createAuditLog({
    userId: user.userId,
    companyId,
    action: 'DELETE',
    entity: 'Supplier',
    entityId: id,
    oldData: existing,
    ipAddress,
    userAgent,
  });

  return successResponse({ message: 'Proveedor eliminado correctamente' });
}
