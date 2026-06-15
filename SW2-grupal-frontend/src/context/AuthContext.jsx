/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { setApiAuthToken } from '../services/api'
import { getRoleFromToken, isTokenExpired } from '../utils/jwt'

const STORAGE_KEY = 'auth.token'

export const AuthContext = createContext(null)

/**
 * Hook para consumir el contexto de autenticación.
 *
 * @returns {{ token: string | null, student: any, isAuthenticated: boolean, isReady: boolean, login: Function, logout: Function }}
 */
export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>.')
  }
  return value
}

/**
 * Proveedor de autenticación para manejar el estado global del login.
 *
 * - Guarda el token en `sessionStorage` (aislado por pestaña).
 * - Configura el header `Authorization: Bearer` en Axios.
 * - Expone `isReady` para que las rutas protegigas no redirijan hasta
 *   que la inicialización haya terminado (evita flash de "Unauthorized" en F5).
 */
export function AuthProvider({ children }) {
  const [isReady, setIsReady] = useState(false)

  const [token, setToken] = useState(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY)
      // Si el token ya está expirado, lo descartamos de entrada
      if (stored && isTokenExpired(stored)) {
        sessionStorage.removeItem(STORAGE_KEY)
        return null
      }
      return stored
    } catch {
      return null
    }
  })
  const [student, setStudent] = useState(null)
  const [role, setRole] = useState(() => getRoleFromToken(token))

  // Sincronizar Axios y marcar como listo tras el primer render
  useEffect(() => {
    setApiAuthToken(token)
    setIsReady(true)
  }, [token])

  const login = useCallback(({ token: nextToken, student: nextStudent }) => {
    sessionStorage.setItem(STORAGE_KEY, nextToken)
    setToken(nextToken)
    setStudent(nextStudent || null)
    setRole(getRoleFromToken(nextToken))
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY)
    setToken(null)
    setStudent(null)
    setRole(null)
  }, [])

  const value = useMemo(() => {
    return {
      token,
      student,
      role,
      isReady,
      isAuthenticated: Boolean(token),
      isAdmin: ['ADMIN', 'SISTEMAS', 'ELECTORAL'].includes(role),
      isElector: ['ESTUDIANTE', 'DOCENTE', 'ADMINISTRATIVO'].includes(role),
      login,
      logout,
    }
  }, [token, student, role, isReady, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
