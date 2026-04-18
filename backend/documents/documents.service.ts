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

        // Get all products to check if they are PHANTOM
        const productIds = dto.rows.map(r => r.productId);
        const productsInfo = await tx.catalog.findMany({
          where: { id: { in: productIds } },
          select: { id: true, type: true, parentId: true }
        });
        const productMap = new Map(productsInfo.map(p => [p.id, p]));

        // Group rows by REAL physical productId for stock updates
        // If the same physical product is listed multiple times (via itself or phantoms), aggregate
        const physicalStockAggr = new Map<string, { qty: number, price: number }>();
        for (const row of dto.rows) {
          const pInfo = productMap.get(row.productId);
          let targetPhysicalId = row.productId;
          if (pInfo && pInfo.type === 'PHANTOM' && pInfo.parentId) {
            targetPhysicalId = pInfo.parentId;
          }

          if (!physicalStockAggr.has(targetPhysicalId)) {
            physicalStockAggr.set(targetPhysicalId, { qty: 0, price: row.price });
          }
          physicalStockAggr.get(targetPhysicalId)!.qty += row.qty;
          physicalStockAggr.get(targetPhysicalId)!.price = row.price; // keep the latest price
        }

        for (const [physicalId, data] of physicalStockAggr.entries()) {
          if (dto.type === 'INCOME') {
            await tx.stockBalance.upsert({
              where: { productId: physicalId },
              create: { productId: physicalId, qty: data.qty },
              update: { qty: { increment: data.qty } },
            });

            await tx.currentPrice.upsert({
              where: { productId: physicalId },
              create: {
                productId: physicalId,
                purchasePrice: data.price,
                sellingPrice: data.price * 1.5,
              },
              update: {
                purchasePrice: data.price,
              },
            });
          } else if (dto.type === 'EXPENSE') {
            const stock = await tx.stockBalance.findUnique({
              where: { productId: physicalId },
            });

            if (!stock || stock.qty < data.qty) {
              throw new BadRequestException(
                `Ошибка списания: Недостаточно физического товара (ID ${physicalId}) на складе для проведения реализации! Попытка уйти в минус заблокирована. Запрошено: ${data.qty}, В наличии: ${stock?.qty || 0}`
              );
            }

            await tx.stockBalance.update({
              where: { productId: physicalId },
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
    console.log(`[BACKEND-ROLLBACK] Starting rollback for document: ${id}`);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const doc = await tx.document.findUnique({
          where: { id },
          include: { rows: true }
        });

        if (!doc) {
          console.error(`[BACKEND-ROLLBACK] Document not found: ${id}`);
          throw new BadRequestException('Документ не найден');
        }

        console.log(`[BACKEND-ROLLBACK] Processing ${doc.rows.length} rows for document type: ${doc.type}`);

        const productIds = doc.rows.map(r => r.productId);
        const productsInfo = await tx.catalog.findMany({
          where: { id: { in: productIds } },
          select: { id: true, type: true, parentId: true }
        });
        const productMap = new Map(productsInfo.map(p => [p.id, p]));

        for (const row of doc.rows) {
          let physicalId = row.productId;
          const pInfo = productMap.get(row.productId);
          if (pInfo && pInfo.type === 'PHANTOM' && pInfo.parentId) {
            physicalId = pInfo.parentId;
          }

          console.log(`[BACKEND-ROLLBACK] Adjusting product ${physicalId}, qty ${row.qty}, op: ${doc.type === 'INCOME' ? 'DEC' : 'INC'}`);

          if (doc.type === 'INCOME') {
            const stock = await tx.stockBalance.findUnique({ where: { productId: physicalId } });
            if (!stock || stock.qty < row.qty) {
              throw new BadRequestException('Невозможно отменить приход: товар уже списан!');
            }
            await tx.stockBalance.update({
              where: { productId: physicalId },
              data: { qty: { decrement: row.qty } }
            });
          } else if (doc.type === 'EXPENSE') {
            await tx.stockBalance.update({
              where: { productId: physicalId },
              data: { qty: { increment: row.qty } }
            });
          }
        }

        console.log(`[BACKEND-ROLLBACK] Deleting document ${id}`);
        await tx.documentRow.deleteMany({ where: { documentId: id } });
        await tx.document.delete({ where: { id } });
        console.log(`[BACKEND-ROLLBACK] Rollback COMPLETED for: ${id}`);
        return { success: true };
      });
    } catch (error: any) {
      console.error(`[BACKEND-ROLLBACK] CRITICAL ERROR for ${id}:`, error);
      throw error;
    }
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
