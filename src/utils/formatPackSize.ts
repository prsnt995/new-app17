export const PACK_SIZE_PRESETS = [
  '100 g','250 g','500 g','750 g','1 kg','1.5 kg','2 kg','5 kg','10 kg',
  '1 Pack','2 Pack','5 Pack','10 Pack','Box','Tin','Packet','Bottle','Custom',
] as const;

export const ORIGIN_OPTIONS = ['India','Nepal','India / Nepal','South Korea','Other'] as const;

export function deriveWeightKg(size: string, fallback: number): number {
  if (!size) return fallback;
  const s = size.toLowerCase().trim();
  const num = parseFloat(s);
  if (isNaN(num)) return fallback;
  if (s.includes('kg')) return num;
  if (s.includes(' g') || s.endsWith('g')) return num / 1000;
  if (s.includes('ml')) return num / 1000;
  if (s.includes(' l')) return num;
  return fallback;
}

export function formatPackSize(product: { size?: string; weightKg?: number }): string {
  const size = (product.size || '').trim();
  if (size) return size;
  if (product.weightKg) return product.weightKg >= 1 ? `${product.weightKg} kg` : `${Math.round(product.weightKg * 1000)} g`;
  return '1 Pack';
}

export function formatWeightLabel(weightKg?: number): string | null {
  if (!weightKg || weightKg <= 0) return null;
  if (weightKg < 1) return `${Math.round(weightKg * 1000)} g`;
  return `${weightKg} kg`;
}
