import { FeaturePlaceholder } from '../../../components/FeaturePlaceholder';

export function DeliveryPage(): React.ReactNode {
  return (
    <FeaturePlaceholder
      title="Pedidos de entrega"
      featureFile="04_delivery_order.feature"
      summary="Crie pedidos de entrega a partir de mensagens do WhatsApp com nome, telefone e endereço do cliente, e acompanhe o ciclo até a entrega."
    />
  );
}
