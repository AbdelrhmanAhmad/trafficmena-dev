import { API_BASE, fetchJson } from './client';

export type PromoCodeRecord = {
  id: string;
  code: string;
  target_type: 'track' | 'event';
  target_id: string;
  target_name: string;
  discount_percent: number;
  starts_at: string;
  ends_at: string;
  created_at: string;
  usage_count: number;
  is_active: boolean;
};

type ApiPromoCode = {
  id: string;
  code: string;
  targetType: 'track' | 'event';
  targetId: string;
  targetName: string;
  discountPercent: number;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  usageCount: number;
  isActive: boolean;
};

const mapPromoCode = (promo: ApiPromoCode): PromoCodeRecord => ({
  id: promo.id,
  code: promo.code,
  target_type: promo.targetType,
  target_id: promo.targetId,
  target_name: promo.targetName,
  discount_percent: promo.discountPercent,
  starts_at: promo.startsAt,
  ends_at: promo.endsAt,
  created_at: promo.createdAt,
  usage_count: promo.usageCount,
  is_active: promo.isActive,
});

export type CreatePromoCodePayload = {
  code: string;
  targetType: 'track' | 'event';
  targetId: string;
  discountPercent: number;
  startsAt: string;
  endsAt: string;
};

export type UpdatePromoCodePayload = {
  discountPercent: number;
  startsAt: string;
  endsAt: string;
};

export async function fetchPromoCodes(): Promise<PromoCodeRecord[]> {
  const response = await fetchJson<{ data: ApiPromoCode[] }>(`${API_BASE}/promo-codes`, {
    method: 'GET',
  });
  return response.data.map(mapPromoCode);
}

export async function fetchPromoCode(id: string): Promise<PromoCodeRecord> {
  const response = await fetchJson<{ data: ApiPromoCode }>(`${API_BASE}/promo-codes/${id}`, {
    method: 'GET',
  });
  return mapPromoCode(response.data);
}

export async function createPromoCode(payload: CreatePromoCodePayload): Promise<PromoCodeRecord> {
  const response = await fetchJson<{ data: ApiPromoCode }>(`${API_BASE}/promo-codes`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return mapPromoCode(response.data);
}

export async function updatePromoCode(
  id: string,
  payload: UpdatePromoCodePayload,
): Promise<PromoCodeRecord> {
  const response = await fetchJson<{ data: ApiPromoCode }>(`${API_BASE}/promo-codes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return mapPromoCode(response.data);
}

export async function deletePromoCode(id: string): Promise<void> {
  await fetchJson(`${API_BASE}/promo-codes/${id}`, { method: 'DELETE' });
}
