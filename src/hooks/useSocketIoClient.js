/**
 * src/hooks/useSocketIoClient.js
 *
 * Manages the full lifecycle of a Socket.IO client:
 *   mount   → creates the socket and starts auto-connect
 *   unmount → disconnects and removes all listeners
 *
 * Mirrors useStompClient.js in structure so App.jsx can treat both uniformly.
 *
 * Exposes { socket, connected } where:
 *   socket    → the Socket.IO instance (null while disabled)
 *   connected → true only after the 'connect' event fires
 *
 * @param {boolean} enabled – pass false to skip creation (e.g. when STOMP is active)
 */
import { useEffect, useRef, useState } from 'react'
import { createSocketIoClient } from '../lib/socketIoClient.js'

export function useSocketIoClient(enabled = true) {
  const socketRef           = useRef(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!enabled) {
      // Disconnect any living socket when the user switches away from Socket.IO
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      setConnected(false)
      return
    }

    const socket = createSocketIoClient()
    socketRef.current = socket

    //  Connection state listeners 
    const onConnect    = () => setConnected(true)
    const onDisconnect = () => setConnected(false)
    const onError      = (err) => console.error('[socket.io] Server error:', err?.message)
    const onWarning    = (w)   => console.warn('[socket.io] Server warning:', w?.message)

    socket.on('connect',    onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('error',      onError)
    socket.on('warning',    onWarning)

    //  Cleanup on disable or unmount 
    return () => {
      socket.off('connect',    onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('error',      onError)
      socket.off('warning',    onWarning)
      socket.disconnect()
      socketRef.current = null
      setConnected(false)
    }
  }, [enabled])

  return { socket: socketRef.current, connected }
}
