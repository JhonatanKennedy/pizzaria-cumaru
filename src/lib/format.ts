export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatTime(timeValue: string): string {
  const time = new Date(timeValue);
  if (Number.isNaN(time.getTime())) {
    return '';
  }
  return time.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
