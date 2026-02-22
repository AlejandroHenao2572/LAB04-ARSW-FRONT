// src/components/AuthorPanel.jsx
// Tabla que muestra todos los planos de un autor.
// El usuario hace clic en una fila para seleccionar el plano activo.
// El total de puntos se calcula con reduce DENTRO del hook useBlueprints;
// aquí solo lo mostramos.
export default function AuthorPanel({ blueprints, totalPoints, loading, error, selected, onSelect }) {
  if (loading) return <p style={styles.msg}>Cargando planos…</p>
  if (error)   return <p style={{ ...styles.msg, color: '#e53e3e' }}>Error: {error}</p>
  if (!blueprints.length) return <p style={styles.msg}>Sin planos para este autor.</p>

  return (
    <div style={styles.wrapper}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Nombre del plano</th>
            <th style={styles.th}>Puntos</th>
          </tr>
        </thead>
        <tbody>
          {blueprints.map((bp) => (
            <tr
              key={bp.name}
              onClick={() => onSelect(bp.name)}
              style={{
                ...styles.tr,
                background: selected === bp.name ? '#ebf8ff' : 'transparent',
                fontWeight: selected === bp.name ? 600 : 400,
              }}
            >
              <td style={styles.td}>{bp.name}</td>
              <td style={{ ...styles.td, textAlign: 'center' }}>{bp.pointCount}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td style={{ ...styles.td, fontWeight: 700 }}>Total</td>
            <td style={{ ...styles.td, textAlign: 'center', fontWeight: 700 }}>
              {totalPoints}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

const styles = {
  wrapper: { overflowX: 'auto', marginBottom: 12 },
  table:   { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th:      { padding: '6px 12px', background: '#2d3748', color: '#fff', textAlign: 'left' },
  tr:      { cursor: 'pointer', borderBottom: '1px solid #e2e8f0', transition: 'background .15s' },
  td:      { padding: '6px 12px' },
  msg:     { color: '#718096', fontStyle: 'italic' },
}
