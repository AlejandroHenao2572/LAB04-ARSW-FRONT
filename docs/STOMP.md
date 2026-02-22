# STOMP (WebSocket) 

Documentacion de como el frontend usa STOMP sobre WebSocket para la sincronización en tiempo real de blueprints.


## Resumen de arquitectura

- Endpoint WebSocket (handshake) del backend: `/ws-blueprints`
- Prefijo de aplicación para mensajes entrantes: `/app` (ej. `/app/draw`)
- Prefijo para el broker/redistribución a clientes: `/topic`
- Convención de topic por plano: `/topic/blueprints.{author}.{name}`

El frontend: conecta al WebSocket, se suscribe al topic del blueprint activo y publica puntos a `/app/draw`. El servidor persiste el punto y reenvía el blueprint completo a todos los suscriptores.

## Variables de entorno y URL 

- `VITE_API_BASE` — URL base de la API (por defecto `http://localhost:8080`).

El cliente STOMP construye la URL del WebSocket derivada de `VITE_API_BASE` transformando `http(s)` → `ws(s)` y añadiendo `/ws-blueprints`:

```javascript
const WS_URL = `${(import.meta.env.VITE_API_BASE ?? 'http://localhost:8080')
  .replace(/^http/, 'ws')}/ws-blueprints`
```

## Conexión del cliente STOMP

```js
import { Client } from '@stomp/stompjs'

function createStompClient(wsUrl) {
  return new Client({
    brokerURL: wsUrl,
    reconnectDelay: 3000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    onStompError: (frame) => console.error('STOMP error', frame.headers),
  })
}

// Uso
const client = createStompClient(WS_URL)
client.onConnect = () => { /* ready */ }
client.activate()
// client.deactivate() para cerrar
```

El hook `useStompClient(enabled)` crea y activa el cliente cuando `enabled === true`, expone `{ client, ready }` y desactiva al desmontar o cuando `enabled` pasa a `false`.

## Suscripción a topics

Cada blueprint tiene un topic único. Al cambiar de plano el cliente debe:

1. Cancelar la suscripción anterior: `subscription.unsubscribe()`.
2. Suscribirse al nuevo topic: `client.subscribe(`/topic/blueprints.${author}.${name}`, handler)`.

```js
function subscribeToBlueprint(client, author, name, onMessage) {
  const topic = `/topic/blueprints.${author}.${name}`
  return client.subscribe(topic, (frame) => {
    const blueprint = JSON.parse(frame.body)
    onMessage(blueprint)
  })
}
```

El `onMessage` debe reemplazar el estado del canvas con la versión enviada por el servidor.

## Publicación de eventos de dibujo

El cliente publica cada clic en `/app/draw`. El servidor procesa el mensaje (persiste) y reenvía la representación completa del blueprint.

```js
function publishPoint(client, author, name, point) {
  if (!client.connected) return
  client.publish({
    destination: '/app/draw',
    body: JSON.stringify({ author, name, point }),
  })
}
```

## Integración con `useCanvas`

`useCanvas` combina REST para carga inicial y STOMP para la sincronización en tiempo real. A continuación se muestra el fragmento real usado en la implementación (comentarios en español):

```javascript
// src/hooks/useCanvas.js
import { useEffect, useRef, useState } from 'react'
import { getBlueprint } from '../lib/blueprintApi.js'
import { subscribeToBlueprint, publishPoint } from '../lib/stompClient.js'

export function useCanvas(client, ready, author, name) {
  const [points, setPoints] = useState([])
  const subscriptionRef = useRef(null)
  const loadIdRef       = useRef(0)

  useEffect(() => {
    if (!author || !name) return

    // Cancela suscripción previa
    subscriptionRef.current?.unsubscribe()
    subscriptionRef.current = null

    // Limpia canvas mientras carga
    setPoints([])

    const currentLoadId = ++loadIdRef.current

    // Carga REST del estado inicial
    getBlueprint(author, name)
      .then((bp) => {
        if (loadIdRef.current !== currentLoadId) return // respuesta stale
        setPoints(bp.points ?? [])
      })
      .catch(console.error)

    // Suscribe al topic STOMP si el cliente está listo
    if (ready && client) {
      subscriptionRef.current = subscribeToBlueprint(
        client,
        author,
        name,
        (bp) => {
          // El servidor envía el Blueprint completo — fuente de verdad
          setPoints(bp.points ?? [])
        }
      )
    }

    return () => {
      subscriptionRef.current?.unsubscribe()
      subscriptionRef.current = null
    }
  }, [client, ready, author, name])

  // Envía el punto al servidor vía STOMP (no dibuja localmente)
  function sendPoint(x, y) {
    if (!ready || !client) return
    publishPoint(client, author, name, { x, y })
  }

  return { points, sendPoint }
}
```

Puntos clave:
- `getBlueprint(author, name)` trae el estado persistido antes de subscribirse.
- La suscripción STOMP reemplaza el estado local con la versión del servidor (evita conflictos y mantiene el servidor como fuente de verdad).
- `sendPoint` publica a `/app/draw`; el servidor persiste y reenvía el blueprint actualizado.

## Integración con la API REST

El cliente combina REST y STOMP: REST para obtener estado inicial y operaciones CRUD, STOMP para sincronización en tiempo real.

Estos son los fragmentos principales del cliente HTTP (`src/lib/blueprintApi.js`) usado por los hooks:

```javascript
const BASE = `${import.meta.env.VITE_API_BASE ?? 'http://localhost:8080'}/api/v1/blueprints`

async function http(input, init) {
  const res = await fetch(input, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })

  const body = await res.json() // ApiResponse<T>

  if (!res.ok) {
    throw new Error(body.message ?? `HTTP ${res.status}`)
  }

  return body.data
}

export async function getBlueprintsByAuthor(author) {
  const blueprints = await http(`${BASE}/${encodeURIComponent(author)}`)
  return blueprints.map(bp => ({
    name:       bp.name,
    author:     bp.author,
    pointCount: bp.points?.length ?? 0,
  }))
}

export async function getBlueprint(author, name) {
  return http(`${BASE}/${encodeURIComponent(author)}/${encodeURIComponent(name)}`)
}

export async function createBlueprint(payload) {
  return http(BASE, { method: 'POST', body: JSON.stringify(payload) })
}

export async function addPoint(author, name, point) {
  return http(
    `${BASE}/${encodeURIComponent(author)}/${encodeURIComponent(name)}/points`,
    { method: 'PUT', body: JSON.stringify(point) }
  )
}

export async function deleteBlueprint(author, name) {
  return http(
    `${BASE}/${encodeURIComponent(author)}/${encodeURIComponent(name)}`,
    { method: 'DELETE' }
  )
}
```
- La función `http` extrae `data` del `ApiResponse` del backend y lanza errores con `body.message` cuando procede.
- `getBlueprintsByAuthor` mapea los blueprints a una vista ligera para la tabla del autor (sin enviar puntos completos hasta que se soliciten).
- `addPoint` es el endpoint que el servidor llama internamente cuando procesa un evento STOMP — el frontend no lo invoca directamente en el flujo colaborativo, sino que publica al broker y espera el eco.


## Como probar y ejecutar

1. Iniciar el servidor spring con el backend `http://localhost:8080/`
2. Iniciar el frontend `http://localhost:5173/`
3. Selecionar Tecnologia STOMP, Autor y un plano
4. Abrir simultaneamente otro navegador para ver real time  

![alt text](ejecucion.png)