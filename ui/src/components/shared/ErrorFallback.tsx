import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ErrorFallbackProps {
  error?: Error | null;
  message?: string;
  onRetry?: () => void;
}

export function ErrorFallback({ error, message, onRetry }: ErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center" role="alert">
      <AlertTriangle className="h-10 w-10 text-destructive/60" aria-hidden="true" />
      <p className="text-sm font-medium text-foreground">
        {message || "页面出现错误"}
      </p>
      {error && (
        <p className="max-w-md text-xs text-muted-foreground">
          {error.message}
        </p>
      )}
      {onRetry && (
        <Button variant="outline" size="sm" className="min-h-[44px]" onClick={onRetry}>
          重试
        </Button>
      )}
    </div>
  );
}
