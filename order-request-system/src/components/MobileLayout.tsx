import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export const MobileLayout = ({ children, showNav = true }: { children: ReactNode; showNav?: boolean }) => {
  return (
    <div className="flex min-h-screen justify-center bg-background">
      <div className="relative w-full max-w-md min-h-screen flex flex-col">
        <main className={`flex-1 ${showNav ? "pb-20" : ""}`}>{children}</main>
        {showNav && <BottomNav />}
      </div>
    </div>
  );
};
