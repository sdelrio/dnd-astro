import type { Alpine } from 'alpinejs';
import intersect from '@alpinejs/intersect';
import { charSearchComponent } from '@/components/xml-viewer/char-search-component';
import { pointBuyComponent } from '@/components/point-buy/point-buy-component';
import { diceRollerComponent } from '@/components/dice-roller/dice-roller-component';
import { partyViewComponent } from '@/components/xml-viewer/party-view-component';

export default function setupAlpine(Alpine: Alpine) {
  Alpine.plugin(intersect);
  Alpine.data('charSearch', charSearchComponent);
  Alpine.data('pointBuy', pointBuyComponent);
  Alpine.data('diceRoller', diceRollerComponent);
  Alpine.data('partyView', partyViewComponent);
}
