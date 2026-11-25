export type ServiceProvider = {
  id: string;
  full_name: string;
  phone?: string | null;
  category: string;
  area_name: string;
  city?: string | null;
  has_priority_plan?: boolean | null;
  priority_status?: string | null;
  priority_until?: string | null;
  created_at?: string | null;
};

function normalize(val?: string | null): string {
  return (val || '').trim().toLowerCase();
}

export function isActivePriority(provider: ServiceProvider, nowMs = Date.now()): boolean {
  if (!provider.has_priority_plan) return false;
  if (normalize(provider.priority_status) !== 'active') return false;
  if (!provider.priority_until) return true;

  const expiryMs = new Date(provider.priority_until).getTime();
  return !Number.isNaN(expiryMs) && expiryMs > nowMs;
}

export function rankProvidersByAreaAndCategory(
  providers: ServiceProvider[],
  selectedArea: string,
  selectedCategory: string
): ServiceProvider[] {
  const area = normalize(selectedArea);
  const category = normalize(selectedCategory);
  const nowMs = Date.now();

  const scoreProvider = (p: ServiceProvider): number => {
    const pArea = normalize(p.area_name);
    const pCategory = normalize(p.category);
    const areaMatch = area ? pArea === area || pArea.includes(area) : true;
    const categoryMatch = category ? pCategory === category || pCategory.includes(category) : true;
    const activePriority = isActivePriority(p, nowMs);

    // Tier 1: Exact/matching area + matching category + active priority plan (TOP OF SUGGESTIONS)
    if (areaMatch && categoryMatch && activePriority) return 100;

    // Tier 2: Matching area + matching category (regular)
    if (areaMatch && categoryMatch) return 80;

    // Tier 3: Matching category in other areas + active priority
    if (categoryMatch && activePriority) return 60;

    // Tier 4: Matching category in other areas (regular)
    if (categoryMatch) return 40;

    // Tier 5: Matching area for other categories + active priority
    if (areaMatch && activePriority) return 30;

    // Tier 6: Remaining providers
    return 10;
  };

  return [...providers].sort((a, b) => {
    const diff = scoreProvider(b) - scoreProvider(a);
    if (diff !== 0) return diff;

    // Tie-breaker: newer registration slightly ahead
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bTime - aTime;
  });
}
