import { Link } from 'react-router';
import { Card } from '../../../../components/Card';

interface AccessDeniedProps {
  homePath: string;
}

export function AccessDenied({ homePath }: AccessDeniedProps): React.ReactNode {
  return (
    <Card className="mx-auto max-w-md text-center">
      <h1 className="text-xl font-bold text-stone-900">Acesso negado</h1>
      <p className="mt-2 text-stone-600" role="alert">
        Acesso não autorizado para o seu perfil
      </p>
      <Link to={homePath} className="btn-primary mt-6 inline-block">
        Voltar ao meu painel
      </Link>
    </Card>
  );
}
