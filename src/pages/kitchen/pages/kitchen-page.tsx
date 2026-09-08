import { FeaturePlaceholder } from '@components/FeaturePlaceholder';

export function KitchenPage(): React.ReactNode {
  return (
    <FeaturePlaceholder
      title="Painel da Cozinha"
      featureFile="06_cook_profile.feature"
      summary="Duas filas por ordem de chegada — Entrega e Local — mostrando apenas itens que exigem preparo, com ações de iniciar, finalizar e cancelar."
    />
  );
}
