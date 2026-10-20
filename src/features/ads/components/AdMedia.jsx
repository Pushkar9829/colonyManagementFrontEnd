import { cn } from '../../../lib/cn';
import { prefersReducedMotion } from '../lib';

// Image, or a muted looping video. With "reduce motion" on, videos don't autoplay (the poster / first frame shows
// and the person can press play when controls are on).
export function AdMedia({ ad, className, controls = false }) {
  if (ad.mediaType === 'video') {
    const still = prefersReducedMotion();
    return (
      <video className={cn('bg-slate-900 object-cover', className)} src={ad.media.url} poster={ad.poster?.url} muted loop playsInline
        autoPlay={!still} controls={controls || still} preload="metadata" aria-label={ad.title} />
    );
  }
  return <img className={cn('object-cover', className)} src={ad.media.url} alt="" loading="lazy" />;
}
