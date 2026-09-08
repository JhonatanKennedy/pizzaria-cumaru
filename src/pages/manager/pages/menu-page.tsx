import { FeaturePlaceholder } from '@components/FeaturePlaceholder';

export function MenuPage(): React.ReactNode {
  return (
    <FeaturePlaceholder
      title="Cardápio e estoque"
      featureFile="02_menu_and_stock.feature"
      summary="Cadastre, edite, precifique e remova itens e ingredientes do cardápio, e vincule ingredientes aos itens para controlar a disponibilidade."
    />
  );
}
