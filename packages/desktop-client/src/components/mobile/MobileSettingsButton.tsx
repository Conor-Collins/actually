import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgCog } from '@actual-app/components/icons/v1';

import { useNavigate } from '#hooks/useNavigate';

export function MobileSettingsButton() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Button
      variant="bare"
      aria-label={t('Settings')}
      style={{ width: 40, height: 40, padding: 0 }}
      onPress={() => navigate('/settings')}
    >
      <SvgCog width={20} height={20} />
    </Button>
  );
}
