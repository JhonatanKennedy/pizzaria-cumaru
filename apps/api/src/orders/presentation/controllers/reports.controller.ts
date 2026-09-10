import { Controller, Get, Query } from '@nestjs/common';
import { GetDailyEarningsReportUseCase } from '../../application/use-cases/get-daily-earnings-report.js';
import { ListDaySalesUseCase } from '../../application/use-cases/list-day-sales.js';
import { EOrderType } from '../../domain/enums/order-type.js';
import { Roles } from '../../../common/guards/roles.guard.js';
import { EUserRole } from '../../../users/domain/enums/user-role.js';

@Controller('/reports')
export class ReportsController {
  constructor(
    private readonly getDailyEarningsReportUseCase: GetDailyEarningsReportUseCase,
    private readonly listDaySalesUseCase: ListDaySalesUseCase,
  ) {}

  @Roles({ roles: [EUserRole.MANAGER] })
  @Get('daily-earnings')
  dailyEarnings(@Query('type') type?: string) {
    const filter =
      type === EOrderType.LOCAL || type === EOrderType.DELIVERY
        ? (type as EOrderType)
        : undefined;
    return this.getDailyEarningsReportUseCase.execute(new Date(), filter);
  }

  @Roles({ roles: [EUserRole.MANAGER] })
  @Get('daily-sales')
  daySales() {
    return this.listDaySalesUseCase.execute(new Date());
  }
}
