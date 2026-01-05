"use client";

import { useState } from "react";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";

export default function AuthCard() {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="relative w-full max-w-md h-[680px] perspective-1000">
      <div
        className={`relative w-full h-full preserve-3d transition-transform duration-700 ${
          isFlipped ? "rotate-y-180" : ""
        }`}
      >
        <div className="absolute inset-0 w-full h-full backface-hidden">
          <LoginForm onFlip={() => setIsFlipped(true)} />
        </div>
        <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180">
          <SignupForm onFlip={() => setIsFlipped(false)} />
        </div>
      </div>
    </div>
  );
}

