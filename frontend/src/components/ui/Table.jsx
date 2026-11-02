// Table primitive: sticky header, right-aligned numeric columns (add .p-table__num),
// row hover, responsive horizontal scroll wrapper.
export function Table({ columns, rows, ariaLabel } = {}) {
  return (
    <div className="p-table-wrap">
      <table className="p-table" aria-label={ariaLabel}>
        {columns && (
          <thead>
            <tr>
              {columns.map(c => (
                <th key={c.key} scope="col" style={c.align === 'right' ? { textAlign: 'right' } : undefined}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id ?? i}>
              {columns.map(c => (
                <td key={c.key} className={c.align === 'right' ? 'p-table__num' : undefined}>
                  {row.cells[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
