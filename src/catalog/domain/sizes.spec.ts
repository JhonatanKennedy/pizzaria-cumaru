import { pizzaSizeOf, sizeCanvasOf } from './sizes.js';

describe('pizza sizes', () => {
  it('should map the G and M tokens to their fatia canvases', () => {
    expect(sizeCanvasOf('Mussarela G')).toBe(8);
    expect(sizeCanvasOf('Mussarela M')).toBe(6);
  });

  it('should recognize the trailing size token of a pizza name', () => {
    expect(pizzaSizeOf('Calabresa G')).toBe('G');
    expect(pizzaSizeOf('Calabresa M')).toBe('M');
  });

  it('should return null for token-less names', () => {
    expect(pizzaSizeOf('Mussarela')).toBeNull();
    expect(pizzaSizeOf('XG')).toBeNull();
    expect(pizzaSizeOf('Pizza G ')).toBeNull();
    expect(sizeCanvasOf('Mussarela')).toBeNull();
  });
});
