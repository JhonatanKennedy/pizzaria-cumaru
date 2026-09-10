import { Card } from '@components/Card';

export function NotFoundPage(): React.ReactNode {
  return (
    <Card className="mx-auto max-w-md text-center">
      <h1 className="text-xl font-bold text-stone-900">
        Página não encontrada
      </h1>
    </Card>
  );
}
