import { Trans, useTranslation } from 'react-i18next';
import { Link, matchPath, useLocation } from 'react-router';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import {
  SvgCreditCard,
  SvgPiggyBank,
  SvgReports,
  SvgWallet,
} from '@actual-app/components/icons/v1';
import { SvgCalendar3 } from '@actual-app/components/icons/v2';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

export const MOBILE_NAV_HEIGHT = 60;

export function MobileNavTabs() {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();
  const { pathname } = useLocation();

  if (!isNarrowWidth) {
    return null;
  }

  const isTransactions = Boolean(matchPath('/accounts/all/*', pathname));
  const tabs = [
    {
      label: <Trans>Accounts</Trans>,
      path: '/accounts',
      Icon: SvgPiggyBank,
      isActive: !isTransactions && Boolean(matchPath('/accounts/*', pathname)),
    },
    {
      label: <Trans>Transactions</Trans>,
      path: '/accounts/all',
      Icon: SvgCreditCard,
      isActive: isTransactions,
    },
    {
      label: <Trans>Budget</Trans>,
      path: '/budget',
      Icon: SvgWallet,
      isActive: Boolean(
        matchPath('/budget/*', pathname) ||
        matchPath('/categories/*', pathname),
      ),
    },
    {
      label: <Trans>Schedules</Trans>,
      path: '/schedules',
      Icon: SvgCalendar3,
      isActive: Boolean(matchPath('/schedules/*', pathname)),
    },
    {
      label: <Trans>Reports</Trans>,
      path: '/reports',
      Icon: SvgReports,
      isActive: Boolean(matchPath('/reports/*', pathname)),
    },
  ];

  return (
    <View
      role="navigation"
      aria-label={t('Main navigation')}
      data-navbar-state="default"
      style={{
        flexDirection: 'row',
        flexWrap: 'nowrap',
        flexShrink: 0,
        backgroundColor: theme.mobileNavBackground,
        borderTop: `1px solid ${theme.menuBorder}`,
        height: `calc(${MOBILE_NAV_HEIGHT}px + env(safe-area-inset-bottom))`,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {tabs.map(({ path, label, Icon, isActive }) => (
        <Link
          key={path}
          to={path}
          aria-current={isActive ? 'page' : undefined}
          style={{
            ...styles.noTapHighlight,
            flex: '1 1 20%',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            color: isActive ? theme.mobileNavItemSelected : theme.mobileNavItem,
            fontSize: 10,
            fontWeight: isActive ? 700 : 500,
            textDecoration: 'none',
            userSelect: 'none',
          }}
        >
          <Icon width={22} height={22} />
          <span
            style={{
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </span>
        </Link>
      ))}
    </View>
  );
}
