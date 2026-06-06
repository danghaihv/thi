export type CheckoutPack = { amount: number; days: number; name: string };

export function getExpectedPack(pricing: { vip1MonthPrice: number; vip6MonthPrice: number; vip1YearPrice: number }, packType: '1m' | '6m' | '1y'): CheckoutPack {
  return packType === '1m'
    ? { amount: pricing.vip1MonthPrice, days: 30, name: 'VIP 1 tháng' }
    : packType === '6m'
    ? { amount: pricing.vip6MonthPrice, days: 180, name: 'VIP 6 tháng' }
    : { amount: pricing.vip1YearPrice, days: 365, name: 'VIP 1 năm' };
}

export function getPlanCode(packType: '1m' | '6m' | '1y') {
  return packType === '1m' ? 'vip_1m' : packType === '6m' ? 'vip_6m' : 'vip_1y';
}
