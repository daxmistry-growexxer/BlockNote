import { Blocks } from "lucide-react";
import { Link } from "react-router-dom";

function LogoContent({ className = "" }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Blocks className="h-4 w-4" aria-hidden="true" />
      </span>
      <span>BlockNote</span>
    </span>
  );
}

export default function BrandLogo({ linked = false, className = "" }) {
  if (linked) {
    return (
      <Link to="/" aria-label="BlockNote home">
        <LogoContent className={className} />
      </Link>
    );
  }

  return <LogoContent className={className} />;
}