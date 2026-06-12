import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./hooks/useTheme";
import { AuthProvider } from "./hooks/useAuth";
import { NavigationHeader } from "./components/NavigationHeader";
import { HomePage } from "./components/HomePage";
import { AnalyticsPage } from "./components/AnalyticsPage";
import { CustomScreenerPage } from "./components/CustomScreenerPage";
import { SignUpPage } from "./components/SignUpPage";
import { SignInPage } from "./components/SignInPage";

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <div className="min-h-screen bg-surface text-gray-100">
            <NavigationHeader />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route path="/signin" element={<SignInPage />} />
              <Route path="/screener" element={<CustomScreenerPage />} />
              <Route path="/:ticker" element={<AnalyticsPage />} />
            </Routes>
          </div>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
