"use client";

import { useReducer, useLayoutEffect } from "react";
import { toast } from "sonner";

interface PasswordGuardProps {
  children: React.ReactNode;
}

interface State {
  authenticated: boolean;
  password: string;
  submitting: boolean;
  hydrated: boolean;
}

type Action =
  | { type: "SET_AUTHENTICATED"; payload: boolean }
  | { type: "SET_PASSWORD"; payload: string }
  | { type: "SET_SUBMITTING"; payload: boolean }
  | { type: "SET_HYDRATED" }
  | { type: "LOGOUT" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_AUTHENTICATED":
      return { ...state, authenticated: action.payload };
    case "SET_PASSWORD":
      return { ...state, password: action.payload };
    case "SET_SUBMITTING":
      return { ...state, submitting: action.payload };
    case "SET_HYDRATED":
      const isAuth = localStorage.getItem("manage_auth") === "true";
      return { ...state, authenticated: isAuth, hydrated: true };
    case "LOGOUT":
      localStorage.removeItem("manage_auth");
      return { ...state, authenticated: false, password: "" };
    default:
      return state;
  }
}

const initialState: State = {
  authenticated: false,
  password: "",
  submitting: false,
  hydrated: false,
};

export default function PasswordGuard({ children }: PasswordGuardProps) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useLayoutEffect(() => {
    dispatch({ type: "SET_HYDRATED" });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    dispatch({ type: "SET_SUBMITTING", payload: true });

    try {
      const res = await fetch("/api/auth/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: state.password }),
      });

      if (res.ok) {
        localStorage.setItem("manage_auth", "true");
        dispatch({ type: "SET_AUTHENTICATED", payload: true });
        dispatch({ type: "SET_PASSWORD", payload: "" });
        toast.success("Access granted");
      } else {
        toast.error("Incorrect password");
      }
    } catch {
      toast.error("Error verifying password");
    } finally {
      dispatch({ type: "SET_SUBMITTING", payload: false });
    }
  }

  function handleLogout() {
    dispatch({ type: "LOGOUT" });
  }

  // During hydration, show a neutral loading state (matches server-side default)
  if (!state.hydrated) {
    return <div className="min-h-screen" />;
  }

  if (!state.authenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-sm w-full bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-4">Manage Access</h1>
          <p className="text-gray-600 mb-6">
            Enter the password to access this page.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={state.password}
                onChange={(e) =>
                  dispatch({ type: "SET_PASSWORD", payload: e.target.value })
                }
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Enter password"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={state.submitting}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {state.submitting ? "Verifying..." : "Access"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={handleLogout}
          className="rounded-md bg-destructive px-3 py-1 text-xs text-destructive-foreground hover:opacity-90"
        >
          Logout
        </button>
      </div>
      {children}
    </div>
  );
}
