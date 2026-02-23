import { io } from 'socket.io-client'

/** URL of the Node.js Socket.IO gateway */
const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL ?? 'http://localhost:3000'


/**
 * Creates a Socket.IO client connected to the gateway.
 * The socket auto-connects; call socket.disconnect() to close it.
 *
 * @returns {import('socket.io-client').Socket}
 */
export function createSocketIoClient() {
  return io(GATEWAY_URL, {
    transports:          ['websocket', 'polling'], // prefer WebSocket, fall back to polling
    autoConnect:         true,
    reconnection:        true,
    reconnectionDelay:   2000,
    reconnectionAttempts: Infinity,
  })
}


/**
 * Joins the collaboration room for a specific blueprint.
 * The gateway will respond with an initial `blueprint-update` event containing
 * the current persisted state.
 *
 * @param {import('socket.io-client').Socket} socket
 * @param {string} author
 * @param {string} name
 */
export function joinRoom(socket, author, name) {
  socket.emit('join-room', { author, name })
}

/**
 * Leaves the collaboration room cleanly.
 * Call this before switching to a different blueprint.
 *
 * @param {import('socket.io-client').Socket} socket
 * @param {string} author
 * @param {string} name
 */
export function leaveRoom(socket, author, name) {
  socket.emit('leave-room', { author, name })
}


/**
 * Subscribes to `blueprint-update` events broadcast by the gateway.
 * Returns an unsubscribe function – call it to remove the listener.
 *
 * @param {import('socket.io-client').Socket} socket
 * @param {(blueprint: object) => void} onUpdate
 * @returns {() => void} unsubscribe function
 */
export function subscribeBlueprintUpdate(socket, onUpdate) {
  socket.on('blueprint-update', onUpdate)
  return () => socket.off('blueprint-update', onUpdate)
}


/**
 * Publishes a draw event to the gateway.
 *
 * Flow (handled server-side):
 *   1. Gateway persists the point via Spring Boot REST (PUT …/points)
 *   2. Gateway fetches the updated blueprint (GET …)
 *   3. Gateway broadcasts `blueprint-update` to every OTHER client in the room
 *
 * Uses the Socket.IO acknowledgement mechanism so callers can detect failures.
 *
 * @param {import('socket.io-client').Socket} socket
 * @param {string} author
 * @param {string} name
 * @param {{ x: number, y: number }} point
 * @returns {Promise<{ ok: boolean, message?: string }>}
 */
export function sendDrawEvent(socket, author, name, point) {
  return new Promise((resolve) => {
    socket.emit('draw-event', { author, name, point }, (ack) => {
      // ack is the callback argument sent by the gateway (optional)
      resolve(ack ?? { ok: true })
    })
  })
}