import { Moon, Sun } from "@phosphor-icons/react";
import { useTheme } from "next-themes";
import { flushSync } from "react-dom";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const handleThemeChange = (newTheme: string, e: React.MouseEvent) => {
    const doc = document as any;
    if (
      !doc.startViewTransition ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setTheme(newTheme);
      return;
    }

    const btn = document.getElementById("theme-toggle-btn");
    let x = e.clientX || window.innerWidth / 2;
    let y = e.clientY || window.innerHeight / 2;

    if (btn) {
      const rect = btn.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    }

    document.documentElement.style.setProperty("--click-x", `${x}px`);
    document.documentElement.style.setProperty("--click-y", `${y}px`);

    const transition = doc.startViewTransition(() => {
      flushSync(() => {
        setTheme(newTheme);
      });
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button id="theme-toggle-btn" variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[8rem]">
        <DropdownMenuItem onClick={(e) => handleThemeChange("light", e)} className="flex items-center justify-between cursor-pointer">
          <span>Light</span>
          {theme === "light" && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => handleThemeChange("dark", e)} className="flex items-center justify-between cursor-pointer">
          <span>Dark</span>
          {theme === "dark" && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => handleThemeChange("system", e)} className="flex items-center justify-between cursor-pointer">
          <span>System</span>
          {theme === "system" && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
