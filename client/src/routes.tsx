import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "./components/Layout/AppShell";
import { Dashboard } from "./pages/Dashboard";
import { LessonList } from "./pages/LessonList";
import { LessonView } from "./pages/LessonView";
import { Practice } from "./pages/Practice";
import { Theory } from "./pages/Theory";
import { JamCoach } from "./pages/JamCoach";
import { Settings } from "./pages/Settings";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "lessons", element: <LessonList /> },
      { path: "lessons/:id", element: <LessonView /> },
      { path: "practice", element: <Practice /> },
      { path: "theory", element: <Theory /> },
      { path: "jam", element: <JamCoach /> },
      { path: "settings", element: <Settings /> },
    ],
  },
]);
