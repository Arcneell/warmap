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
    <Modal open={loginModalOpen} onClose={() => setLoginModalOpen(false)} title="Join the Hunt">
      <div className="text-center mb-6">
        <div className="font-display text-2xl font-bold text-primary mb-2">Welcome, Scanner</div>
        <p className="text-sm text-secondary">
          Sign in to start your wardriving journey. Upload captures, earn XP, unlock badges, and climb the leaderboard.
        </p>
      </div>

      {/* ToS acceptance */}
      <label className="flex items-start gap-3 mb-5 cursor-pointer group">
        <input
          type="checkbox"
          checked={tosAccepted}
          onChange={(e) => setTosAccepted(e.target.checked)}
          className="mt-0.5 accent-wifi"
        />
        <span className="text-xs text-secondary group-hover:text-primary transition-colors leading-relaxed">
          I have read and agree to the{' '}
          <Link
            to="/terms"
            onClick={() => setLoginModalOpen(false)}
            className="text-wifi hover:underline"
          >
            Terms of Service
          </Link>
          . I understand that data I upload will be publicly visible and aggregated with other users' data.
        </span>
      </label>

      <button
        onClick={loginGithub}
        disabled={!tosAccepted}
        className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl bg-[#24292e] hover:bg-[#2f363d] text-white font-semibold transition-colors border border-[#3d4148] disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <Github size={20} />
        Continue with GitHub
      </button>

      <p className="text-[10px] text-muted text-center mt-4">
        Your GitHub profile will be used to create your player identity.
      </p>
    </Modal>
  )
}
