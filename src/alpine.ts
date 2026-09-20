import type { Alpine } from 'alpinejs';
import intersect from '@alpinejs/intersect';
import { charSearchComponent } from '@/components/xml-viewer/char-search-component';

export default function setupAlpine(Alpine: Alpine) {
  Alpine.plugin(intersect);
  Alpine.data('charSearch', charSearchComponent);
}
