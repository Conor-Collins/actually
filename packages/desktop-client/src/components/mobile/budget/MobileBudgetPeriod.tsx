import { useState } from 'react';
import { Dialog, Modal, ModalOverlay } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';

import { MODAL_Z_INDEX } from '#components/common/Modal';
import { BudgetPeriodDetail } from '#components/period-budget/BudgetPeriodDetail';
import { useBudgetPeriodMonth } from '#components/period-budget/BudgetPeriods';
import { BudgetPeriodSnapshot } from '#components/period-budget/BudgetPeriodSnapshot';

export function MobileBudgetPeriod({
  month,
  categoryId,
}: {
  month: string;
  categoryId: string;
}) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const monthly = useBudgetPeriodMonth(month);
  const entry = monthly?.periods.get(categoryId);
  if (!monthly || !entry) {
    return null;
  }
  const close = () => setIsOpen(false);

  return (
    <>
      <BudgetPeriodSnapshot
        entry={entry}
        data={monthly.data}
        asOf={monthly.asOf}
        isOpen={isOpen}
        onPress={() => setIsOpen(true)}
        isMobile
      />
      {isOpen && (
        <ModalOverlay
          isOpen
          isDismissable
          onOpenChange={open => {
            if (!open) close();
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: MODAL_Z_INDEX,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            backgroundColor: theme.overlayBackground,
          }}
        >
          <Modal
            style={{
              width: '100%',
              maxWidth: 600,
              maxHeight: 'min(85dvh, 660px)',
              overflow: 'auto',
              overscrollBehavior: 'contain',
              borderRadius: '18px 18px 0 0',
              paddingBottom: 'env(safe-area-inset-bottom)',
              backgroundColor: theme.pageBackground,
            }}
          >
            <Dialog
              aria-label={t('Period details for {{category}}', {
                category: entry.row.category.name,
              })}
              style={{ ...styles.smallText, outline: 'none' }}
            >
              <BudgetPeriodDetail
                entry={entry}
                data={monthly.data}
                asOf={monthly.asOf}
                onClose={close}
              />
            </Dialog>
          </Modal>
        </ModalOverlay>
      )}
    </>
  );
}
