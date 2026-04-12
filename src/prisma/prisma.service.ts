import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly _client: PrismaClient;

  constructor() {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
    this._client = new PrismaClient({ adapter });
  }

  get admin() {
    return this._client.admin;
  }

  get borrower() {
    return this._client.borrower;
  }

  get item() {
    return this._client.item;
  }

  get borrowedItem() {
    return this._client.borrowedItem;
  }

  get penalty() {
    return this._client.penalty;
  }

  get $transaction() {
    return this._client.$transaction.bind(this._client);
  }

  async onModuleInit() {
    await this._client.$connect();
  }

  async onModuleDestroy() {
    await this._client.$disconnect();
  }
}
