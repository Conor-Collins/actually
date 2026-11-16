import type { ReactNode } from 'react';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';

type FieldProps = {
  label: string;
  children: ReactNode;
};

// A form field with its label above it.
export function Field({ label, children }: FieldProps) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Text style={{ fontSize: 12, color: theme.pageTextSubdued }}>
        {label}
      </Text>
      {children}
    </label>
  );
}
