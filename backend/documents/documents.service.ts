import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';

@Injectable()
export class DocumentsService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async createDocument(dto: CreateDocumentDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const document = await tx.document.create({
        data: {
          type: dto.type,
          partnerId: dto.partnerId,
          totalAmount: dto.totalAmount,
          userId,
          rows: {
            create: dto.rows.map((row) => ({
              productId: row.productId,
              qty: row.qty,
              price: row.price,
            })),
          },
        },
        include: { rows: true },
      });

      for (const row of dto.rows) {
        if (dto.type === 'INCOME') {
          await tx.stockBalance.upsert({
            where: { productId: row.productId },
            create: { productId: row.productId, qty: row.qty },
            update: { qty: { increment: row.qty } },
          });

          await tx.currentPrice.upsert({
            where: { productId: row.productId },
            create: {
              productId: row.productId,
              purchasePrice: row.price,
              sellingPrice: row.price * 1.5,
            },
            update: {
              purchasePrice: row.price,
            },
          });
        } else if (dto.type === 'EXPENSE') {
          const stock = await tx.stockBalance.findUnique({
            where: { productId: row.productId },
          });

          if (!stock || stock.qty < row.qty) {
            throw new BadRequestException(
              `Ошибка списания: Недостаточно товара (ID ${row.productId}) на складе для проведения реализации! Попытка уйти в минус заблокирована.`
            );
          }

          await tx.stockBalance.update({
            where: { productId: row.productId },
            data: { qty: { decrement: row.qty } },
          });
        }
      }

      return document;
    });
  }

  async rollbackDocument(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const doc = await tx.document.findUnique({
        where: { id },
        include: { rows: true }
      });

      if (!doc) throw new BadRequestException('Документ не найден');

      for (const row of doc.rows) {
        if (doc.type === 'INCOME') {
          const stock = await tx.stockBalance.findUnique({ where: { productId: row.productId } });
          if (!stock || stock.qty < row.qty) {
            throw new BadRequestException('Невозможно отменить приход: товар уже списан!');
          }
          await tx.stockBalance.update({
            where: { productId: row.productId },
            data: { qty: { decrement: row.qty } }
          });
        } else if (doc.type === 'EXPENSE') {
          await tx.stockBalance.update({
            where: { productId: row.productId },
            data: { qty: { increment: row.qty } }
          });
        }
      }

      return tx.document.delete({ where: { id } });
    });
  }

  async getAllDocuments() {
    return this.prisma.document.findMany({
      include: {
        rows: true,
        partner: true,
        user: true,
      },
      orderBy: { date: 'desc' },
    });
  }
}
