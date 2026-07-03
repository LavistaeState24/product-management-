function Table({ columns = [], data = [], emptyContent = null }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-background">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-body"
                >
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.length ? (
              data.map((row, rowIndex) => (
                <tr key={row.id || rowIndex} className="transition hover:bg-background-muted">
                  {columns.map((column) => (
                    <td key={column.key} className="px-5 py-4 text-sm text-heading">
                      {column.render ? column.render(row[column.key], row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-5 py-10 text-center text-sm text-body" colSpan={columns.length}>
                  {emptyContent || 'No records available.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Table;
