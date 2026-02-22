import { useEffect, useRef, useState } from 'react'
import { createStompClient } from '../lib/stompClient.js'

// Gestiona el ciclo de vida completo del cliente STOMP:
//   mount   → activate()
//   unmount → deactivate()
//
// Expone { client, ready } donde:
//   client → la instancia de Client
//   ready  → boolean: true solo cuando onConnect disparó (el broker confirmó la sesión)
// Permite activar/desactivar la conexión STOMP desde el consumidor.
// Cuando `enabled` es false no se crea ni activa el cliente.
export function useStompClient(enabled = true) {
  const clientRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!enabled) {
      // Si había un cliente activo, ciérralo
      if (clientRef.current) {
        try { clientRef.current.deactivate() } catch (e) { /* ignore */ }
        clientRef.current = null
      }
      setReady(false)
      return
    }

    const stompClient = createStompClient()

    stompClient.onConnect = () => setReady(true)
    stompClient.onDisconnect = () => setReady(false)

    stompClient.activate()
    clientRef.current = stompClient

    return () => {
      try { stompClient.deactivate() } catch (e) { /* ignore */ }
      setReady(false)
    }
  }, [enabled])

  return { client: clientRef.current, ready }
}