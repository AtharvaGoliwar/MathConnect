import React, { useState } from "react";
import { authService } from "../services/auth";
import { User } from "../types";
import { IconChevronRight } from "./Icons";
import "./LoginPage.css";

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Simulate network delay for realism
      await new Promise((resolve) => setTimeout(resolve, 800));

      const user = await authService.login(email, password);

      if (user) {
        onLoginSuccess(user);
      } else {
        setError("Invalid email or password");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-content">
          <div className="login-header">
            <h1 className="login-title">MathConnect</h1>
            <p className="login-subtitle">Sign in to your dashboard</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder="name@example.com"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="••••••••"
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" disabled={isLoading} className="login-button">
              {isLoading ? (
                <div className="spinner" />
              ) : (
                <>
                  Sign In{" "}
                  <IconChevronRight style={{ width: "1rem", height: "1rem" }} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
