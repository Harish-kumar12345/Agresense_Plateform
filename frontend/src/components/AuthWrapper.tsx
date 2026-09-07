import React, { useState } from 'react'
import Login from './Login'
import { Signup } from './Signup'
import { useAuth } from '../contexts/AuthContext'

export function AuthWrapper({ children }: { children: any }) {
  const [showSignup, setShowSignup] = useState(false);
  const { user, isGuest, loading, login, signup, continueAsGuest } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-medium text-slate-300">Loading AgriSense...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated (logged in or guest), show the main app
  if (user || isGuest) {
    return <>{children}</>;
  }

  // Otherwise show login/signup
  return (
    <>
      {showSignup ? (
        <Signup
          onSignup={signup}
          onSwitchToLogin={() => setShowSignup(false)}
          onGuestLogin={continueAsGuest}
        />
      ) : (
        <Login 
          onLogin={login}
          onSwitchToSignup={() => setShowSignup(true)}
          onGuestLogin={continueAsGuest}
        />
      )}
    </>
  );
}

