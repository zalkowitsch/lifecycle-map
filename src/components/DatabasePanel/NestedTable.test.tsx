import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NestedTable } from '@/components/DatabasePanel/NestedTable';

const node = { id: 'n1', context: { states: [{ label: 'Today', mode: 'Manual', narrative: 'By hand' }] } };
const modes = [{ id: 'Manual', label: 'Manual', color: '#000' }, { id: 'Auto', label: 'Auto', color: '#0a0' }];

describe('NestedTable states editor', () => {
  it('renders state rows and emits an update with row index + sub-field', () => {
    const onEdit = vi.fn();
    render(<NestedTable node={node as any} field="states" featureIds={[]} modes={modes as any}
      onFieldChange={() => {}} onEdit={onEdit} />);
    // the narrative text input for row 0
    const input = screen.getByDisplayValue('By hand');
    fireEvent.change(input, { target: { value: 'Automated' } });
    expect(onEdit).toHaveBeenCalledWith({ op: 'update', id: '0', field: 'narrative', value: 'Automated' });
  });
});
