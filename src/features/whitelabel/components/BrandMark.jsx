import { useEffect } from 'react';
import { Home } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { cn } from '../../../lib/cn';
import { useLoginBranding, useSocietyBranding } from '../api';
import { appNameOf, applyBrandColour, brandQuery } from '../brand';

// Logo (or the house icon) and app name.
export function BrandMark({ brand, className }) {
  return (
    <span className={cn('flex min-w-0 items-center gap-2', className)}>
      {brand?.reseller && brand.logoUrl ? <img src={brand.logoUrl} alt="" className="size-7 shrink-0 rounded object-contain" /> : <Home className="size-6 shrink-0" />}
      <span className="truncate">{appNameOf(brand)}</span>
    </span>
  );
}

// Applies a brand's colour while mounted, and restores ColonyHub's afterwards.
export function useBrandColour(brand) {
  const colour = brand?.reseller ? brand.primaryColor : null;
  useEffect(() => {
    applyBrandColour(colour);
    if (colour) return () => applyBrandColour(null);
    return undefined;
  }, [colour]);
}

// Sidebar header inside the app: the open society's reseller brand, ColonyHub otherwise.
export function SidebarBrand() {
  const { user } = useAuth();
  const { data: brand } = useSocietyBranding(Boolean(user?.society));
  useBrandColour(brand);
  return <BrandMark brand={brand} />;
}

// Login / register pages: brand from ?brand=<slug> or the custom domain the app is served on.
export function useLoginBrand() {
  const { data: brand } = useLoginBranding(brandQuery());
  useBrandColour(brand);
  return brand?.reseller ? brand : null;
}

export function LoginBrandBanner({ brand }) {
  if (!brand) return null;
  return (
    <div className="mb-6 flex items-center gap-3 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
      <BrandMark brand={brand} className="text-lg font-semibold text-brand-700" />
      {(brand.supportEmail || brand.supportPhone) && <span className="ml-auto hidden text-xs text-slate-500 sm:block">Help: {brand.supportEmail || brand.supportPhone}</span>}
    </div>
  );
}
