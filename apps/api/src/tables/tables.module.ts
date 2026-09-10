import { Module } from '@nestjs/common';
import { TABLES_REPOSITORY } from './domain/repositories/tables-repository.js';
import { PrismaTablesRepository } from './infrastructure/prisma-tables-repository.js';
import { TablesController } from './presentation/controllers/tables.controller.js';
import { CreateTableUseCase } from './application/use-cases/create-table.js';
import { ListTablesUseCase } from './application/use-cases/list-tables.js';
import { RenameTableUseCase } from './application/use-cases/rename-table.js';
import { DeleteTableUseCase } from './application/use-cases/delete-table.js';
import { OrdersModule } from '../orders/orders.module.js';

@Module({
  imports: [OrdersModule],
  controllers: [TablesController],
  providers: [
    { provide: TABLES_REPOSITORY, useClass: PrismaTablesRepository },
    CreateTableUseCase,
    ListTablesUseCase,
    RenameTableUseCase,
    DeleteTableUseCase,
  ],
})
export class TablesModule {}
