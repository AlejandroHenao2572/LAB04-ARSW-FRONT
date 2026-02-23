// src/hooks/useBlueprints.js
import { useCallback, useEffect, useState } from 'react'
import {
  getBlueprintsByAuthor,
  createBlueprint,
  deleteBlueprint,
} from '../lib/blueprintApi.js'

// Gestiona el estado del panel de autor:
//   - Lista de planos con su conteo de puntos
//   - Total de puntos (via reduce)
//   - Operaciones CRUD que actualizan la lista automáticamente
//
// Parámetro: author → string con el nombre del autor activo
export function useBlueprints(author) {
  const [blueprints, setBlueprints] = useState([])   // [{ name, author, pointCount }]
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)

  // Carga / recarga la lista desde el servidor 
  const reload = useCallback(async () => {
    if (!author) return
    setLoading(true)
    setError(null)
    try {
      const list = await getBlueprintsByAuthor(author)
      setBlueprints(list)
    } catch (e) {
      setError(e.message)
      setBlueprints([])
    } finally {
      setLoading(false)
    }
  }, [author])

  // Recarga automatica cada vez que cambia el autor
  useEffect(() => { reload() }, [reload])

  // Total de puntos del autor (derivado con reduce sobre pointCount de cada plano).
  // Se recalcula automáticamente cada vez que cambia `blueprints`.
  const totalPoints = blueprints.reduce((sum, bp) => sum + (bp.pointCount ?? 0), 0)

  // Crear un nuevo plano
  // Después de crear, recarga la lista para que el panel se actualice.
  async function create(name) {
    await createBlueprint({ author, name, points: [] })
    await reload()
  }

  // Eliminar un plano 
  async function remove(name) {
    await deleteBlueprint(author, name)
    await reload()
  }

  return { blueprints, totalPoints, loading, error, reload, create, remove }
}
