import { supabase } from './supabase'

export async function getPerfil() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('perfis')
    .select('papel')
    .eq('id', user.id)
    .single()

  return { user, papel: data?.papel || 'leitura' }
}

export async function logout() {
  await supabase.auth.signOut()
  window.location.href = '/login'
}