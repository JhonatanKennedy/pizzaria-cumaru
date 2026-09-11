import { Link } from 'react-router';

interface HubCard {
  title: string;
  description: string;
  to: string;
}

interface HubSection {
  heading: string;
  cards: readonly HubCard[];
}

// The manager's only page. Everything else is reached from here, which is why
// each card states what the screen is for in the manager's own terms and none
// of them cites a spec file: the Gherkin lives in the repo, not in the UI.
const HUB_SECTIONS: readonly HubSection[] = [
  {
    heading: 'Salão e cozinha',
    cards: [
      {
        title: 'Painel do Garçom',
        description:
          'Abra mesas, lance itens e acompanhe o que já foi para a cozinha.',
        to: '/waiter',
      },
      {
        title: 'Painel da Cozinha',
        description: 'A fila de preparo, na ordem em que os pedidos chegaram.',
        to: '/kitchen',
      },
    ],
  },
  {
    heading: 'Gestão',
    cards: [
      {
        title: 'Cardápio e estoque',
        description: 'Itens do cardápio, ingredientes e o que está em falta.',
        to: '/manager/menu',
      },
      {
        title: 'Pedidos de entrega',
        description:
          'Pedidos recebidos pelo WhatsApp e o andamento de cada um.',
        to: '/manager/delivery',
      },
      {
        title: 'Gerenciar mesas',
        description: 'Cadastre, renumere e remova as mesas do salão.',
        to: '/manager/tables',
      },
      {
        title: 'Relatório de Ganhos Diários',
        description:
          'Totais do dia e vendas concluídas, com filtros por tipo e pagamento.',
        to: '/reports/daily-earnings',
      },
    ],
  },
];

function ChevronRight(): React.ReactNode {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5 shrink-0 self-center text-stone-400 transition-transform group-hover:translate-x-0.5 group-hover:text-red-700"
    >
      <path d="M8 5l5 5-5 5" />
    </svg>
  );
}

export function ManagerPage(): React.ReactNode {
  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900">Painel do Gerente</h1>
      <p className="mt-1 text-stone-600">
        Acesso total ao sistema — salão, cozinha, cardápio, entregas e
        relatórios.
      </p>
      <div className="mt-8 space-y-8">
        {HUB_SECTIONS.map((section) => (
          <section key={section.heading}>
            <h2 className="text-sm font-semibold tracking-wide text-stone-600 uppercase">
              {section.heading}
            </h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {section.cards.map((card) => (
                <Link
                  key={card.to}
                  to={card.to}
                  className="card group flex justify-between items-start gap-4 transition-colors hover:border-red-300 hover:shadow-md focus-visible:ring-2 focus-visible:ring-red-600/40 focus-visible:outline-none"
                >
                  <span className="min-w-0">
                    <span className="block font-semibold text-stone-900">
                      {card.title}
                    </span>
                    <span className="mt-1 block text-sm text-stone-600">
                      {card.description}
                    </span>
                  </span>
                  <ChevronRight />
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
