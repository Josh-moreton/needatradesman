"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeftRight } from "lucide-react";

interface NetTargetSwitchProps {
  mode: "GROSS" | "NET_TARGET";
  onModeChange: (mode: "GROSS" | "NET_TARGET") => void;
  disabled?: boolean;
}

export function NetTargetSwitch({
  mode,
  onModeChange,
  disabled = false,
}: NetTargetSwitchProps) {
  const isNetMode = mode === "NET_TARGET";

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onModeChange(isNetMode ? "GROSS" : "NET_TARGET")}
        disabled={disabled}
        className="gap-2"
      >
        <ArrowLeftRight className="h-4 w-4" />
        {isNetMode ? "Switch to gross quote" : "Set a net target"}
      </Button>
      {isNetMode && (
        <span className="text-xs text-muted-foreground">
          (Enter what you want to receive after fees)
        </span>
      )}
    </div>
  );
}
