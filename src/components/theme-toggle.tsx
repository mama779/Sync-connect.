
"use client"

import { Button } from "@/components/ui/button"
import { useTheme } from "./theme-context"
import { Moon, Sun } from "lucide-react"
import { useState, useEffect } from "react"

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Evitar errores de hidratación esperando a que el componente monte en el cliente
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-9 h-9" />; // Espacio reservado para evitar saltos de layout
  }

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={toggleTheme} 
      className="w-9 h-9 px-0 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors group"
    >
      {theme === 'light' ? (
        <Moon className="h-4 w-4 text-slate-600 transition-transform group-hover:-rotate-12" />
      ) : (
        <Sun className="h-4 w-4 text-primary transition-transform group-hover:rotate-90" />
      )}
      <span className="sr-only">Cambiar tema</span>
    </Button>
  );
}
