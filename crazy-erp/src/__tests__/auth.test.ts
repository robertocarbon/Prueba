import { hashPassword, verifyPassword, validatePassword, generateToken, verifyToken } from '@/lib/auth';
import { canAccess, ROLES } from '@/lib/permissions';

describe('Password hashing', () => {
  test('should hash and verify password correctly', async () => {
    const password = 'CrazyAdmin2024!';
    const hash = await hashPassword(password);

    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(0);

    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);

    const isInvalid = await verifyPassword('wrongpassword', hash);
    expect(isInvalid).toBe(false);
  });
});

describe('Password validation', () => {
  test('should reject passwords shorter than 8 characters', () => {
    const result = validatePassword('Ab1');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('8 caracteres');
  });

  test('should reject passwords without uppercase', () => {
    const result = validatePassword('abcdefg1');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('mayúscula');
  });

  test('should reject passwords without lowercase', () => {
    const result = validatePassword('ABCDEFG1');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('minúscula');
  });

  test('should reject passwords without number', () => {
    const result = validatePassword('Abcdefgh');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('número');
  });

  test('should accept valid passwords', () => {
    const result = validatePassword('CrazyAdmin2024!');
    expect(result.valid).toBe(true);
  });
});

describe('JWT tokens', () => {
  const payload = { userId: 'test-id', email: 'test@test.com', isSuperAdmin: false };

  test('should generate and verify token', () => {
    const token = generateToken(payload);
    expect(token).toBeTruthy();

    const decoded = verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded!.userId).toBe(payload.userId);
    expect(decoded!.email).toBe(payload.email);
  });

  test('should return null for invalid token', () => {
    const decoded = verifyToken('invalid-token');
    expect(decoded).toBeNull();
  });
});

describe('Role permissions', () => {
  test('superadmin can access everything', () => {
    expect(canAccess('superadmin', 'projects', 'canView')).toBe(true);
    expect(canAccess('superadmin', 'invoices', 'canDelete')).toBe(true);
    expect(canAccess('superadmin', 'audit', 'canExport')).toBe(true);
  });

  test('admin can access everything', () => {
    expect(canAccess('admin', 'projects', 'canView')).toBe(true);
    expect(canAccess('admin', 'config', 'canEdit')).toBe(true);
  });

  test('contable can access financial modules', () => {
    expect(canAccess('contable', 'invoices', 'canView')).toBe(true);
    expect(canAccess('contable', 'bank', 'canView')).toBe(true);
    expect(canAccess('contable', 'projects', 'canView')).toBe(false);
  });

  test('user has limited access', () => {
    expect(canAccess('user', 'dashboard', 'canView')).toBe(true);
    expect(canAccess('user', 'projects', 'canView')).toBe(true);
    expect(canAccess('user', 'invoices', 'canView')).toBe(false);
    expect(canAccess('user', 'projects', 'canCreate')).toBe(false);
  });

  test('almacen can access warehouse', () => {
    expect(canAccess('almacen', 'warehouse', 'canView')).toBe(true);
    expect(canAccess('almacen', 'warehouse', 'canCreate')).toBe(true);
    expect(canAccess('almacen', 'invoices', 'canView')).toBe(false);
  });

  test('unknown role has no access', () => {
    expect(canAccess('unknown_role', 'projects', 'canView')).toBe(false);
  });
});
