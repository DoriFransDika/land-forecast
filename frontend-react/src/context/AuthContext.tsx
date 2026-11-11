import React, { createContext, useContext, useState, useEffect } from 'react'

export type UserRole = 'Admin' | 'Peneliti'

export interface User {
  email: string
  role: UserRole
  name: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, pass: string) => { success: boolean; message?: string }
  logout: () => void
  switchRole: (role: UserRole) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('geo_auth_user')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return null
      }
    }
    // Default logged in as Admin for seamless development experience
    return {
      email: 'admin@gmail.com',
      role: 'Admin',
      name: 'Administrator Spasial',
    }
  })

  useEffect(() => {
    if (user) {
      localStorage.setItem('geo_auth_user', JSON.stringify(user))
    } else {
      localStorage.removeItem('geo_auth_user')
    }
  }, [user])

  const login = (email: string, pass: string) => {
    const trimmedEmail = email.trim().toLowerCase()
    const trimmedPass = pass.trim()

    if (trimmedEmail === 'admin@gmail.com' && trimmedPass === 'admin123') {
      const loggedUser: User = {
        email: 'admin@gmail.com',
        role: 'Admin',
        name: 'Administrator Spasial',
      }
      setUser(loggedUser)
      return { success: true }
    }

    if (trimmedEmail === 'peneliti@gmail.com' && trimmedPass === 'peneliti123') {
      const loggedUser: User = {
        email: 'peneliti@gmail.com',
        role: 'Peneliti',
        name: 'Peneliti Ahli GIS',
      }
      setUser(loggedUser)
      return { success: true }
    }

    return {
      success: false,
      message: 'Kredensial tidak valid. Silakan periksa email dan kata sandi Anda.',
    }
  }

  const logout = () => {
    setUser(null)
  }

  const switchRole = (role: UserRole) => {
    if (role === 'Admin') {
      setUser({
        email: 'admin@gmail.com',
        role: 'Admin',
        name: 'Administrator Spasial',
      })
    } else {
      setUser({
        email: 'peneliti@gmail.com',
        role: 'Peneliti',
        name: 'Peneliti Ahli GIS',
      })
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, switchRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

