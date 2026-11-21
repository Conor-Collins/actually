import { useTranslation } from 'react-i18next';

import { TextOneLine } from '@actual-app/components/text-one-line';
import { theme } from '@actual-app/components/theme';
import { getSchedulePayeeIds } from '@actual-app/core/shared/schedules';
import type { ScheduleEntity } from '@actual-app/core/types/models';

import { useLanguage } from '#hooks/useLocale';
import { usePayeesById } from '#hooks/usePayees';

export function SchedulePayees({ schedule }: { schedule: ScheduleEntity }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const { data: payees } = usePayeesById();
  const names = getSchedulePayeeIds(schedule).flatMap(id => {
    const name = payees?.[id]?.name;
    return name ? [name] : [];
  });
  const label =
    names.length > 0
      ? new Intl.ListFormat(language, { type: 'conjunction' }).format(names)
      : t('None');
  return (
    <TextOneLine
      title={label}
      style={names.length === 0 ? { color: theme.pageTextSubdued } : undefined}
    >
      {label}
    </TextOneLine>
  );
}
