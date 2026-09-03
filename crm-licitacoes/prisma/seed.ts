import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding banco de dados...");

  const passwordHash = await bcrypt.hash("123456", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@crm.com" },
    update: {},
    create: {
      name: "Ana Paula (Admin)",
      email: "admin@crm.com",
      passwordHash,
      role: "ADMIN",
      allowedStates: "[]",
      active: true,
    },
  });

  const userMG = await prisma.user.upsert({
    where: { email: "coordenador.mg@crm.com" },
    update: {},
    create: {
      name: "Carlos Coordenador (MG/SP)",
      email: "coordenador.mg@crm.com",
      passwordHash,
      role: "USER",
      allowedStates: JSON.stringify(["MG", "SP"]),
      active: true,
    },
  });

  const userRJ = await prisma.user.upsert({
    where: { email: "especialista.rj@crm.com" },
    update: {},
    create: {
      name: "Beatriz Especialista (RJ/ES)",
      email: "especialista.rj@crm.com",
      passwordHash,
      role: "USER",
      allowedStates: JSON.stringify(["RJ", "ES"]),
      active: true,
    },
  });

  const deals = [
    {
      title: "Pregão Eletrônico 012/2026 - Equipamentos Hospitalares",
      client: "Prefeitura de Belo Horizonte",
      city: "Belo Horizonte",
      state: "MG",
      equipment: "Autoclave",
      model: "AC-500",
      serialNumber: "SN-2026-001",
      category: "ANDAMENTO" as const,
      status: "Licitação em Aberto",
      deadline: daysFromNow(12),
      createdById: userMG.id,
      assignedToId: userMG.id,
    },
    {
      title: "Adesão a Ata de Registro de Preços 034/2025",
      client: "Hospital Municipal de Contagem",
      city: "Contagem",
      state: "MG",
      equipment: "Ventilador Pulmonar",
      model: "VP-200",
      serialNumber: "SN-2025-118",
      category: "ANDAMENTO" as const,
      status: "Negociação em Andamento",
      deadline: daysFromNow(5),
      createdById: userMG.id,
      assignedToId: userMG.id,
    },
    {
      title: "Pregão 045/2026 - Central de Monitoramento",
      client: "Secretaria de Saúde de Campinas",
      city: "Campinas",
      state: "SP",
      equipment: "Monitor Multiparamétrico",
      model: "MM-300",
      category: "PARALISADA" as const,
      status: "Suspensa",
      deadline: daysFromNow(30),
      createdById: userMG.id,
      assignedToId: userMG.id,
    },
    {
      title: "Pregão 022/2026 - Bombas de Infusão",
      client: "Hospital das Clínicas de São Paulo",
      city: "São Paulo",
      state: "SP",
      equipment: "Bomba de Infusão",
      model: "BI-100",
      category: "GANHO" as const,
      status: "Faturado",
      deadline: daysFromNow(-10),
      createdById: userMG.id,
      assignedToId: userMG.id,
    },
    {
      title: "Concorrência 008/2025 - Raio-X Digital",
      client: "Prefeitura de Juiz de Fora",
      city: "Juiz de Fora",
      state: "MG",
      equipment: "Raio-X",
      model: "RX-900",
      category: "PERDIDO" as const,
      status: "Perdido",
      lossReason: "PRECO" as const,
      lossDetail: "Concorrente ofertou preço 18% abaixo do nosso, inviabilizando a proposta.",
      deadline: daysFromNow(-30),
      createdById: userMG.id,
      assignedToId: userMG.id,
    },
    {
      title: "Manutenção em Garantia - Autoclave AC-500",
      client: "Hospital Municipal de Uberlândia",
      city: "Uberlândia",
      state: "MG",
      equipment: "Autoclave",
      model: "AC-500",
      serialNumber: "SN-2024-077",
      category: "GARANTIA" as const,
      status: "Em Reparo",
      createdById: userMG.id,
      assignedToId: userMG.id,
    },
    {
      title: "Pregão 019/2026 - Ventiladores Pulmonares",
      client: "Prefeitura do Rio de Janeiro",
      city: "Rio de Janeiro",
      state: "RJ",
      equipment: "Ventilador Pulmonar",
      model: "VP-250",
      category: "ANDAMENTO" as const,
      status: "Esclarecimento",
      deadline: daysFromNow(3),
      createdById: userRJ.id,
      assignedToId: userRJ.id,
    },
    {
      title: "Pregão 007/2026 - Mobiliário Hospitalar",
      client: "Hospital Estadual de Vitória",
      city: "Vitória",
      state: "ES",
      category: "GANHO" as const,
      status: "Pendente de Entrega",
      deadline: daysFromNow(20),
      createdById: userRJ.id,
      assignedToId: userRJ.id,
    },
    {
      title: "Pregão 003/2024 - Camas Hospitalares (arquivado)",
      client: "Prefeitura de Niterói",
      city: "Niterói",
      state: "RJ",
      category: "ARQUIVADO" as const,
      status: "Arquivado",
      archivedYear: 2024,
      archivedMonth: 11,
      createdById: userRJ.id,
      assignedToId: userRJ.id,
    },
    {
      title: "Adesão Concluída - Kit Cirúrgico",
      client: "Hospital Regional de Goiânia",
      city: "Goiânia",
      state: "GO",
      category: "CONCLUIDO" as const,
      status: "Concluído",
      createdById: admin.id,
      assignedToId: admin.id,
    },
  ];

  for (const dealData of deals) {
    const deal = await prisma.deal.create({ data: dealData });
    await prisma.auditLog.create({
      data: {
        dealId: deal.id,
        userId: dealData.createdById,
        action: `Criou o processo "${deal.title}" (seed)`,
      },
    });
  }

  const firstDeal = await prisma.deal.findFirst({ where: { category: "ANDAMENTO" } });
  if (firstDeal) {
    await prisma.note.create({
      data: {
        dealId: firstDeal.id,
        userId: firstDeal.createdById,
        text: "Contato inicial realizado com o setor de compras. Aguardando publicação do edital final.",
      },
    });
    await prisma.reminder.create({
      data: {
        dealId: firstDeal.id,
        assignedToId: firstDeal.createdById,
        dueDate: new Date(),
        description: "Ligar para confirmar recebimento da documentação",
      },
    });
  }

  console.log("Seed concluído.");
  console.log("Usuários de teste (senha: 123456):");
  console.log(` - ${admin.email} (ADMIN, todos os estados)`);
  console.log(` - ${userMG.email} (USER, MG/SP)`);
  console.log(` - ${userRJ.email} (USER, RJ/ES)`);
}

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
