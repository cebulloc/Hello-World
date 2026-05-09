import { Outlet } from "react-router-dom";
import { TopBar } from "./TopBar";
import { MobileTabBar, SideNav } from "./SideNav";

export function AppShell() {
  return (
    <div className="min-h-full flex flex-col">
      <TopBar />
      <div className="flex flex-1 min-h-0">
        <SideNav />
        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-20 md:pb-8">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
      <MobileTabBar />
    </div>
  );
}
