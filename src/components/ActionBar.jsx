// src/components/ActionBar.jsx
// Barra de acciones con tres operaciones:
//   Create  → abre un prompt para nombre del plano y llama onCreate
//   Reload  → vuelve a cargar el plano activo desde el servidor (sync manual)
//   Delete  → elimina el plano activo y llama onDelete
//
// Props:
//   selected  → nombre del plano activo (null si ninguno)
//   onCreate  → async (name: string) => void
//   onReload  → () => void
//   onDelete  → async () => void
export default function ActionBar({ selected, onCreate, onReload, onDelete }) {
  async function handleCreate() {
    const name = window.prompt('Nombre del nuevo plano:')
    if (!name?.trim()) return
    try {
      await onCreate(name.trim())
    } catch (e) {
      alert(`Error al crear: ${e.message}`)
    }
  }

  async function handleDelete() {
    if (!selected) return
    if (!window.confirm(`¿Eliminar el plano "${selected}"?`)) return
    try {
      await onDelete()
    } catch (e) {
      alert(`Error al eliminar: ${e.message}`)
    }
  }

  return (
    <div style={styles.bar}>
      {/* ── Create ── */}
      <button style={{ ...styles.btn, background: '#38a169' }} onClick={handleCreate}>
        + Crear plano
      </button>

      {/* ── Reload (sync manual del canvas) ── */}
      <button
        style={{ ...styles.btn, background: '#3182ce' }}
        onClick={onReload}
        disabled={!selected}
      >
        ↺ Sincronizar
      </button>

      {/* ── Delete ── */}
      <button
        style={{ ...styles.btn, background: '#e53e3e' }}
        onClick={handleDelete}
        disabled={!selected}
      >
        ✕ Eliminar
      </button>

      {selected && (
        <span style={styles.hint}>
          Plano activo: <strong>{selected}</strong>
          {' '}— cada clic se guarda en tiempo real via STOMP
        </span>
      )}
    </div>
  )
}

const styles = {
  bar:  { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', margin: '10px 0' },
  btn:  {
    padding:      '7px 14px',
    border:       'none',
    borderRadius: 8,
    color:        '#fff',
    fontWeight:   600,
    cursor:       'pointer',
    fontSize:     14,
  },
  hint: { color: '#718096', fontSize: 13, marginLeft: 8 },
}
