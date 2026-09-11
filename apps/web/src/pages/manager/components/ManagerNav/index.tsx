import { NavLink } from 'react-router';
import {
  MANAGER_DESTINATION_GROUPS,
  MANAGER_HOME,
} from '../../business/destinations';

interface ManagerNavProps {
  className?: string;
}

// Resting is plain muted text. The current screen carries weight and the brand
// red on top of the aria-current NavLink sets, because colour on its own is not
// a state — and at lg the label may wrap, so the column is 13rem rather than a
// guess at the longest name.
const ITEM_CLASS =
  'block rounded-md px-3 py-1.5 text-sm whitespace-nowrap text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 focus-visible:ring-2 focus-visible:ring-red-600/40 focus-visible:outline-none lg:whitespace-normal';

const CURRENT_CLASS = 'font-semibold text-red-700 hover:text-red-700';

const LIST_CLASS = 'flex gap-1 lg:flex-col lg:gap-0';

function itemClass({ isActive }: { isActive: boolean }): string {
  return isActive ? `${ITEM_CLASS} ${CURRENT_CLASS}` : ITEM_CLASS;
}

// The manager area's rail — the only <nav> in the app, and pure wayfinding: it
// names the screens and counts nothing. Beside the overview a count would print
// the same number twice on the one screen where both are visible.
//
// Below lg it is a single horizontal strip instead of a column, so every screen
// stays reachable on a phone; the group headings are dropped there, where a
// wrapped strip has no room to separate them.
export function ManagerNav({
  className = '',
}: ManagerNavProps): React.ReactNode {
  return (
    <nav
      aria-label="Painel do Gerente"
      className={`min-w-0 overflow-x-auto pb-1 lg:overflow-visible lg:pb-0 ${className}`.trim()}
    >
      <div className="flex w-max items-center gap-1 lg:w-auto lg:flex-col lg:items-stretch lg:gap-0">
        <ul className={LIST_CLASS}>
          <li>
            <NavLink
              to={MANAGER_HOME.to}
              end={MANAGER_HOME.end}
              className={itemClass}
            >
              {MANAGER_HOME.label}
            </NavLink>
          </li>
        </ul>
        {MANAGER_DESTINATION_GROUPS.map((group) => (
          <div key={group.heading} className="flex gap-1 lg:mt-5 lg:block">
            <h2 className="hidden px-3 text-xs font-semibold tracking-wide text-stone-500 uppercase lg:mb-1 lg:block">
              {group.heading}
            </h2>
            <ul className={LIST_CLASS}>
              {group.destinations.map((destination) => (
                <li key={destination.to}>
                  <NavLink to={destination.to} className={itemClass}>
                    {destination.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
