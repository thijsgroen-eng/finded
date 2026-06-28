'use client'

export function LogoutButton() {
  async function logout() {
    await fetch('/api/portal/logout', { method: 'POST' })
    window.location.href = '/portal/login'
  }
  return (
    <button onClick={logout}
      style={{ fontSize: 13, fontWeight: 600, color: '#9a9fb6', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 9, padding: '8px 14px', cursor: 'pointer' }}>
      Log out
    </button>
  )
}
