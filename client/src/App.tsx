import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import { useUser } from "./store/userStore";
import { useSettings } from "./store/settingsStore";

export default function App() {
  const bootstrap = useUser((s) => s.bootstrap);
  const user = useUser((s) => s.user);
  const hydrate = useSettings((s) => s.hydrate);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (user?.settings) hydrate(user.settings);
  }, [user, hydrate]);

  return <RouterProvider router={router} />;
}
