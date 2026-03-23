import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabase.js'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async (userId) => {
    if (!userId) { setProfile(null); return }
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data ?? null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      loadProfile(session?.user?.id)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      loadProfile(session?.user?.id)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Login com email + senha
  const signInWithPassword = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  // Cadastro com email + senha
  const signUp = async (email, password, name) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } }
    })
    if (error) throw error
  }

  // Enviar OTP (recuperação de senha ou verificação)
  const sendOtp = async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    })
    if (error) throw error
  }

  // Verificar OTP
  const verifyOtp = async (email, token) => {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
    if (error) throw error
  }

  // Redefinir senha após OTP verificado
  const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  }

  // Manter compatibilidade com código legado
  const signInWithEmail = sendOtp

  const signOut = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      signInWithPassword,
      signUp,
      sendOtp,
      verifyOtp,
      updatePassword,
      signInWithEmail,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)