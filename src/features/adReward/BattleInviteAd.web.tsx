import {useEffect, useEffectEvent} from 'react';
import CustomLoadingIndicator from '../../uis/CustomLoadingIndicator';
import {t} from '../../STRINGS';

type Props = {
  onDone: () => void;
};

// The web build serves no ads, so the invite opens right away.
export default function BattleInviteAd({onDone}: Props): JSX.Element {
  const done = useEffectEvent(onDone);

  useEffect(() => {
    done();
  }, []);

  return <CustomLoadingIndicator text={t('common.loading')} />;
}
