import { useRef } from 'react';

export type TMenuTabId = 'items' | 'ingredients';

interface MenuTabsProps {
  active: TMenuTabId;
  onChange(tab: TMenuTabId): void;
  children: React.ReactNode;
}

const TABS: readonly { id: TMenuTabId; label: string }[] = [
  { id: 'items', label: 'Itens' },
  { id: 'ingredients', label: 'Ingredientes' },
];

function tabId(id: TMenuTabId): string {
  return `menu-tab-${id}`;
}

// One panel, swapped by the tab that is selected — so it carries one id that
// always resolves. A panel id per tab would leave the tab that is not showing
// pointing at an element that is not in the document.
const PANEL_ID = 'menu-tab-panel';

function tabClass(selected: boolean): string {
  // No `outline-none` here: the app-wide focus ring is the one thing that has
  // to survive on a control whose only other cue is a colour change.
  const shared = '-mb-px border-b-2 px-1 pb-2 text-sm transition-colors';
  return selected
    ? `${shared} border-red-700 font-semibold text-red-700`
    : `${shared} border-transparent font-medium text-stone-600 hover:text-stone-900`;
}

// Switching between the menu and its ingredients is navigation, not a filter,
// and the two used to render as the same red pill — one row apart from the
// category chips that narrow the list below. An underlined tab bar is the
// control that says "this replaces the content"; the pill is left to mean
// "this narrows it". The panel ships with the bar so the tab/panel pairing
// cannot drift.
export function MenuTabs({
  active,
  onChange,
  children,
}: MenuTabsProps): React.ReactNode {
  const tabRefs = useRef<Record<TMenuTabId, HTMLButtonElement | null>>({
    items: null,
    ingredients: null,
  });

  const moveTo = (id: TMenuTabId): void => {
    onChange(id);
    tabRefs.current[id]?.focus();
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
  ): void => {
    const current = TABS.findIndex((tab) => tab.id === active);
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      moveTo(TABS[(current + 1) % TABS.length].id);
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      moveTo(TABS[(current - 1 + TABS.length) % TABS.length].id);
    }
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label="Seções do cardápio"
        className="flex gap-6 border-b border-stone-200"
      >
        {TABS.map((tab) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                tabRefs.current[tab.id] = node;
              }}
              id={tabId(tab.id)}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={PANEL_ID}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab.id)}
              onKeyDown={handleKeyDown}
              className={tabClass(selected)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        id={PANEL_ID}
        role="tabpanel"
        aria-labelledby={tabId(active)}
        className="mt-4"
      >
        {children}
      </div>
    </div>
  );
}
