import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { LoadingRegion } from '@components/LoadingRegion';
import { Skeleton } from '@components/Skeleton';
import { toErrorMessage } from '@lib/errors';
import { formatTime } from '@lib/format';
import type { IOverviewLine } from '../business/service-overview';
import { serviceOverview } from '../business/service-overview';
import { useMenu } from '../hooks/use-menu';
import { useOrders } from '../hooks/use-orders';
import { useTables } from '../hooks/use-tables';

interface OverviewLineProps {
  line: IOverviewLine;
  // The read that feeds this line, when it has failed. An area with no data and
  // an area with nothing happening look identical, and only one of them is the
  // truth — so the reason takes the slot the state sentence would have had.
  error: Error | null;
  isPending: boolean;
}

// The name is the door: the line summarises a screen, and this is how the
// manager stops summarising it and goes there.
const DOOR_CLASS =
  'shrink-0 rounded text-sm font-semibold text-stone-900 underline-offset-4 transition-colors hover:text-red-700 hover:underline focus-visible:ring-2 focus-visible:ring-red-600/40 focus-visible:outline-none sm:w-24';

const LOOK_CLASS =
  'rounded text-stone-600 underline-offset-4 transition-colors hover:text-stone-900 hover:underline focus-visible:ring-2 focus-visible:ring-red-600/40 focus-visible:outline-none';

const LINE_CLASS = 'flex flex-wrap items-baseline gap-x-4 gap-y-0.5 px-4 py-3';

// A duration is what the manager reads at a glance — "há 40 min" answers the
// question where "20:05" makes her subtract. But a duration is only true while
// the clock moves, so the board re-renders on a slow tick and the ages stay
// honest while the hub sits open on the counter. A tick is not a request, which
// is exactly what this screen is trying not to spend.
const AGE_TICK_MS = 30 * 1000;

function useNow(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), AGE_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  return now;
}

// The oldest of the screen's reads, because the board is only as fresh as its
// stalest part. With no poll running this is the line that tells the manager
// whether she is looking at the service or at a photograph of it — the one
// thing a screen that does not refresh itself owes the person reading it.
function lastReadAt(readTimes: readonly number[]): string | null {
  const landed = readTimes.filter((timestamp) => timestamp > 0);
  if (landed.length === 0) {
    return null;
  }
  const oldest = new Date(Math.min(...landed));
  return formatTime(oldest.toISOString());
}

function OverviewLine({
  line,
  error,
  isPending,
}: OverviewLineProps): React.ReactNode {
  const look = line.look;

  return (
    <div className={LINE_CLASS}>
      <dt>
        <Link to={line.to} className={DOOR_CLASS}>
          {line.label}
        </Link>
      </dt>
      <dd className="min-w-0 text-sm text-stone-600 sm:flex-1">
        {error !== null && (
          <span role="alert" className="text-red-700">
            {toErrorMessage(error)}
          </span>
        )}
        {error === null && isPending && (
          <LoadingRegion>
            <Skeleton className="h-5 w-40" />
          </LoadingRegion>
        )}
        {error === null && !isPending && (
          <span className="tabular-nums">{line.state}</span>
        )}
      </dd>
      {look !== null && (
        <dd className="min-w-0 text-sm">
          {look.to === null ? (
            <span className="text-stone-500">{look.text}</span>
          ) : (
            <Link to={look.to} className={LOOK_CLASS}>
              {look.text}
            </Link>
          )}
        </dd>
      )}
    </div>
  );
}

// The manager's front door: the four parts of the service she acts on, each in
// one line — what it is doing, and the one thing in it that has been waiting
// longest. Not a list of records: a board that listed them would fill up as the
// shift went on, and the lists are one click away under their own names.
export function ManagerPage(): React.ReactNode {
  const tablesQuery = useTables();
  const ordersQuery = useOrders();
  const menuQuery = useMenu();
  const [refreshing, setRefreshing] = useState(false);
  const now = useNow();

  const sources = {
    tables: tablesQuery.data,
    orders: ordersQuery.data,
    menu: menuQuery.data,
  };
  const overview = serviceOverview(sources, now);
  const updatedAt = lastReadAt([
    tablesQuery.dataUpdatedAt,
    ordersQuery.dataUpdatedAt,
    menuQuery.dataUpdatedAt,
  ]);

  // The button reports the tap the manager just made, not the ambient state —
  // nothing refetches behind her, so a label that swapped on its own would mean
  // something had gone wrong.
  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    try {
      await Promise.all([
        tablesQuery.refetch(),
        ordersQuery.refetch(),
        menuQuery.refetch(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">
            Painel do Gerente
          </h1>
          {updatedAt !== null && (
            <p className="mt-1 text-sm text-stone-600 tabular-nums">
              Atualizado às {updatedAt}
            </p>
          )}
        </div>
        <Button
          variant="secondary"
          className="px-4 py-2.5 text-sm"
          disabled={refreshing}
          onClick={() => {
            void handleRefresh();
          }}
        >
          {refreshing ? 'Atualizando…' : 'Atualizar'}
        </Button>
      </div>

      <Card className="mt-6 overflow-hidden p-0">
        <dl className="divide-y divide-stone-100">
          <OverviewLine
            line={overview.floor}
            error={tablesQuery.error ?? ordersQuery.error}
            isPending={tablesQuery.isPending || ordersQuery.isPending}
          />
          <OverviewLine
            line={overview.kitchen}
            error={ordersQuery.error}
            isPending={ordersQuery.isPending}
          />
          <OverviewLine
            line={overview.deliveries}
            error={ordersQuery.error}
            isPending={ordersQuery.isPending}
          />
          <OverviewLine
            line={overview.menu}
            error={menuQuery.error}
            isPending={menuQuery.isPending}
          />
        </dl>
      </Card>
    </div>
  );
}
