import { AuthProvider } from "@lars-kluijtmans/react-auth";
import { authConfig } from "./authConfig";
import { BrandingThemeProvider } from "./branding/BrandingThemeProvider";
import { Gate } from "./components/Gate";

// Provider order: AuthProvider (session) → BrandingThemeProvider (theme from project branding) →
// Gate (login form vs app shell).
export function App() {
  return (
    <AuthProvider config={authConfig}>
      <BrandingThemeProvider>
        <Gate />
      </BrandingThemeProvider>
    </AuthProvider>
  );
}
