import { cn } from "@/lib/utils";

export const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm", className)}>
    {children}
  </div>
);

export const Badge = ({ children, variant = "default" }: { children: React.ReactNode, variant?: "default" | "destructive" | "success" }) => {
  const styles = {
    default: "bg-slate-800 text-slate-300",
    destructive: "bg-red-900/50 text-red-200 border border-red-800",
    success: "bg-emerald-900/50 text-emerald-200 border border-emerald-800"
  };
  return <span className={cn("px-2 py-1 text-xs font-medium rounded-md", styles[variant])}>{children}</span>;
};

export const ProgressBar = ({ value, className }: { value: number; className?: string }) => (
  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
    <div 
      className={cn("h-full transition-all duration-1000", className)} 
      style={{ width: `${value}%`, backgroundColor: value < 50 ? '#ef4444' : value < 80 ? '#f59e0b' : '#10b981' }} 
    />
  </div>
);