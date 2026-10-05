import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateProductDto } from './dto/create-product.dto.js';
import type { UpdateProductDto } from './dto/update-product.dto.js';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForMerchant(merchantId: string) {
    return this.prisma.product.findMany({
      where: { merchantId },
      orderBy: { name: 'asc' },
    });
  }

  async listActiveForMerchant(merchantId: string) {
    return this.prisma.product.findMany({
      where: { merchantId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async getActiveById(productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || !product.isActive) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async createForMerchant(merchantId: string, dto: CreateProductDto) {
    return this.prisma.product.create({
      data: { ...dto, merchantId },
    });
  }

  private async getOwned(productId: string, merchantId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    if (product.merchantId !== merchantId) {
      throw new ForbiddenException("You don't own this product");
    }
    return product;
  }

  async update(productId: string, merchantId: string, dto: UpdateProductDto) {
    await this.getOwned(productId, merchantId);
    return this.prisma.product.update({ where: { id: productId }, data: dto });
  }

  async remove(productId: string, merchantId: string) {
    await this.getOwned(productId, merchantId);
    await this.prisma.product.delete({ where: { id: productId } });
  }
}
