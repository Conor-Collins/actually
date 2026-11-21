// @ts-strict-ignore
import React, { useContext } from 'react';
import type { ComponentProps } from 'react';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type {
  CategoryEntity,
  CategoryGroupEntity,
} from '@actual-app/core/types/models';

import { useBudgetPeriodMonths } from '#components/period-budget/BudgetPeriods';
import { DropHighlight, useDraggable, useDroppable } from '#components/sort';
import type {
  DragState,
  OnDragChangeCallback,
  OnDropCallback,
} from '#components/sort';
import { Row, ROW_HEIGHT } from '#components/table';
import { useDragRef } from '#hooks/useDragRef';

import { BudgetPeriodRow } from './BudgetPeriodRow';
import { MonthsContext } from './MonthsContext';
import { RenderMonths } from './RenderMonths';
import { SidebarCategory } from './SidebarCategory';

import { useBudgetComponents } from '.';

type ExpenseCategoryProps = {
  cat: CategoryEntity;
  categoryGroup?: CategoryGroupEntity;
  editingCell: { id: string; cell: string } | null;
  dragState: DragState<CategoryEntity> | DragState<CategoryGroupEntity> | null;
  onEditName?: ComponentProps<typeof SidebarCategory>['onEditName'];
  onEditMonth?: (id: CategoryEntity['id'], month: string) => void;
  onSave?: ComponentProps<typeof SidebarCategory>['onSave'];
  onDelete?: ComponentProps<typeof SidebarCategory>['onDelete'];
  onDragChange: OnDragChangeCallback<CategoryEntity>;
  onBudgetAction: (month: string, action: string, arg: unknown) => void;
  onShowActivity: (id: CategoryEntity['id'], month: string) => void;
  onReorder: OnDropCallback;
};

export function ExpenseCategory({
  cat,
  categoryGroup,
  editingCell,
  dragState,
  onEditName,
  onEditMonth,
  onSave,
  onDelete,
  onBudgetAction,
  onShowActivity,
  onDragChange,
  onReorder,
}: ExpenseCategoryProps) {
  let dragging = dragState && dragState.item === cat;

  if (dragState && dragState.item.id === cat.group) {
    dragging = true;
  }

  const { dragRef } = useDraggable({
    type: 'category',
    onDragChange,
    item: cat,
    canDrag: editingCell === null,
  });
  const handleDragRef = useDragRef(dragRef);

  const { dropRef, dropPos } = useDroppable({
    types: 'category',
    id: cat.id,
    onDrop: onReorder,
  });

  const { ExpenseCategoryComponent: MonthComponent } = useBudgetComponents();

  const { months } = useContext(MonthsContext);
  const periodMonths = useBudgetPeriodMonths();
  const hasSnapshot = months.some(month =>
    periodMonths.get(month)?.periods.has(cat.id),
  );

  return (
    <Row
      innerRef={dropRef}
      collapsed
      style={{
        ...(hasSnapshot && {
          height: 'auto',
          flex: '0 0 auto',
          flexDirection: 'column',
        }),
        backgroundColor: theme.budgetCurrentMonth,
        opacity: cat.hidden || categoryGroup?.hidden ? 0.5 : undefined,
      }}
    >
      <DropHighlight pos={dropPos} offset={{ top: 1 }} />

      <View
        style={{
          flex: hasSnapshot ? undefined : 1,
          height: hasSnapshot ? ROW_HEIGHT : undefined,
          flexDirection: 'row',
        }}
      >
        <SidebarCategory
          innerRef={handleDragRef}
          category={cat}
          categoryGroup={categoryGroup}
          dragPreview={dragging && dragState.preview}
          dragging={dragging && !dragState.preview}
          editing={
            editingCell &&
            editingCell.cell === 'name' &&
            editingCell.id === cat.id
          }
          onEditName={onEditName}
          onSave={onSave}
          onDelete={onDelete}
        />

        <RenderMonths>
          {({ month }) => (
            <MonthComponent
              month={month}
              editing={
                editingCell &&
                editingCell.id === cat.id &&
                editingCell.cell === month
              }
              category={cat}
              onEdit={onEditMonth}
              onBudgetAction={onBudgetAction}
              onShowActivity={onShowActivity}
            />
          )}
        </RenderMonths>
      </View>
      {hasSnapshot && <BudgetPeriodRow categoryId={cat.id} />}
    </Row>
  );
}
