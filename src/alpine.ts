import type { Alpine } from 'alpinejs';
import { charSearchComponent } from '@/components/xml-viewer/char-search-component';
import { pointBuyComponent } from '@/components/point-buy/point-buy-component';
import { diceRollerComponent } from '@/components/dice-roller/dice-roller-component';
import { partyViewComponent } from '@/components/xml-viewer/party-view-component';
import { xmlCardComponent } from '@/components/xml-viewer/xml-card-component';
import { featExplorerComponent } from '@/components/feats-explorer/feat-explorer-component';

export default function setupAlpine(Alpine: Alpine) {
  Alpine.data('charSearch', charSearchComponent);
  Alpine.data('pointBuy', pointBuyComponent);
  Alpine.data('diceRoller', diceRollerComponent);
  Alpine.data('partyView', partyViewComponent);
  Alpine.data('xmlCard', xmlCardComponent);
  Alpine.data('featExplorer', featExplorerComponent);
}
