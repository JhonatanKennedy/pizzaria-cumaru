import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchField } from './index';

// The field is controlled, so the harness owns the value the way a screen does.
function ControlledSearchField({
  initial = '',
}: {
  initial?: string;
}): React.ReactNode {
  const [value, setValue] = useState(initial);
  return (
    <SearchField
      id="item-search"
      label="Buscar item"
      placeholder="Buscar item"
      value={value}
      onChange={setValue}
    />
  );
}

function renderField(
  initial = '',
): ReturnType<typeof userEvent.setup> & { field: HTMLElement } {
  render(<ControlledSearchField initial={initial} />);
  return Object.assign(userEvent.setup(), {
    field: screen.getByLabelText('Buscar item'),
  });
}

describe('SearchField', () => {
  it('should offer a labelled field and a placeholder', () => {
    const user = renderField();

    expect(user.field).toHaveAttribute('placeholder', 'Buscar item');
  });

  it('should report every keystroke', async () => {
    const user = renderField();

    await user.type(user.field, 'cal');

    expect(user.field).toHaveValue('cal');
  });

  it('should offer no clear control while the field is empty', () => {
    renderField();

    expect(
      screen.queryByRole('button', { name: 'Limpar busca' }),
    ).not.toBeInTheDocument();
  });

  it('should offer a clear control once something is typed', async () => {
    const user = renderField();

    await user.type(user.field, 'cal');

    expect(
      screen.getByRole('button', { name: 'Limpar busca' }),
    ).toBeInTheDocument();
  });

  it('should empty the field from the clear control', async () => {
    const user = renderField('calabresa');

    await user.click(screen.getByRole('button', { name: 'Limpar busca' }));

    expect(user.field).toHaveValue('');
    expect(
      screen.queryByRole('button', { name: 'Limpar busca' }),
    ).not.toBeInTheDocument();
  });
});
