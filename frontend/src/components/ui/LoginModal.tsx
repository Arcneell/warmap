import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Modal } from './Modal'
import { useUIStore } from '@/stores/uiStore'
import { Github } from 'lucide-react'

export function LoginModal() {
  const { loginModalOpen, setLoginModalOpen } = useUIStore()
  const [tosAccepted, setTosAccepted] = useState(false)

  const loginGithub = async () => {
    if (!tosAccepted) return
    try {
      const res = await fetch('/api/v1/auth/login/github')
      const data = await res.json()
      window.location.href = data.redirect_url
    } catch (e) {
      console.error('GitHub login failed:', e)
    }
  }

  return (
    <Modal open={loginModalOpen} onClose={() => setLoginModalOpen(false)} title="Join the Guild">
      <div className="text-center mb-5">
        <div className="font-display text-xl font-bold text-ink mb-2">Welcome, Wanderer</div>
        <p className="text-xs text-sepia leading-relaxed font-mono">
          Sign in to begin your quest. Upload captures, earn XP, unlock badges, and rise through the ranks.
        </p>
      </div>

      <label className="flex items-start gap-2.5 mb-5 cursor-pointer group">
        <input
          type="checkbox"
          checked={tosAccepted}
          onChange={(e) => setTosAccepted(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-wax-red border-2 border-ink rounded-sm"
        />
        <span className="text-[11px] text-sepia group-hover:text-ink transition-colors leading-relaxed">
          I accept the{' '}
          <Link
            to="/terms"
            onClick={() => setLoginModalOpen(false)}
            className="text-wax-red underline decoration-dashed underline-offset-2 hover:text-ink"
          >
            Terms of Service
          </Link>
          . I understand that uploaded data will be publicly visible and aggregated.
        </span>
      </label>

      <button
        type="button"
        onClick={loginGithub}
        disabled={!tosAccepted}
        className="w-full flex items-center justify-center gap-2.5 px-5 py-2.5 border-2 border-ink bg-ink text-parchment text-sm font-display font-bold transition-colors hover:bg-[#2a2a2a] disabled:opacity-25 disabled:cursor-not-allowed"
        style={{ boxShadow: '4px 4px 0 0 #1a1a1a' }}
      >
        <Github size={18} strokeWidth={1.75} className="shrink-0" />
        Continue with GitHub
      </button>

      <p className="text-[9px] text-muted text-center mt-4 font-mono">
        Your GitHub profile will be used to forge your player identity.
      </p>
    </Modal>
  )
}
