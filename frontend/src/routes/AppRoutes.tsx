import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { DashboardPage } from "../pages/DashboardPage";
import { GamePage } from "../pages/GamePage";
import { HistoryPage } from "../pages/HistoryPage";
import { NewGamePage } from "../pages/NewGamePage";
import { RulesPage } from "../pages/RulesPage";

// All signed-in routes render inside the AppShell layout (top bar + bottom nav + <Outlet/>).
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="games/new" element={<NewGamePage />} />
        <Route path="games/:id" element={<GamePage />} />
        <Route path="rules" element={<RulesPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
