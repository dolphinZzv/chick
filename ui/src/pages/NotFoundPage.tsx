import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20">
      <h1 className="text-3xl font-light text-muted-foreground">404</h1>
      <p className="text-sm text-muted-foreground">页面不存在</p>
      <Link
        to="/"
        className="inline-flex items-center justify-center rounded-md bg-foreground/10 px-3 py-1.5 text-sm text-foreground hover:bg-foreground/20 transition-colors"
      >
        返回首页
      </Link>
    </div>
  );
}
