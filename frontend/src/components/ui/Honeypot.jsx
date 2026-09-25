// Invisible honeypot bot-trap. Always in the form, stays empty for humans,
// gets filled by form bots — the backend swallows those submissions. See
// functions/[[path]].js in the frontend.
export default function Honeypot({ value, onChange }) {
  return (
    <input
      type="text" name="website" value={value} onChange={onChange}
      tabIndex={-1} autoComplete="off" aria-hidden="true"
      style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
    />
  )
}