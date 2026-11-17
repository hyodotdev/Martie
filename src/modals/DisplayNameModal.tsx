import {useState} from 'react';
import {t} from '../STRINGS';
import InputModal from './common/InputModal';
import {useDisplayNameModalStore} from '../stores/displayNameModalState';
import {MAX_DISPLAY_NAME_LENGTH} from '../utils/constants';
import {useMutation, useQuery} from 'convex/react';
import {api} from '../../convex/_generated/api';
import {withErrorBoundary} from '../hoc/withErrorBoundary';

function DisplayNameModal(): JSX.Element {
  const user = useQuery(api.user.queries.currentUser, {});
  const {visible, setVisible} = useDisplayNameModalStore();
  const [loading, setLoading] = useState(false);
  const updateProfile = useMutation(api.user.mutations.updateProfile);

  const handleModalHide = () => {
    setVisible(false);
  };

  const handleConfirm = async (content: string) => {
    if (!content.trim()) {
      return;
    }

    setLoading(true);
    try {
      await updateProfile({displayName: content});

      // ✅ 성공하면 모달 닫기
      setVisible(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <InputModal
      loading={loading}
      maxLength={MAX_DISPLAY_NAME_LENGTH}
      numberOfLines={1}
      onConfirm={handleConfirm}
      onModalHide={handleModalHide}
      defaultMessage={user?.displayName}
      textInputProps={{
        textAlignVertical: 'top',
      }}
      title={t('common.changeDisplayName')}
      visible={visible}
    />
  );
}

export default withErrorBoundary(DisplayNameModal);
