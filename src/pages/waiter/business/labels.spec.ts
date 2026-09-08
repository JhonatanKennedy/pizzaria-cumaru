import { categoryLabel, itemStatusLabel, orderStatusLabel } from './labels';

describe('categoryLabel', () => {
  it('should map every known category to its Portuguese label', () => {
    expect(categoryLabel('PIZZA')).toBe('Pizzas');
    expect(categoryLabel('DISH')).toBe('Pratos');
    expect(categoryLabel('DRINK')).toBe('Bebidas');
    expect(categoryLabel('DESSERT')).toBe('Sobremesas');
    expect(categoryLabel('SIDE')).toBe('Acompanhamentos');
  });

  it('should fall back to the raw value for unknown categories', () => {
    expect(categoryLabel('NOVELTY')).toBe('NOVELTY');
  });
});

describe('orderStatusLabel', () => {
  it('should map every known order status to its Portuguese label', () => {
    expect(orderStatusLabel('Open')).toBe('Aberta');
    expect(orderStatusLabel('Closed')).toBe('Fechada');
    expect(orderStatusLabel('Preparing')).toBe('Preparando');
    expect(orderStatusLabel('Out for delivery')).toBe('Saiu para entrega');
    expect(orderStatusLabel('Delivered')).toBe('Entregue');
  });

  it('should fall back to the raw value for unknown statuses', () => {
    expect(orderStatusLabel('Weird')).toBe('Weird');
  });
});

describe('itemStatusLabel', () => {
  it('should map every known item status to its Portuguese label', () => {
    expect(itemStatusLabel('Pending')).toBe('Pendente');
    expect(itemStatusLabel('Preparing')).toBe('Preparando');
    expect(itemStatusLabel('Ready')).toBe('Pronto');
  });

  it('should return an empty string for items without a status', () => {
    expect(itemStatusLabel(null)).toBe('');
  });

  it('should fall back to the raw value for unknown statuses', () => {
    expect(itemStatusLabel('Baking')).toBe('Baking');
  });
});
