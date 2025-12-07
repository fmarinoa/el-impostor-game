import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface RoomCodeProps {
  code: string;
}

export const RoomCode = ({ code }: RoomCodeProps) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-3 bg-card border-2 border-primary rounded-xl p-4 shadow-glow">
      <div className="flex-1">
        <p className="text-sm text-muted-foreground font-medium">
          Código de Sala
        </p>
        <p className="text-3xl font-bold text-primary tracking-wider">{code}</p>
      </div>
      <Button
        variant="outline"
        size="icon"
        onClick={copyToClipboard}
        className="h-12 w-12 border-primary hover:bg-primary hover:text-primary-foreground"
      >
        {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
      </Button>
    </div>
  );
};
