import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Modal } from './Modal'
import { useUIStore } from '@/stores/uiStore'
import { BrandLogo } from '@/components/brand/BrandLogo'
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
      <div className="flex flex-col items-center text-center mb-8 gap-6">
        <div className="border-[3px] border-double border-ink bg-parchment p-3 rounded-sm" style={{ boxShadow: '4px 4px 0 0 #1a1a1a' }}>
          <BrandLogo noBlend className="w-16 h-16" />
        </div>
        <div>
          <div className="font-display text-2xl font-bold text-gray-900 mb-3 leading-relaxed">Welcome, Wanderer</div>
          <p className="text-base text-gray-800 leading-relaxed font-mono max-w-md mx-auto">
            Sign in to begin your quest. Upload captures, earn XP, unlock badges, and rise through the ranks.
          </p>
        </div>
      </div>

      <label className="flex items-start gap-4 mb-8 cursor-pointer group">
        <input
          type="checkbox"
          checked={tosAccepted}
          onChange={(e) => setTosAccepted(e.target.checked)}
          className="mt-1 w-5 h-5 accent-wax-red border-2 border-ink rounded-sm shrink-0"
        />
        <span className="text-base text-gray-800 group-hover:text-gray-900 transition-colors leading-relaxed text-left">
          I accept the{' '}
          <Link
            to="/terms"
            onClick={() => setLoginModalOpen(false)}
            className="text-wax-red underline decoration-dashed underline-offset-2 hover:text-gray-900"
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
        className="w-full flex items-center justify-center gap-3 px-6 py-3 min-h-[3.25rem] border-2 border-ink bg-ink text-parchment text-base font-display font-bold transition-colors hover:bg-[#2a2a2a] disabled:opacity-25 disabled:cursor-not-allowed leading-relaxed"
        style={{ boxShadow: '4px 4px 0 0 #1a1a1a' }}
      >
        <Github size={22} strokeWidth={1.75} className="shrink-0" />
        Continue with GitHub
      </button>

      <p className="text-sm text-gray-700 text-center mt-8 font-mono leading-relaxed">
        Your GitHub profile will be used to forge your player identity.
      </p>
    </Modal>
  )
}
