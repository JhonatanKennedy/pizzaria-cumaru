import type { TTableListingEntry } from '@api/tables.api';
import { ConfirmDialog } from '../../../../components/ConfirmDialog';
import { useDeleteTable } from '../../../../hooks/use-delete-table';

interface RemoveTableDialogProps {
  table: TTableListingEntry;
  onClose: () => void;
}

export function RemoveTableDialog({
  table,
  onClose,
}: RemoveTableDialogProps): React.ReactNode {
  const deleteTableMutation = useDeleteTable();

  return (
    <ConfirmDialog
      title="Remover mesa"
      message={`A mesa ${table.number} será removida.`}
      confirmLabel="Remover"
      onConfirm={() => deleteTableMutation.mutateAsync(table.id)}
      onClose={onClose}
    />
  );
}
