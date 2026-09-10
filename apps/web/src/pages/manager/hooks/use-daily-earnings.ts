import { useQuery } from '@tanstack/react-query';
import {
  dailyEarningsQueryKey,
  getDailyEarningsReport,
  type TReportType,
} from '../api/reports.api';

export function useDailyEarnings(type?: TReportType) {
  return useQuery({
    queryKey: dailyEarningsQueryKey(type),
    queryFn: () => getDailyEarningsReport(type),
  });
}
