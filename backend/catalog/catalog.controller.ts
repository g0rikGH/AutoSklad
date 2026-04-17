import { Controller, Get, Post, Body, UseGuards, Inject } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { CreateReferenceDto, CreateProductDto } from './dto/create-catalog.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('catalog')
@UseGuards(JwtAuthGuard)
export class CatalogController {
  constructor(@Inject(CatalogService) private readonly catalogService: CatalogService) {}

  @Get()
  async getCatalog() {
    const data = await this.catalogService.getAllProductsView();
    return { success: true, data };
  }

  @Post('brands')
  async createBrand(@Body() dto: CreateReferenceDto) {
    const brand = await this.catalogService.createBrand(dto);
    return { success: true, data: brand };
  }

  @Post('locations')
  async createLocation(@Body() dto: CreateReferenceDto) {
    const location = await this.catalogService.createLocation(dto);
    return { success: true, data: location };
  }

  @Post()
  async createProduct(@Body() dto: CreateProductDto) {
    const product = await this.catalogService.createProduct(dto);
    return { success: true, message: 'Товар успешно создан', data: product };
  }
}
