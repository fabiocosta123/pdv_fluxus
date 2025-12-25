import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

// 1. Criamos a conexão com o Neon
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

// 2. Passamos o adaptador para o cliente (isso resolve o erro de construtor vazio)
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Iniciando o seed de produtos...');

  // Limpeza (ordem correta para não quebrar chaves estrangeiras)
  await prisma.saleItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.product.deleteMany();

  const products = [
    {
      name: 'Cerveja Skol 600ml',
      barCode: '7891234567890',
      price: 1250,
      stock: 48,
      unit: 'UN',
    },
    {
      name: 'Coca-Cola 2L',
      barCode: '789000123456',
      price: 990,
      stock: 24,
      unit: 'UN',
    },
    {
      name: 'Queijo Prato (Fatiado)',
      barCode: '1001',
      price: 4590,
      stock: 5.5,
      unit: 'KG',
    },
    {
      name: 'Livro Púlpitos desviados',
      barCode: '9788574594910',
      price: 3990,
      stock: 5,
      unit: 'UN',
    }
  ];

  for (const p of products) {
    await prisma.product.create({
      data: p,
    });
  }

  console.log('Seed finalizado com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });