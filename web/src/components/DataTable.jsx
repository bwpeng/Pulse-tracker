/** The table view every chart can fall back to — identity and value are
 *  available without relying on colour. */
export default function DataTable({ columns, rows, caption }) {
  return (
    <div className="table-wrap">
      <table className="data">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col} scope="col">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row[0] ?? i}>
              {row.map((cell, j) =>
                j === 0 ? (
                  <th key={j} scope="row" style={{ fontWeight: 550 }}>
                    {cell}
                  </th>
                ) : (
                  <td key={j}>{cell}</td>
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
