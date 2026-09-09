import React, { useState } from 'react'
import Login from './Login'
import { Signup } from './Signup'
import RoleSelectionScreen from './RoleSelectionScreen'
import { useAuth } from '../contexts/AuthContext'
import type { Role } from './RoleContext'

export function AuthWrapper({ children }: { children: any }) {
  const [showSignup, setShowSignup] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
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

  // Step 1: No role selected yet → show role selection screen
  if (!selectedRole) {
    return (
      <RoleSelectionScreen
        onSelectRole={(role) => {
          if (role === 'guest') {
            continueAsGuest();
          } else {
            setSelectedRole(role);
            setShowSignup(false);
          }
        }}
      />
    );
  }

  // Step 2: Role selected → show login or signup
  const handleChangeRole = () => {
    setSelectedRole(null);
    setShowSignup(false);
  };

  return (
    <>
      {showSignup ? (
        <Signup
          role={selectedRole}
          onChangeRole={handleChangeRole}
          onSignup={(email, password, name, role, extraFields) =>
            signup(email, password, name, role, extraFields)
          }
          onSwitchToLogin={() => setShowSignup(false)}
          onGuestLogin={continueAsGuest}
        />
      ) : (
        <Login
          role={selectedRole}
          onChangeRole={handleChangeRole}
          onLogin={(email, password) => login(email, password, selectedRole)}
          onSwitchToSignup={() => setShowSignup(true)}
          onGuestLogin={continueAsGuest}
        />
      )}
    </>
  );
}
