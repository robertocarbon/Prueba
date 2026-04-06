import { PrismaClient } from '../src/generated/prisma';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // Create superadmin user
  const hashedPassword = await bcrypt.hash('CrazyAdmin2024!', 12);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@crazy.com' },
    update: {},
    create: {
      email: 'admin@crazy.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'CRAZY',
      phone: '+34 600 000 000',
      theme: 'dark',
      language: 'es',
      mustChangePassword: true,
      isSuperAdmin: true,
      active: true,
    },
  });

  console.log('Created superadmin:', adminUser.email);

  // Create company
  const company = await prisma.company.upsert({
    where: { cif: 'B12345678' },
    update: {},
    create: {
      name: 'CRAZY S.L.',
      cif: 'B12345678',
      fiscalName: 'CRAZY PRODUCCIONES S.L.',
      address: 'Calle de la Producción, 42',
      city: 'Madrid',
      postalCode: '28001',
      province: 'Madrid',
      country: 'España',
      phone: '+34 91 000 0000',
      email: 'info@crazy.com',
      web: 'www.crazy.com',
      fiscalAddress: 'Calle de la Producción, 42, 28001 Madrid',
      currency: 'EUR',
      prefixProject: 'CRAZY',
      prefixBudget: 'PPTO',
      prefixInvoice: 'FE',
      prefixReceivedInvoice: 'FR',
      prefixOrder: 'OC',
    },
  });

  console.log('Created company:', company.name);

  // Link user to company as admin
  const userCompany = await prisma.userCompany.upsert({
    where: { userId_companyId: { userId: adminUser.id, companyId: company.id } },
    update: {},
    create: {
      userId: adminUser.id,
      companyId: company.id,
      role: 'admin',
      active: true,
    },
  });

  // Create default permissions for admin
  const modules = [
    'dashboard', 'projects', 'calendar', 'clients', 'suppliers', 'budgets',
    'personnel', 'contracts', 'invoices', 'bank', 'finances', 'pettycash',
    'warehouse', 'transport', 'workshops', 'config', 'users', 'audit',
    'backup', 'reports',
  ];

  for (const mod of modules) {
    await prisma.permission.upsert({
      where: { userCompanyId_module: { userCompanyId: userCompany.id, module: mod } },
      update: {},
      create: {
        userCompanyId: userCompany.id,
        module: mod,
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canExport: true,
      },
    });
  }

  console.log('Created permissions for admin');

  // Create default dashboard widgets
  const widgets = [
    'active_projects', 'pending_tasks', 'at_risk_projects',
    'financial_summary', 'pending_invoices', 'alerts',
    'workshop_occupancy', 'recent_activity',
  ];

  for (let i = 0; i < widgets.length; i++) {
    await prisma.dashboardWidget.upsert({
      where: { userId_widgetKey: { userId: adminUser.id, widgetKey: widgets[i] } },
      update: {},
      create: {
        userId: adminUser.id,
        widgetKey: widgets[i],
        position: i,
        visible: true,
      },
    });
  }

  // Create default company settings
  const settings = [
    { key: 'date_format', value: 'DD/MM/YYYY' },
    { key: 'time_format', value: 'HH:mm' },
    { key: 'decimal_separator', value: ',' },
    { key: 'thousands_separator', value: '.' },
    { key: 'default_iva_rate', value: '21' },
    { key: 'default_payment_terms', value: '30' },
    { key: 'fiscal_year_start', value: '01-01' },
    { key: 'session_timeout_minutes', value: '30' },
    { key: 'max_login_attempts', value: '5' },
    { key: 'lockout_duration_minutes', value: '30' },
    { key: 'default_project_phases', value: JSON.stringify(['Diseño', 'Decorado', 'Construcción', 'Envío', 'Montaje', 'Desmontaje']) },
    { key: 'material_categories', value: JSON.stringify(['Madera', 'Metal', 'Pintura', 'Tela', 'Herramienta', 'Decorado reutilizable', 'Otro']) },
    { key: 'supplier_categories', value: JSON.stringify(['Material', 'Transporte', 'Alquiler', 'Pintura', 'Madera', 'Metal', 'Tela', 'Servicios', 'Otro']) },
    { key: 'contract_types', value: JSON.stringify(['Temporal', 'Por obra', 'Indefinido', 'Autónomo/Mercantil', 'Becario']) },
    { key: 'expense_types', value: JSON.stringify(['Material', 'Personal', 'Transporte', 'Alquiler', 'Servicios', 'Dietas', 'Alojamiento', 'Otro']) },
    { key: 'diet_types', value: JSON.stringify(['Completa', 'Media', 'Desplazamiento']) },
  ];

  for (const setting of settings) {
    await prisma.companySetting.upsert({
      where: { companyId_key: { companyId: company.id, key: setting.key } },
      update: {},
      create: {
        companyId: company.id,
        key: setting.key,
        value: setting.value,
      },
    });
  }

  console.log('Created company settings');

  // Create welcome notification
  await prisma.notification.create({
    data: {
      userId: adminUser.id,
      companyId: company.id,
      type: 'system',
      title: 'Bienvenido a CRAZY ERP',
      message: 'Tu cuenta ha sido creada. Recuerda cambiar tu contraseña en el primer acceso.',
      read: false,
    },
  });

  console.log('Seed completed successfully!');
  console.log('');
  console.log('=== CREDENCIALES DE ACCESO ===');
  console.log('Email:      admin@crazy.com');
  console.log('Password:   CrazyAdmin2024!');
  console.log('Empresa:    CRAZY S.L.');
  console.log('=============================');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
