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
import { getRoleFromToken } from '../utils/jwt'

const STORAGE_KEY = 'auth.token'

export const AuthContext = createContext(null)

/**
 * Hook para consumir el contexto de autenticación.
 *
 * @returns {{ token: string | null, student: any, isAuthenticated: boolean, login: Function, logout: Function }}
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
 * - Guarda el token en `localStorage`.
 * - Configura el header `Authorization: Bearer` en Axios.
 */
export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY)
    } catch {
      return null
    }
  })
  const [student, setStudent] = useState(null)
  const [role, setRole] = useState(() => getRoleFromToken(token))

  useEffect(() => {
    setApiAuthToken(token)
  }, [token])

  const login = useCallback(({ token: nextToken, student: nextStudent }) => {
    localStorage.setItem(STORAGE_KEY, nextToken)
    setToken(nextToken)
    setStudent(nextStudent || null)
    setRole(getRoleFromToken(nextToken))
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setToken(null)
    setStudent(null)
    setRole(null)
  }, [])

  const value = useMemo(() => {
    return {
      token,
      student,
      role,
      isAuthenticated: Boolean(token),
      isAdmin: role === 'ADMIN',
      isStudent: role === 'ESTUDIANTE',
      login,
      logout,
    }
  }, [token, student, role, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
