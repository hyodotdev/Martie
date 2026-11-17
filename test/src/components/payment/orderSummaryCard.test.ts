import {getBulbPackDisplay} from '../../../../src/components/payment/OrderSummaryCard';
import de from '../../../../assets/langs/de.json';
import en from '../../../../assets/langs/en.json';
import es from '../../../../assets/langs/es.json';
import fr from '../../../../assets/langs/fr.json';
import ja from '../../../../assets/langs/ja.json';
import ko from '../../../../assets/langs/ko.json';
import th from '../../../../assets/langs/th.json';
import tw from '../../../../assets/langs/tw.json';
import vi from '../../../../assets/langs/vi.json';

describe('OrderSummaryCard', () => {
  it('mirrors the purchase-screen artwork per pack size', () => {
    expect(getBulbPackDisplay(10)).toEqual({
      iconName: 'Lightning',
      iconColor: '#F9A825',
    });
    expect(getBulbPackDisplay(30)).toEqual({
      iconName: 'LightningA',
      iconColor: '#FB8C00',
    });
  });

  it('falls back to the large-pack artwork for unknown counts', () => {
    expect(getBulbPackDisplay(0).iconName).toBe('LightningA');
  });

  it('has the order total label in all 9 locales', () => {
    for (const strings of [de, en, es, fr, ja, ko, th, tw, vi]) {
      expect(strings.purchase.altBilling.orderTotal.length).toBeGreaterThan(0);
    }
  });
});
