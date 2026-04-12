import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdminDto } from './dto/create-admin.dto';

@Injectable()
export class AdminsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAdminDto) {
    const exists = await this.prisma.admin.findUnique({ where: { username: dto.username } });
    if (exists) throw new ConflictException('Username already taken');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const admin = await this.prisma.admin.create({
      data: { username: dto.username, passwordHash },
    });

    const { passwordHash: _, ...result } = admin;
    return result;
  }

  async findAll() {
    return this.prisma.admin.findMany({
      select: { id: true, username: true, createdAt: true },
    });
  }
}
