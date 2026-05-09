import { useEffect, useCallback } from 'react'
import socket from '../lib/socket.js'

export function useSocket({ mode, onGameState, onGameOver, onPlayerLeft }) {

  useEffect(() => {
    if (mode !== 'pvp') return

    socket.connect()

    socket.on('gameState', (state) => {
      onGameState?.(state)
    })

    socket.on('gameOver', (result) => {
      onGameOver?.(result)
    })

    socket.on('playerLeft', (data) => {
      onPlayerLeft?.(data)
    })

    return () => {
      socket.off('gameState')
      socket.off('gameOver')
      socket.off('playerLeft')
      socket.disconnect()
    }
  }, [mode])

  const createRoom = useCallback((config) => {
    if (mode !== 'pvp') return
    socket.emit('createRoom', config)
  }, [mode])

  const joinRoom = useCallback((roomId) => {
    socket.emit('joinRoom', { roomId })
  }, [mode])

  const sendPaddleY = useCallback((roomId, y) => {
    if (mode !== 'pvp') return
    socket.emit('paddleMove', { roomId, y })
  }, [mode])

  return { createRoom, joinRoom, sendPaddleY }
}