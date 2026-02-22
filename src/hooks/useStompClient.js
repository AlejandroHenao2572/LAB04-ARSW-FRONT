import { useEffect, useRef, useState } from 'react'
import { createStompClient } from '../lib/stompClient.js'

// Gestiona el ciclo de vida completo del cliente STOMP:
//   mount   → activate()
//   unmount → deactivate()
//
// Expone { client, ready } donde:
//   client → la instancia de Client
//   ready  → boolean: true solo cuando onConnect disparó (el broker confirmó la sesión)
export function useStompClient() {
  const clientRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const stompClient = createStompClient()

    stompClient.onConnect = () => {
      setReady(true)
    }

    stompClient.onDisconnect = () => {
      setReady(false)
    }

    stompClient.activate()          // Abre el WebSocket y negocia el handshake STOMP
    clientRef.current = stompClient

    return () => {
      stompClient.deactivate()      // Cierra limpiamente al desmontar el componente raíz
      setReady(false)
    }
  }, [])                            // Sin dependencias: se ejecuta solo una vez

  return { client: clientRef.current, ready }
}