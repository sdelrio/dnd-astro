import type { Alpine } from 'alpinejs';
import intersect from '@alpinejs/intersect';

export default function setupAlpine(Alpine: Alpine) {
  Alpine.plugin(intersect);
}
