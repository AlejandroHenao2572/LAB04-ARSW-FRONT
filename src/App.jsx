/**
 * src/App.jsx — Orquestador principal
 *
 * Responsabilidades:
 *   1. Instanciar el cliente STOMP (useStompClient) Y el socket Socket.IO
 *      (useSocketIoClient), cada uno solo cuando está activo.
 *   2. Mantener el estado de UI: modo de transporte, autor activo, plano seleccionado.
 *   3. Propagar el descriptor de transporte unificado a useCanvas.
 *   4. Conectar los callbacks de ActionBar con las funciones de los hooks.
 */
import { useState }            from 'react'
import { useStompClient }      from './hooks/useStompClient.js'
import { useSocketIoClient }   from './hooks/useSocketIoClient.js'
import { useBlueprints }       from './hooks/useBlueprints.js'
import { useCanvas }           from './hooks/useCanvas.js'
import AuthorPanel             from './components/AuthorPanel.jsx'
import Canvas                  from './components/Canvas.jsx'
import ActionBar               from './components/ActionBar.jsx'

export default function App() {
  //  Estado de UI 
  const [tech, setTech]         = useState('stomp')  // 'stomp' | 'socketio'
  const [author, setAuthor]     = useState('juan')   // quién está dibujando
  const [draftAuthor, setDraft] = useState('juan')   // valor del input antes de confirmar
  const [selected, setSelected] = useState(null)     // nombre del plano activo en el canvas

  //  STOMP client (singleton, solo activo cuando tech === 'stomp') 
  // `ready` es true solo cuando el broker confirmó la sesión.
  const { client, ready } = useStompClient(tech === 'stomp')

  // ── Socket.IO client (singleton, solo activo cuando tech === 'socketio') ──
  // `connected` es true solo tras el evento 'connect' del gateway Node.js.
  const { socket, connected } = useSocketIoClient(tech === 'socketio')

  //  Panel de autor 
  // Se recarga automáticamente cada vez que `author` cambia.
  const {
    blueprints, totalPoints, loading, error,
    reload: reloadList, create, remove,
  } = useBlueprints(author)

  // ── Canvas con transporte unificado 
  // useCanvas decide internamente qué ruta usar según `mode`.
  // `sendPoint` publica el clic; el canvas solo se redibuja al recibir el eco del servidor.
  const { points, sendPoint } = useCanvas(
    { mode: tech, client, ready, socket, connected },
    author,
    selected
  )

  // true cuando el transporte activo está listo para enviar/recibir
  const isConnected = tech === 'stomp' ? ready : connected

  //  Handlers de ActionBar 
  async function handleCreate(name) {
    await create(name)         // POST → crea el plano vacío
    setSelected(name)          // lo selecciona automáticamente
  }

  async function handleDelete() {
    await remove(selected)     // DELETE → elimina el plano
    setSelected(null)          // deselecciona (limpia el canvas)
  }

  function handleReload() {
    reloadList()
  }

  //  Cambio de autor 
  function handleAuthorSubmit(e) {
    e.preventDefault()
    setAuthor(draftAuthor.trim())
    setSelected(null)           // limpia el plano activo al cambiar de autor
  }

  //  Derived UI state 
  const statusLabel = tech === 'stomp'
    ? (ready     ? 'STOMP conectado'      : 'STOMP desconectado')
    : (connected ? 'Socket.IO conectado'  : 'Socket.IO desconectado')
  const statusColor = isConnected ? '#276749' : '#c05621'

  return (
    <div style={styles.page}>
      <h2 style={styles.title}>Blueprints RT — Colaboración en Tiempo Real</h2>

      {/* ── Selector de autor ── */}
      <form onSubmit={handleAuthorSubmit} style={styles.form}>
        <label style={styles.label}>Tecnología:</label>
        <select
          value={tech}
          onChange={e => { setTech(e.target.value); setSelected(null) }}
          style={styles.select}
        >
          <option value="stomp">STOMP (Spring Boot)</option>
          <option value="socketio">Socket.IO (Node.js gateway)</option>
        </select>

        <label style={styles.label}>Autor:</label>
        <input
          value={draftAuthor}
          onChange={e => setDraft(e.target.value)}
          placeholder="nombre del autor"
          style={styles.input}
        />
        <button type="submit" style={styles.submitBtn}>Cargar</button>
        <span style={{ ...styles.badge, color: statusColor }}>{statusLabel}</span>
      </form>

      {/*  Panel de autor: tabla de planos + total  */}
      <AuthorPanel
        blueprints={blueprints}
        totalPoints={totalPoints}
        loading={loading}
        error={error}
        selected={selected}
        onSelect={setSelected}
      />

      {/*  Barra de acciones CRUD  */}
      <ActionBar
        selected={selected}
        onCreate={handleCreate}
        onReload={handleReload}
        onDelete={handleDelete}
      />

      {/*  Lienzo de dibujo  */}
      <Canvas
        points={points}
        onDraw={sendPoint}
        disabled={!selected || !isConnected}
      />

      {!selected && (
        <p style={styles.hint}>
          Selecciona un plano de la tabla o crea uno nuevo para empezar a dibujar.
        </p>
      )}
    </div>
  )
}

const styles = {
  page:      { fontFamily: 'Inter, system-ui, sans-serif', padding: 24, maxWidth: 720 },
  title:     { margin: '0 0 16px', color: '#2d3748' },
  form:      { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' },
  label:     { fontWeight: 600, color: '#4a5568' },
  select:    { padding: '6px 10px', border: '1px solid #cbd5e0', borderRadius: 6, fontSize: 14 },
  input:     { padding: '6px 10px', border: '1px solid #cbd5e0', borderRadius: 6, fontSize: 14 },
  submitBtn: { padding: '6px 14px', background: '#667eea', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 },
  badge:     { fontSize: 13, marginLeft: 8, fontWeight: 600 },
  hint:      { color: '#718096', fontStyle: 'italic', marginTop: 12 },
}
