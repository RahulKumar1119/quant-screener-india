import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./hooks/useTheme";
import { NavigationHeader } from "./components/NavigationHeader";
import { AnalyticsPage } from "./components/AnalyticsPage";
import { CustomScreenerPage } from "./components/CustomScreenerPage";

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
          <NavigationHeader />
          <Routes>
            <Route path="/" element={<AnalyticsPage />} />
            <Route path="/:ticker" element={<AnalyticsPage />} />
            <Route path="/screener" element={<CustomScreenerPage />} />
          </Routes>
        </div>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
