"use client";

import LoginForm from "./LoginForm";

/**
 * Production-ready Auth Card Component
 * Public registration is disabled - only admin can create user accounts
 * Users should contact their administrator to get login credentials
 */
export default function AuthCard() {
  return (
    <div className="relative w-full max-w-md">
      <LoginForm />
    </div>
  );
}

