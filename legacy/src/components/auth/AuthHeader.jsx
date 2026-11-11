import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AuthHeader({ title }) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center relative h-14 mb-8">
      <button
        onClick={() => navigate(-1)}
        className="h-10 w-10 -ml-2 rounded-full flex items-center justify-center hover:bg-muted absolute left-0"
        aria-label="Retour"
      >
        <ChevronLeft className="w-6 h-6 text-foreground" />
      </button>
      <h1 className="text-lg font-medium text-foreground text-center w-full px-10 whitespace-nowrap truncate">{title}</h1>
    </div>
  );
}