import { useEffect, useMemo, useState } from 'react';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { cn } from '@/utils/cn';

const DEFAULT_ROWS_PER_PAGE_OPTIONS = [5, 15, 25];

function PaginationControls({ page, totalPages, onPageChange }) {
  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        size="sm"
        variant="outline"
        className="h-9 w-auto rounded-lg px-3"
      >
        Prev
      </Button>
      <span className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-heading">
        {page}/{totalPages}
      </span>
      <Button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        size="sm"
        variant="outline"
        className="h-9 w-auto rounded-lg px-3"
      >
        Next
      </Button>
    </div>
  );
}

function DataTable({
  columns = [],
  data = [],
  loading = false,
  loadingContent = 'Loading records...',
  emptyContent = null,
  filters = null,
  pagination = null,
  onPageChange,
  onRowsPerPageChange,
  rowsPerPageOptions = DEFAULT_ROWS_PER_PAGE_OPTIONS,
  rowKey,
}) {
  const defaultRowsPerPage = rowsPerPageOptions.includes(15)
    ? 15
    : rowsPerPageOptions[0];
  const [clientPage, setClientPage] = useState(1);
  const [clientRowsPerPage, setClientRowsPerPage] = useState(defaultRowsPerPage);
  const isServerPaginated = Boolean(pagination);
  const page = isServerPaginated ? Number(pagination.page || 1) : clientPage;
  const rowsPerPage = isServerPaginated
    ? Number(pagination.limit || defaultRowsPerPage)
    : clientRowsPerPage;
  const totalItems = isServerPaginated
    ? Number(pagination.totalItems || data.length || 0)
    : data.length;
  const totalPages = Math.max(
    1,
    isServerPaginated
      ? Number(pagination.totalPages || Math.ceil(totalItems / rowsPerPage) || 1)
      : Math.ceil(totalItems / rowsPerPage) || 1,
  );

  const visibleData = useMemo(() => {
    if (isServerPaginated) {
      return data;
    }

    const start = (clientPage - 1) * clientRowsPerPage;
    return data.slice(start, start + clientRowsPerPage);
  }, [clientPage, clientRowsPerPage, data, isServerPaginated]);

  const startItem = totalItems === 0 ? 0 : (page - 1) * rowsPerPage + 1;
  const endItem = totalItems === 0 ? 0 : Math.min(startItem + visibleData.length - 1, totalItems);
  const showControls = loading || totalItems > 0 || filters;

  useEffect(() => {
    if (!isServerPaginated && clientPage > totalPages) {
      setClientPage(totalPages);
    }
  }, [clientPage, isServerPaginated, totalPages]);

  function handlePageChange(nextPage) {
    const boundedPage = Math.min(Math.max(nextPage, 1), totalPages);

    if (isServerPaginated) {
      onPageChange?.(boundedPage);
      return;
    }

    setClientPage(boundedPage);
  }

  function handleRowsPerPageChange(event) {
    const nextRowsPerPage = Number(event.target.value);

    if (isServerPaginated) {
      onRowsPerPageChange?.(nextRowsPerPage);
      return;
    }

    setClientRowsPerPage(nextRowsPerPage);
    setClientPage(1);
  }

  return (
    <div className="space-y-4">
      {showControls ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          {filters ? (
            <div className="min-w-0 lg:flex-1">
              {filters}
            </div>
          ) : (
            <div className="hidden lg:block lg:flex-1" />
          )}

          <div className="flex shrink-0 items-center gap-6 justify-between">
            <p className="whitespace-nowrap text-sm font-medium text-body">
              {totalItems} total record{totalItems === 1 ? '' : 's'}
            </p>

            <div className="flex items-center gap-3">
              <span className="whitespace-nowrap text-sm font-medium text-body">
                Rows
              </span>

              <div className="min-w-[90px]">
                <Select
                  value={String(rowsPerPage)}
                  onChange={handleRowsPerPageChange}
                  options={rowsPerPageOptions.map((option) => ({
                    value: String(option),
                    label: String(option),
                  }))}
                  aria-label="Rows per page"
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0">
            <thead className="bg-background">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={cn(
                      'border-b border-border px-5 py-3 text-left text-md font-bold  text-body',
                      column.headerClassName,
                    )}
                  >
                    {column.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-5 py-10 text-center text-sm text-body" colSpan={columns.length}>
                    {loadingContent}
                  </td>
                </tr>
              ) : visibleData.length ? (
                visibleData.map((row, rowIndex) => (
                  <tr
                    key={rowKey ? rowKey(row, rowIndex) : row.id || row._id || rowIndex}
                    className="transition hover:bg-background-muted"
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={cn(
                          'border-b border-border px-5 py-4 align-top text-sm text-heading',
                          column.cellClassName,
                        )}
                      >
                        {column.render ? column.render(row) : row[column.key]}
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

      {totalItems > 0 ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-body">
            Showing {startItem} to {endItem} of {totalItems} entries
          </p>
          <PaginationControls
            page={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      ) : null}
    </div>
  );
}

export default DataTable;
