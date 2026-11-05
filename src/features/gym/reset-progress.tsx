"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { messages } from "@/config/messages";
import { resetGymProgress } from "./use-gym";

const r = messages.gym.trainer.reset;

/**
 * "Danger zone": erase the game's progress. The dialog lists exactly what goes away and only
 * enables the button once the confirmation word is typed, so it can't happen by a stray tap.
 */
export function ResetProgress() {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [done, setDone] = useState(false);
  const confirmed = typed.trim().toUpperCase() === r.word;

  function close() {
    setOpen(false);
    setTyped("");
  }

  function reset() {
    resetGymProgress();
    close();
    setDone(true);
  }

  return (
    <Card className="border-primary-600 grid content-start gap-3 border-2" data-testid="reset">
      <h2 className="text-[0.65rem]">{r.title}</h2>
      <p className="text-muted text-sm">{r.text}</p>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Trash2 aria-hidden className="size-4" />
        {r.button}
      </Button>
      <p className="text-sm font-bold" role="status">
        {done ? r.done : ""}
      </p>
      {open && (
        <Dialog open title={r.dialogTitle} onClose={close} testId="reset-dialog">
          <div className="grid gap-3 text-sm">
            <p className="font-bold">{r.lose}</p>
            <ul className="grid list-disc gap-1 pl-5">
              {r.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="text-muted">{r.keep}</p>
            <label className="grid gap-1">
              <span className="font-display text-[0.6rem]">{r.confirmLabel}</span>
              <input
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                className="border-border bg-background min-h-11 rounded-xl border-2 px-3 text-base"
                autoComplete="off"
                autoCapitalize="characters"
              />
            </label>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="secondary" onClick={close} autoFocus>
                {r.cancel}
              </Button>
              <Button disabled={!confirmed} onClick={reset}>
                <Trash2 aria-hidden className="size-4" />
                {r.confirm}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </Card>
  );
}
