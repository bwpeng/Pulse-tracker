import { useEffect, useState } from 'react';
import Card from './Card.jsx';
import DataTable from './DataTable.jsx';
import Legend from './Legend.jsx';
import { useApp } from '../store/AppStore.jsx';

/** A chart plus the two things every chart here ships with: a legend when
 *  there are two or more series, and a table view of the same numbers. */
export default function ChartCard({ title, subtitle, action, legend, table, children }) {
  const { settings } = useApp();
  const [open, setOpen] = useState(settings.showTables);

  useEffect(() => setOpen(settings.showTables), [settings.showTables]);

  return (
    <Card
      title={title}
      subtitle={subtitle}
      action={
        action ?? (
          table && (
            <button type="button" className="link-btn" onClick={() => setOpen((v) => !v)}>
              {open ? 'Hide table' : 'Table view'}
            </button>
          )
        )
      }
    >
      {children}
      {legend && legend.length > 1 && <Legend items={legend} />}
      {table && open && <DataTable {...table} caption={title} />}
    </Card>
  );
}
