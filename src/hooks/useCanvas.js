import { useEffect, useRef, useState } from 'react'
import { getBlueprint }                        from '../lib/blueprintApi.js'
import { subscribeToBlueprint, publishPoint }  from '../lib/stompClient.js'
import {
  joinRoom,
  leaveRoom,
  subscribeBlueprintUpdate,
  sendDrawEvent,
} from '../lib/socketIoClient.js'

export function useCanvas({ mode, client, ready, socket, connected }, author, name) {
  const [points, setPoints] = useState([])

  // STOMP: holds the Subscription object ({ unsubscribe() })
  // Socket.IO: holds the unsubscribe function returned by subscribeBlueprintUpdate
  const subscriptionRef = useRef(null)
  const loadIdRef       = useRef(0)          // guards against stale REST responses

  useEffect(() => {
    if (!author || !name) {
      setPoints([])
      return
    }

    // ── 1. Cancel previous subscription ───────────────────────────────────
    _cleanup(subscriptionRef.current)
    subscriptionRef.current = null
    setPoints([])

    // ── 2. Load initial state via REST ─────────────────────────────────────
    const currentLoadId = ++loadIdRef.current
    getBlueprint(author, name)
      .then((bp) => {
        if (loadIdRef.current !== currentLoadId) return   // stale → discard
        setPoints(bp.points ?? [])
      })
      .catch(console.error)

    // ── 3. Subscribe to real-time updates ─────────────────────────────────
    if (mode === 'stomp' && ready && client) {
      // STOMP: returns a Subscription with .unsubscribe()
      subscriptionRef.current = subscribeToBlueprint(
        client, author, name,
        (bp) => setPoints(bp.points ?? [])
      )
    } else if (mode === 'socketio' && connected && socket) {
      // Socket.IO: join the gateway room, then listen to broadcasts
      joinRoom(socket, author, name)

      // The gateway also sends blueprint-update on join-room (initial state).
      // We use it to override the REST load with the freshest server state.
      subscriptionRef.current = subscribeBlueprintUpdate(
        socket,
        (bp) => setPoints(bp.points ?? [])
      )
    }

    // ── 4. Cleanup on effect re-run or unmount ─────────────────────────────
    return () => {
      _cleanup(subscriptionRef.current)
      subscriptionRef.current = null

      if (mode === 'socketio' && socket && connected) {
        leaveRoom(socket, author, name)
      }
    }
  }, [mode, client, ready, socket, connected, author, name])

  // ── Send a point through the active transport ──────────────────────────────
  // The canvas is NOT updated optimistically; we wait for the server echo.
  function sendPoint(x, y) {
    if (mode === 'stomp') {
      if (!ready || !client) return
      publishPoint(client, author, name, { x, y })

    } else if (mode === 'socketio') {
      if (!connected || !socket) return
      sendDrawEvent(socket, author, name, { x, y })
        .then((ack) => {
          if (!ack?.ok) console.warn('[canvas] draw-event rejected by gateway:', ack?.message)
        })
        .catch((err) => console.error('[canvas] draw-event error:', err))
    }
  }

  return { points, sendPoint }
}

// ── Internal helpers ───────────────────────────────────────────────────────────

/**
 * Calls the appropriate teardown for either a STOMP Subscription object
 * or a plain unsubscribe function (Socket.IO).
 */
function _cleanup(sub) {
  if (!sub) return
  if (typeof sub === 'function') {
    sub()                  // Socket.IO: () => socket.off(...)
  } else {
    sub.unsubscribe?.()    // STOMP: Subscription.unsubscribe()
  }
}
