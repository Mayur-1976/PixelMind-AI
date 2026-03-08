import { SignedIn, SignedOut, SignIn, SignUp } from "@clerk/clerk-react";
import { useState } from "react";
import Dashboard from "./pages/Dashboard";

export default function App() {
  const [showSignUp, setShowSignUp] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center font-sans text-slate-200">
      <SignedOut>
        <div className="flex flex-col items-center bg-[#13131a] p-8 rounded-2xl shadow-2xl border border-[#1e1e2e]">
          {showSignUp ? (
            <div className="flex flex-col items-center">
              <SignUp routing="hash" />
              <button 
                className="mt-6 text-sm text-primary hover:text-indigo-400 transition-colors cursor-pointer"
                onClick={() => setShowSignUp(false)}
              >
                Already have an account? Sign In
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <SignIn routing="hash" />
              <button 
                className="mt-6 text-sm text-primary hover:text-indigo-400 transition-colors cursor-pointer"
                onClick={() => setShowSignUp(true)}
              >
                Don't have an account? Sign Up
              </button>
            </div>
          )}
        </div>
      </SignedOut>

      <SignedIn>
        <Dashboard />
      </SignedIn>
    </div>
  );
}
