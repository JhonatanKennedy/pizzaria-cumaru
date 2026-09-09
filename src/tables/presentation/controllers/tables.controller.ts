import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateTableDto } from '../dtos/create-table.dto.js';
import { UpdateTableDto } from '../dtos/update-table.dto.js';
import { CreateTableUseCase } from '../../application/use-cases/create-table.js';
import { ListTablesUseCase } from '../../application/use-cases/list-tables.js';
import { RenameTableUseCase } from '../../application/use-cases/rename-table.js';
import { DeleteTableUseCase } from '../../application/use-cases/delete-table.js';
import { Roles } from '../../../common/guards/roles.guard.js';
import { EUserRole } from '../../../users/domain/enums/user-role.js';

@Controller('/tables')
export class TablesController {
  constructor(
    private readonly createTableUseCase: CreateTableUseCase,
    private readonly listTablesUseCase: ListTablesUseCase,
    private readonly renameTableUseCase: RenameTableUseCase,
    private readonly deleteTableUseCase: DeleteTableUseCase,
  ) {}

  @Roles({ roles: [EUserRole.WAITER, EUserRole.MANAGER] })
  @Get()
  list() {
    return this.listTablesUseCase.execute();
  }

  @Roles({ roles: [EUserRole.MANAGER] })
  @Post()
  create(@Body() dto: CreateTableDto) {
    return this.createTableUseCase.execute(dto);
  }

  @Roles({ roles: [EUserRole.MANAGER] })
  @Patch(':tableId')
  rename(@Param('tableId') tableId: string, @Body() dto: UpdateTableDto) {
    return this.renameTableUseCase.execute({ tableId, number: dto.number });
  }

  @Roles({ roles: [EUserRole.MANAGER] })
  @Delete(':tableId')
  remove(@Param('tableId') tableId: string) {
    return this.deleteTableUseCase.execute(tableId);
  }
}
