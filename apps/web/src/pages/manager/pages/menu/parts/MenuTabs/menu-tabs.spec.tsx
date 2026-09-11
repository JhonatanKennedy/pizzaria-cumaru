import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MenuTabs, type TMenuTabId } from './index';

function ControlledTabs(): React.ReactNode {
  const [active, setActive] = useState<TMenuTabId>('items');
  return (
    <MenuTabs active={active} onChange={setActive}>
      <p>{active === 'items' ? 'Lista de itens' : 'Lista de ingredientes'}</p>
    </MenuTabs>
  );
}

function renderTabs(): ReturnType<typeof userEvent.setup> {
  render(<ControlledTabs />);
  return userEvent.setup();
}

describe('MenuTabs', () => {
  it('should mark the active tab and leave the other out of the tab order', () => {
    renderTabs();

    expect(screen.getByRole('tab', { name: 'Itens' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'Ingredientes' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
    expect(screen.getByRole('tab', { name: 'Ingredientes' })).toHaveAttribute(
      'tabindex',
      '-1',
    );
  });

  it('should swap the panel when the other tab is picked', async () => {
    const user = renderTabs();

    await user.click(screen.getByRole('tab', { name: 'Ingredientes' }));

    expect(screen.getByText('Lista de ingredientes')).toBeInTheDocument();
    expect(screen.queryByText('Lista de itens')).not.toBeInTheDocument();
  });

  it('should tie the panel to the tab that opened it', () => {
    renderTabs();

    const panel = screen.getByRole('tabpanel');
    const tab = screen.getByRole('tab', { name: 'Itens' });

    expect(panel).toHaveAttribute('aria-labelledby', tab.id);
    expect(tab).toHaveAttribute('aria-controls', panel.id);
  });

  it('should point every tab at a panel that is in the document', async () => {
    const user = renderTabs();

    // A tab whose aria-controls names an element that is not rendered is a
    // dangling reference, which is what a panel id per tab would produce for
    // whichever tab is not selected.
    for (const tab of screen.getAllByRole('tab')) {
      const controls = tab.getAttribute('aria-controls');
      expect(document.getElementById(controls ?? '')).not.toBeNull();
    }

    await user.click(screen.getByRole('tab', { name: 'Ingredientes' }));

    expect(screen.getByRole('tabpanel')).toHaveAttribute(
      'aria-labelledby',
      screen.getByRole('tab', { name: 'Ingredientes' }).id,
    );
  });

  it('should move to the next tab with the right arrow', async () => {
    const user = renderTabs();

    screen.getByRole('tab', { name: 'Itens' }).focus();
    await user.keyboard('{ArrowRight}');

    expect(screen.getByRole('tab', { name: 'Ingredientes' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('should move to the last tab with the left arrow', async () => {
    const user = renderTabs();

    screen.getByRole('tab', { name: 'Itens' }).focus();
    await user.keyboard('{ArrowLeft}');

    expect(screen.getByRole('tab', { name: 'Ingredientes' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});
