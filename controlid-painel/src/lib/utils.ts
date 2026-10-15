import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// navigator.clipboard só existe em HTTPS/localhost; o painel roda em HTTP
// na rede interna, então cai no método antigo (textarea + execCommand).
export async function copyText(text: string): Promise<boolean> {
  if (window.isSecureContext && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // segue para o fallback
    }
  }
  const el = document.createElement("textarea")
  el.value = text
  el.setAttribute("readonly", "")
  el.style.position = "fixed"
  el.style.opacity = "0"
  document.body.appendChild(el)
  el.select()
  try {
    return document.execCommand("copy")
  } catch {
    return false
  } finally {
    document.body.removeChild(el)
  }
}
