// src/hooks/useCanvas.js
import { useEffect, useRef, useState } from 'react'
import { getBlueprint } from '../lib/blueprintApi.js'
import { subscribeToBlueprint, publishPoint } from '../lib/stompClient.js'

// Recibe el cliente STOMP ya creado (viene de useStompClient en App.jsx)
// Gestiona:
//   - Carga inicial de puntos via REST
//   - Suscripción dinámica al topic del plano activo
//   - Función sendPoint para que Canvas la llame al hacer clic
export function useCanvas(client, ready, author, name) {
  const [points, setPoints] = useState([])
  const subscriptionRef = useRef(null)
  const loadIdRef       = useRef(0)          // Guarda contra respuestas REST tardías

  // Carga inicial + re-suscripción cuando cambia autor/nombre
  useEffect(() => {
    if (!author || !name) return

    // 1. Cancela la suscripción STOMP del plano anterior
    subscriptionRef.current?.unsubscribe()
    subscriptionRef.current = null

    // 2. Limpia el canvas mientras carga
    setPoints([])

    // 3. Genera un ID de carga para detectar respuestas stale
    const currentLoadId = ++loadIdRef.current

    // 4. Carga REST del estado inicial (puntos ya persistidos)
    getBlueprint(author, name)
      .then((bp) => {
        if (loadIdRef.current !== currentLoadId) return  // respuesta stale → descarta
        setPoints(bp.points ?? [])
      })
      .catch(console.error)

    // 5. Se suscribe al topic STOMP solo si ya hay conexión activa
    if (ready && client) {
      subscriptionRef.current = subscribeToBlueprint(
        client,
        author,
        name,
        (bp) => {
          // El broker envía el Blueprint completo actualizado.
          // Reemplazamos los puntos con la versión del servidor (fuente de verdad).
          setPoints(bp.points ?? [])
        }
      )
    }

    return () => {
      subscriptionRef.current?.unsubscribe()
      subscriptionRef.current = null
    }
  }, [client, ready, author, name])

  // Envío de un punto al hacer clic en el canvas
  // NO dibuja localmente: espera el eco del broker para actualizar el estado.
  function sendPoint(x, y) {
    if (!ready || !client) return
    publishPoint(client, author, name, { x, y })
  }

  return { points, sendPoint }
}