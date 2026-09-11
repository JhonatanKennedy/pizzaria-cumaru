import { Card } from '../Card';

interface FeaturePlaceholderProps {
  title: string;
  summary: string;
}

export function FeaturePlaceholder({
  title,
  summary,
}: FeaturePlaceholderProps): React.ReactNode {
  return (
    <Card>
      <h1 className="text-xl font-bold text-stone-900">{title}</h1>
      <p className="mt-2 text-stone-600">{summary}</p>
      <div className="mt-6">
        <span className="rounded-full bg-stone-200 px-2 py-0.5 text-sm font-medium text-stone-700">
          Em breve na próxima iteração
        </span>
      </div>
    </Card>
  );
}
