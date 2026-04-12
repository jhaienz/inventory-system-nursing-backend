import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBorrowerDto } from './dto/create-borrower.dto';
import { UpdateBorrowerDto } from './dto/update-borrower.dto';

const BORROWER_SELECT = {
  id: true,
  username: true,
  fullName: true,
  isBlocked: true,
  createdAt: true,
};

@Injectable()
export class BorrowersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBorrowerDto) {
    const exists = await this.prisma.borrower.findUnique({
      where: { username: dto.username },
    });
    if (exists) throw new ConflictException('Username already taken');

    const pinHash = await bcrypt.hash(dto.pin, 10);
    return this.prisma.borrower.create({
      data: { username: dto.username, fullName: dto.fullName, pinHash },
      select: BORROWER_SELECT,
    });
  }

  findAll() {
    return this.prisma.borrower.findMany({ select: BORROWER_SELECT });
  }

  async findOne(id: number) {
    const borrower = await this.prisma.borrower.findUnique({
      where: { id },
      select: {
        ...BORROWER_SELECT,
        penalties: {
          select: { id: true, status: true, issuedAt: true, clearedAt: true },
        },
      },
    });
    if (!borrower) throw new NotFoundException('Borrower not found');
    return borrower;
  }

  async update(id: number, dto: UpdateBorrowerDto) {
    await this.findOne(id);
    return this.prisma.borrower.update({
      where: { id },
      data: dto,
      select: BORROWER_SELECT,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.borrower.delete({ where: { id } });
    return { message: 'Borrower deleted' };
  }
}
