// src/App.jsx  — Orquestador principal (Fase 4)
//
// Responsabilidades:
//   1. Instanciar el cliente STOMP una sola vez (useStompClient)
//   2. Mantener el estado de UI: autor activo, plano seleccionado
//   3. Propagar autor y plano a useBlueprints y useCanvas
//   4. Conectar los callbacks de ActionBar con las funciones de los hooks
import { useState } from 'react'
import { useStompClient }  from './hooks/useStompClient.js'
import { useBlueprints }   from './hooks/useBlueprints.js'
import { useCanvas }       from './hooks/useCanvas.js'
import AuthorPanel         from './components/AuthorPanel.jsx'
import Canvas              from './components/Canvas.jsx'
import ActionBar           from './components/ActionBar.jsx'

export default function App() {
  // ── Estado de UI ──────────────────────────────────────────────────────────
  const [tech, setTech]         = useState('stomp')  // 'stomp' | 'socketio'
  const [author, setAuthor]     = useState('juan')   // quién está dibujando
  const [draftAuthor, setDraft] = useState('juan')   // valor del input antes de confirmar
  const [selected, setSelected] = useState(null)     // nombre del plano activo en el canvas

  // ── Capa STOMP (singleton) ────────────────────────────────────────────────
  // El cliente se crea una vez al montar App y se destruye al desmontar.
  // `ready` es true solo cuando el broker confirmó la sesión STOMP.
  const { client, ready } = useStompClient(tech === 'stomp')

  // ── Panel de autor ────────────────────────────────────────────────────────
  // Se recarga automáticamente cada vez que `author` cambia.
  const {
    blueprints, loading, error,
    reload: reloadList, create, remove,
  } = useBlueprints(author)

  // ── Canvas + STOMP ────────────────────────────────────────────────────────
  // `points` es el estado canónico del lienzo (sincronizado con el broker).
  // `sendPoint` publica el clic al broker; el canvas solo se redibuja al recibir el eco.
  const { points, sendPoint } = useCanvas(client, ready, author, selected)

  // ── Handlers de ActionBar ─────────────────────────────────────────────────
  async function handleCreate(name) {
    await create(name)         // POST → crea el plano vacío
    setSelected(name)          // lo selecciona automáticamente
  }

  async function handleDelete() {
    await remove(selected)     // DELETE → elimina el plano
    setSelected(null)          // deselecciona (limpia el canvas)
  }

  function handleReload() {
    // Fuerza re-mount de useCanvas cambiando brevemente `selected`.
    // Esto dispara el useEffect de useCanvas que recarga via REST.
    // Técnica: toggling a null y de vuelta en el mismo tick NO funciona en React;
    // en su lugar, el hook useCanvas ya expone la recarga implícitamente
    // cada vez que `selected` no cambia pero `ready` cambia.
    // La forma más simple: recargar la lista del panel y mantener el plano.
    reloadList()
  }

  // ── Cambio de autor ───────────────────────────────────────────────────────
  function handleAuthorSubmit(e) {
    e.preventDefault()
    setAuthor(draftAuthor.trim())
    setSelected(null)          // limpia el plano activo al cambiar de autor
  }

  return (
    <div style={styles.page}>
      <h2 style={styles.title}>Blueprints RT — Colaboración en Tiempo Real</h2>

      {/* ── Selector de autor ── */}
      <form onSubmit={handleAuthorSubmit} style={styles.form}>
        <label style={styles.label}>Tecnología:</label>
        <select value={tech} onChange={e => setTech(e.target.value)} style={styles.select}>
          <option value="stomp">STOMP</option>
          <option value="socketio">Socket.IO </option>
        </select>

        <label style={styles.label}>Autor:</label>
        <input
          value={draftAuthor}
          onChange={e => setDraft(e.target.value)}
          placeholder="nombre del autor"
          style={styles.input}
        />
        <button type="submit" style={styles.submitBtn}>Cargar</button>
        <span style={styles.badge}>
          {tech === 'stomp'
            ? (ready ? 'STOMP conectado' : 'STOMP desconectado')
            : 'Socket.IO backend no disponible'}
        </span>
      </form>

      {/* ── Panel de autor: tabla de planos + total ── */}
      <AuthorPanel
        blueprints={blueprints}
        loading={loading}
        error={error}
        selected={selected}
        onSelect={setSelected}
      />

      {/* ── Barra de acciones CRUD ── */}
      <ActionBar
        selected={selected}
        onCreate={handleCreate}
        onReload={handleReload}
        onDelete={handleDelete}
      />

      {/* ── Lienzo de dibujo ── */}
      <Canvas
        points={points}
        onDraw={sendPoint}
        disabled={!selected || (tech === 'stomp' ? !ready : true)}
      />

      {tech === 'socketio' && (
        <p style={{ color: '#b7791f', marginTop: 8 }}>
          Socket.IO no está implementado en el backend todavía. Selecciona STOMP para probar la sincronización en tiempo real.
        </p>
      )}

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
  badge:     { fontSize: 13, color: '#4a5568', marginLeft: 8 },
  hint:      { color: '#718096', fontStyle: 'italic', marginTop: 12 },
}
