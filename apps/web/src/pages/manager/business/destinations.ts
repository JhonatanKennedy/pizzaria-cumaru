export interface IManagerDestination {
  to: string;
  label: string;
  // Exact matching, for a destination that is a prefix of every other one in
  // the rail: without it the hub would read as current on all five screens.
  end?: boolean;
}

export interface IManagerDestinationGroup {
  heading: string;
  destinations: readonly IManagerDestination[];
}

// The hub stands above the rail's groups rather than in one: it is where the
// manager already is, and the heading over it would only say so twice.
export const MANAGER_HOME: IManagerDestination = {
  to: '/manager',
  label: 'Painel do Gerente',
  end: true,
};

// Every other screen the manager context owns, under the same two headings the
// hub used to group them by. The rail is wayfinding, so each entry is the
// screen's name and nothing more — what a screen is for is said on the screen.
export const MANAGER_DESTINATION_GROUPS: readonly IManagerDestinationGroup[] = [
  {
    heading: 'Painéis da equipe',
    destinations: [
      { to: '/waiter', label: 'Painel do Garçom' },
      { to: '/kitchen', label: 'Painel da Cozinha' },
    ],
  },
  {
    heading: 'Gestão',
    destinations: [
      { to: '/manager/menu', label: 'Cardápio e estoque' },
      { to: '/manager/delivery', label: 'Pedidos de entrega' },
      { to: '/manager/tables', label: 'Gerenciar mesas' },
      { to: '/reports/daily-earnings', label: 'Relatório de Ganhos Diários' },
    ],
  },
];
