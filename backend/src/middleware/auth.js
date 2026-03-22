import { supabase, supabaseAdmin } from '../config/supabase.js'

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticação necessário' })
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    return res.status(401).json({ error: 'Token inválido ou expirado' })
  }

  req.user = user
  req.token = token
  next()
}

export async function requireAdmin(req, res, next) {
  await requireAuth(req, res, async () => {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', req.user.id)
      .single()

    if (!profile || !['admin', 'manager'].includes(profile.role)) {
      return res.status(403).json({ error: 'Acesso restrito a administradores' })
    }
    req.profile = profile
    next()
  })
}