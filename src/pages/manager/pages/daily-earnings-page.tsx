import { FeaturePlaceholder } from '@components/FeaturePlaceholder';

export function DailyEarningsPage(): React.ReactNode {
  return (
    <FeaturePlaceholder
      title="Relatório de Ganhos Diários"
      featureFile="07_manager_profile.feature"
      summary="Total geral do dia com os totais de pedidos locais e de entrega, filtrável por tipo de pedido."
    />
  );
}
