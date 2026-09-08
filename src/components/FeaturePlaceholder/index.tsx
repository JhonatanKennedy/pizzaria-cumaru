import { Card } from '../Card';

interface FeaturePlaceholderProps {
  title: string;
  featureFile: string;
  summary: string;
}

export function FeaturePlaceholder({
  title,
  featureFile,
  summary,
}: FeaturePlaceholderProps): React.ReactNode {
  return (
    <Card>
      <h1 className="text-xl font-bold text-stone-900">{title}</h1>
      <p className="mt-2 text-stone-600">{summary}</p>
      <div className="mt-6 flex items-center gap-3 text-sm">
        <span className="rounded-full bg-stone-200 px-2 py-0.5 font-medium text-stone-700">
          Em breve na próxima iteração
        </span>
        <span className="text-stone-500">Spec: features/{featureFile}</span>
      </div>
    </Card>
  );
}
