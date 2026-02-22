const BASE = `${import.meta.env.VITE_API_BASE ?? 'http://localhost:8080'}/api/v1/blueprints`

// El backend siempre responde con { status, message, data, timestamp }.
// Esta función extrae `data` y lanza un error descriptivo si el servidor
// retorna un código HTTP de error (4xx / 5xx).
async function http(input, init) {
  const res = await fetch(input, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })

  const body = await res.json()          // ApiResponse<T>

  if (!res.ok) {
    // body.message viene del GlobalExceptionHandler
    throw new Error(body.message ?? `HTTP ${res.status}`)
  }

  return body.data                       // T puro, sin el wrapper
}

// GET /api/v1/blueprints/{author} 
// Devuelve todos los planos de un autor.
// La API retorna Set<Blueprint> con los puntos completos; aqui los mapeamos
// a { name, pointCount } para que el panel del autor no cargue datos innecesarios.
export async function getBlueprintsByAuthor(author) {
  const blueprints = await http(`${BASE}/${encodeURIComponent(author)}`)
  // blueprints es un array (Spring serializa Set → array JSON)
  return blueprints.map(bp => ({
    name:       bp.name,
    author:     bp.author,
    pointCount: bp.points?.length ?? 0,
  }))
}

// GET /api/v1/blueprints/{author}/{bpname}
// Devuelve el plano COMPLETO con el array de puntos.
// Se llama únicamente cuando el usuario selecciona un plano para dibujarlo.
export async function getBlueprint(author, name) {
  return http(`${BASE}/${encodeURIComponent(author)}/${encodeURIComponent(name)}`)
  // Retorna: { author, name, points: [{ x, y }, ...] }
}

// POST /api/v1/blueprints 
// Crea un plano nuevo. El backend valida que autor + nombre sean únicos (409 si ya existe).
// payload: { author: string, name: string, points: [{ x, y }] }
export async function createBlueprint(payload) {
  return http(BASE, {
    method: 'POST',
    body:   JSON.stringify(payload),
  })
}

// PUT /api/v1/blueprints/{author}/{bpname}/points 
// agrega un unico punto al plano existente.
// Este es el que usamos tanto para "Save" como para el flujo STOMP (persistencia).
// point: { x: number, y: number }
export async function addPoint(author, name, point) {
  return http(
    `${BASE}/${encodeURIComponent(author)}/${encodeURIComponent(name)}/points`,
    {
      method: 'PUT',
      body:   JSON.stringify(point),
    }
  )
}

// DELETE /api/v1/blueprints/{author}/{bpname}
// Elimina un plano. Retorna 200 con data: null.
export async function deleteBlueprint(author, name) {
  return http(
    `${BASE}/${encodeURIComponent(author)}/${encodeURIComponent(name)}`,
    { method: 'DELETE' }
  )
}