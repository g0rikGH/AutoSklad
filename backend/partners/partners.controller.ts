import { Controller, Get, Post, Body, UseGuards, Inject } from '@nestjs/common';
import { PartnersService } from './partners.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IsString, IsIn } from 'class-validator';

class CreatePartnerDto {
  @IsString()
  name: string;

  @IsString()
  @IsIn(['SUPPLIER', 'CLIENT', 'supplier', 'client'])
  type: 'SUPPLIER' | 'CLIENT' | 'supplier' | 'client';
}

@Controller('partners')
@UseGuards(JwtAuthGuard)
export class PartnersController {
  constructor(@Inject(PartnersService) private readonly partnersService: PartnersService) {}

  @Get()
  async findAll() {
    const data = await this.partnersService.getAllPartners();
    return { 
      success: true, 
      data: data.map(p => ({ ...p, type: p.type.toLowerCase() })) 
    };
  }

  @Post()
  async create(@Body() body: CreatePartnerDto) {
    const typeUpper = body.type.toUpperCase() as 'SUPPLIER' | 'CLIENT';
    const partner = await this.partnersService.createPartner(body.name, typeUpper);
    return { 
      success: true, 
      data: { ...partner, type: partner.type.toLowerCase() } 
    };
  }
}


