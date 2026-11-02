import { Table, Button, Dialog } from '../ui'

export default function ImportPreviewDialog({
  open,
  onClose,
  preview,
  onApply,
  onChangeFile,
}) {
  if (!open) return null

  return (
    <Dialog open onClose={onClose} title="Import Preview">
      {preview?.rows?.length > 0 ? (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '8px 12px' }}>Symbol</th>
                <th style={{ padding: '8px 12px' }}>Name</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Shares</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Buy Price</th>
                <th style={{ padding: '8px 12px' }}>Type</th>
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                  <td style={{ padding: '8px 12px' }}>{r.symbol}</td>
                  <td style={{ padding: '8px 12px' }}>{r.name}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>{r.shares}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>{r.buy_price}</td>
                  <td style={{ padding: '8px 12px' }}>{r.investment_type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <p style={{ color: 'var(--muted)' }}>No valid rows in CSV</p>
      )}
      {preview?.warnings?.length > 0 && (
        <div style={{ marginTop: 12, color: 'var(--warning)', fontSize: 12 }}>
          {preview.warnings.map((w, i) => (
            <div key={i}>{w.row?.symbol || 'Row'} - {w.errors.join(', ')}</div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
        <button variant="ghost" onClick={onClose}>Cancel</button>
        <button onClick={onChangeFile}>Change File</button>
        <button onClick={onApply}>Apply Import</button>
      </div>
    </Dialog>
  )
}