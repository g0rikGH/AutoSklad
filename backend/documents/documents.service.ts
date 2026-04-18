import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';

@Injectable()
export class DocumentsService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async createDocument(dto: CreateDocumentDto, userId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const lastDoc = await tx.document.findFirst({
          where: { type: dto.type },
          orderBy: { number: 'desc' }
        });
        
        const nextNumber = (lastDoc?.number || 0) + 1;

        const document = await tx.document.create({
          data: {
            type: dto.type,
            number: nextNumber,
            name: dto.name,
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

        // Group rows by productId to avoid multiple upserts for the same product in a loop
        // If the same product is listed multiple times, their quantities should be aggregated
        const productAggr = new Map<string, { qty: number, price: number }>();
        for (const row of dto.rows) {
          if (!productAggr.has(row.productId)) {
            productAggr.set(row.productId, { qty: 0, price: row.price });
          }
          productAggr.get(row.productId)!.qty += row.qty;
          productAggr.get(row.productId)!.price = row.price; // keep the latest price
        }

        for (const [productId, data] of productAggr.entries()) {
          if (dto.type === 'INCOME') {
            await tx.stockBalance.upsert({
              where: { productId: productId },
              create: { productId: productId, qty: data.qty },
              update: { qty: { increment: data.qty } },
            });

            await tx.currentPrice.upsert({
              where: { productId: productId },
              create: {
                productId: productId,
                purchasePrice: data.price,
                sellingPrice: data.price * 1.5,
              },
              update: {
                purchasePrice: data.price,
              },
            });
          } else if (dto.type === 'EXPENSE') {
            const stock = await tx.stockBalance.findUnique({
              where: { productId: productId },
            });

            if (!stock || stock.qty < data.qty) {
              throw new BadRequestException(
                `Ошибка списания: Недостаточно товара (ID ${productId}) на складе для проведения реализации! Попытка уйти в минус заблокирована.`
              );
            }

            await tx.stockBalance.update({
              where: { productId: productId },
              data: { qty: { decrement: data.qty } },
            });
          }
        }

        return document;
      });
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      let errorDetails = error.message;
      if (error.code) {
        errorDetails = `[${error.code}] ${error.message} - Meta: ${JSON.stringify(error.meta || {})}`;
      }

      console.error('Prisma Transaction Error Details:', errorDetails);
      throw new BadRequestException(
        `Ошибка базы данных при сохранении документа: ${errorDetails}`
      );
    }
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
