import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReferenceDto, CreateProductDto } from './dto/create-catalog.dto';

@Injectable()
export class CatalogService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async getAllProductsView() {
    const products = await this.prisma.catalog.findMany({
      include: {
        brand: true,
        location: true,
        stockBalance: true,
        currentPrice: true,
        parent: {
          include: {
            stockBalance: true,
          },
        },
      },
    });

    return products.map((p) => {
      let qty = 0;
      if (p.type === 'REAL') {
        qty = p.stockBalance?.qty ?? 0;
      } else if (p.type === 'PHANTOM') {
        qty = p.parent?.stockBalance?.qty ?? 0;
      }

      return {
        id: p.id,
        article: p.article,
        name: p.name,
        type: p.type.toLowerCase(),
        comment: p.comment,
        parentId: p.parentId,
        brandId: p.brandId,
        brand: p.brand?.name || 'Без бренда',
        locationId: p.locationId,
        location: p.location?.name || 'Не на полке',
        qty: qty,
        purchasePrice: p.currentPrice?.purchasePrice ?? 0,
        sellingPrice: p.currentPrice?.sellingPrice ?? 0,
      };
    });
  }

  async createBrand(dto: CreateReferenceDto) {
    return this.prisma.brand.create({
      data: { name: dto.name },
    });
  }

  async getBrands() {
    return this.prisma.brand.findMany({
      orderBy: { name: 'asc' }
    });
  }

  async createLocation(dto: CreateReferenceDto) {
    return this.prisma.location.create({
      data: { name: dto.name },
    });
  }

  async getLocations() {
    return this.prisma.location.findMany({
      orderBy: { name: 'asc' }
    });
  }

  async createProduct(dto: CreateProductDto) {
    if (dto.type === 'PHANTOM') {
      const parent = await this.prisma.catalog.findUnique({
        where: { id: dto.parentId },
        select: { type: true },
      });

      if (!parent) {
        throw new BadRequestException(`Родительский товар с ID ${dto.parentId} не существует.`);
      }

      if (parent.type !== 'REAL') {
        throw new BadRequestException('Архитектурная ошибка: Фантом может ссылаться только на REAL-товар!');
      }
    } else {
      dto.parentId = undefined;
    }

    return this.prisma.catalog.create({
      data: {
        article: dto.article,
        name: dto.name,
        type: dto.type,
        brandId: dto.brandId,
        locationId: dto.locationId,
        comment: dto.comment,
        parentId: dto.parentId,
      },
    });
  }

  async getProductHistory(productId: string) {
    const product = await this.prisma.catalog.findUnique({
      where: { id: productId },
      select: { type: true, parentId: true }
    });

    if (!product) {
      throw new BadRequestException('Товар не найден.');
    }

    const targetProductId = product.type === 'PHANTOM' && product.parentId ? product.parentId : productId;

    const historyRows = await this.prisma.documentRow.findMany({
      where: {
        productId: targetProductId,
        document: {
          type: 'INCOME'
        }
      },
      include: {
        document: {
          include: {
            partner: true
          }
        }
      },
      orderBy: {
        document: {
          date: 'desc'
        }
      }
    });

    return historyRows.map(row => ({
      id: row.id,
      date: row.document.date,
      supplier: row.document.partner.name,
      qty: row.qty,
      price: row.price
    }));
  }

  async updateProduct(id: string, dto: any) {
    // Basic update logic for product fields + UPSERT for prices if provided
    return this.prisma.$transaction(async (tx) => {
      const dataToUpdate: any = {};
      if (dto.article !== undefined) dataToUpdate.article = dto.article;
      if (dto.name !== undefined) dataToUpdate.name = dto.name;
      if (dto.brandId !== undefined) dataToUpdate.brandId = dto.brandId;
      if (dto.locationId !== undefined) dataToUpdate.locationId = dto.locationId;
      if (dto.comment !== undefined) dataToUpdate.comment = dto.comment;

      const updatedProduct = await tx.catalog.update({
        where: { id },
        data: dataToUpdate
      });

      if (dto.purchasePrice !== undefined || dto.sellingPrice !== undefined) {
        await tx.currentPrice.upsert({
          where: { productId: id },
          create: {
            productId: id,
            purchasePrice: dto.purchasePrice || 0,
            sellingPrice: dto.sellingPrice || 0,
          },
          update: {
            purchasePrice: dto.purchasePrice,
            sellingPrice: dto.sellingPrice,
          }
        });
      }

      return updatedProduct;
    });
  }

  async deleteProduct(id: string) {
    return this.prisma.catalog.delete({
      where: { id }
    });
  }
}
