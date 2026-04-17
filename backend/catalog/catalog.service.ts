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
        type: p.type,
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

  async createLocation(dto: CreateReferenceDto) {
    return this.prisma.location.create({
      data: { name: dto.name },
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
}
