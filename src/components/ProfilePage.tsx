import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";

/**
 * User profile page showing account info and actions.
 * Premium dark design with glass card.
 */
export function ProfilePage() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated || !user) {
    navigate("/signin");
    return null;
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="glass rounded-2xl p-8 shadow-2xl">
          {/* Avatar */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center text-3xl font-bold text-primary">
              {user.email.charAt(0).toUpperCase()}
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              {user.username || user.email.split("@")[0]}
            </h1>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>

          {/* Profile info */}
          <div className="space-y-4 mb-8">
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface border border-custom">
              <span className="text-sm text-fog">Email</span>
              <span className="text-sm font-medium text-gray-100">{user.email}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface border border-custom">
              <span className="text-sm text-fog">User ID</span>
              <span className="text-xs font-mono text-gray-300 truncate max-w-[180px]">{user.user_id}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface border border-custom">
              <span className="text-sm text-fog">Plan</span>
              <span className="text-sm font-medium text-leaf">Free</span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => navigate("/")}
              className="w-full py-2.5 rounded-lg font-medium text-white border border-primary/50 text-primary hover:bg-primary/10 transition-all"
            >
              Go to Dashboard
            </button>
            <button
              onClick={logout}
              className="w-full py-2.5 rounded-lg font-medium text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
