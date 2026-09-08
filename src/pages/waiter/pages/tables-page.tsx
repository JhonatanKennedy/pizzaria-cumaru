import { FeaturePlaceholder } from '../../../components/FeaturePlaceholder';

export function TablesPage(): React.ReactNode {
  return (
    <FeaturePlaceholder
      title="Pedidos de mesa"
      featureFile="03_table_order.feature"
      summary="Abra um pedido por mesa, adicione itens com sabores e observações e acompanhe o status de preparo de cada item."
    />
  );
}
