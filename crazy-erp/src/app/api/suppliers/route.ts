import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import {
  authenticateRequest,
  successResponse,
  errorResponse,
  createAuditLog,
  getClientInfo,
  getPaginationParams,
} from '@/lib/api-utils';

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof Response) return auth;

  const { companyId } = auth;
  if (!companyId) return errorResponse('Empresa no seleccionada', 400);

  const { searchParams } = new URL(req.url);
  const { page, limit, skip } = getPaginationParams(searchParams);
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const category = searchParams.get('category') || '';

  const where: Record<string, unknown> = {
    companyId,
    deletedAt: null,
  };

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { cif: { contains: search } },
    ];
  }

  if (status && status !== 'all') {
    where.status = status;
  }

  if (category && category !== 'all') {
    where.category = category;
  }

  const [suppliers, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    }),
    prisma.supplier.count({ where }),
  ]);

  return successResponse({
    suppliers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof Response) return auth;

  const { user, companyId } = auth;
  if (!companyId) return errorResponse('Empresa no seleccionada', 400);

  try {
    const body = await req.json();
    const { name, cif, address, postalCode, city, province, country, phone, email, contactPerson, web, category, paymentTerms, iban, irpfRetention, notes, rating, ratingComment, status } = body;

    if (!name || !cif) {
      return errorResponse('Nombre y CIF son obligatorios', 400);
    }

    // Check CIF unique per company
    const existing = await prisma.supplier.findFirst({
      where: { companyId, cif, deletedAt: null },
    });

    if (existing) {
      return errorResponse('Ya existe un proveedor con ese CIF en esta empresa', 409);
    }

    const supplier = await prisma.supplier.create({
      data: {
        companyId,
        name,
        cif,
        address: address || null,
        postalCode: postalCode || null,
        city: city || null,
        province: province || null,
        country: country || 'España',
        phone: phone || null,
        email: email || null,
        contactPerson: contactPerson || null,
        web: web || null,
        category: category || null,
        paymentTerms: paymentTerms || '30',
        iban: iban || null,
        irpfRetention: irpfRetention ? parseFloat(irpfRetention) : 0,
        notes: notes || null,
        rating: rating ? parseInt(rating) : null,
        ratingComment: ratingComment || null,
        status: status || 'active',
      },
    });

    const { ipAddress, userAgent } = getClientInfo(req);
    await createAuditLog({
      userId: user.userId,
      companyId,
      action: 'CREATE',
      entity: 'Supplier',
      entityId: supplier.id,
      newData: supplier,
      ipAddress,
      userAgent,
    });

    return successResponse(supplier, 201);
  } catch (error) {
    console.error('Error creating supplier:', error);
    return errorResponse('Error al crear el proveedor', 500);
  }
}
