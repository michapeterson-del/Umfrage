"use client";

import { useEffect, useRef, useState } from "react";
import {
  getOrCreateCreatorId,
  mergeSurveysIntoStorage,
  parseSurveyLink,
  saveSurveyToStorage,
  setCreatorId,
} from "@/lib/creatorStorage";

export default function AccountMenu({ dark = false }: { dark?: boolean }) {
  const [open, setOpen] = useState(false);
  const [creatorId, setCreatorIdState] = useState("");
  const [copied, setCopied] = useState(false);

  const [restoreInput, setRestoreInput] = useState("");
  const [restoring, setRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);

  const [linkInput, setLinkInput] = useState("");
  const [addingLink, setAddingLink] = useState(false);
  const [linkMessage, setLinkMessage] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time client-only read of browser APIs unavailable during SSR
    setCreatorIdState(getOrCreateCreatorId());
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleRestore() {
    const id = restoreInput.trim();
    setRestoreMessage(null);
    if (!id) {
      setRestoreMessage("Bitte gib deine Ersteller-ID ein.");
      return;
    }
    setRestoring(true);
    try {
      const res = await fetch(`/api/creator/${encodeURIComponent(id)}/surveys`);
      const data = await res.json();
      if (!res.ok) {
        setRestoreMessage(data.error ?? "Wiederherstellen fehlgeschlagen.");
        return;
      }
      const surveys = data.surveys ?? [];
      if (surveys.length === 0) {
        setRestoreMessage("Zu dieser ID wurden keine Umfragen gefunden.");
        return;
      }
      mergeSurveysIntoStorage(surveys);
      setCreatorId(id);
      setCreatorIdState(id);
      setRestoreInput("");
      setRestoreMessage(`${surveys.length} Umfrage(n) wiederhergestellt.`);
    } catch {
      setRestoreMessage("Verbindung fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setRestoring(false);
    }
  }

  async function handleAddLink() {
    setLinkMessage(null);
    const parsed = parseSurveyLink(linkInput);
    if (!parsed) {
      setLinkMessage("Das sieht nicht wie ein gültiger Ergebnis-Link aus.");
      return;
    }
    setAddingLink(true);
    try {
      const res = await fetch(`/api/surveys/${encodeURIComponent(parsed.id)}`);
      const data = await res.json();
      if (!res.ok) {
        setLinkMessage(data.error ?? "Umfrage nicht gefunden.");
        return;
      }
      saveSurveyToStorage({
        id: parsed.id,
        title: data.survey.title,
        adminToken: parsed.token,
        createdAt: data.survey.createdAt,
      });
      setLinkInput("");
      setLinkMessage(`"${data.survey.title}" wurde hinzugefügt.`);
    } catch {
      setLinkMessage("Verbindung fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setAddingLink(false);
    }
  }

  const buttonClass = dark
    ? "rounded-lg border border-white/20 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10"
    : "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50";

  return (
    <div ref={menuRef} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className={buttonClass}>
        Konto
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-lg">
          <div>
            <div className="text-xs font-medium text-slate-500">Deine Ersteller-ID</div>
            <div className="mt-1 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                {creatorId}
              </code>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(creatorId);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="shrink-0 rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                {copied ? "✓" : "Kopieren"}
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Sichere sie dir — damit findest du all deine Umfragen auf jedem Gerät wieder.
            </p>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-4">
            <div className="text-xs font-medium text-slate-500">Ersteller-ID eingeben</div>
            <p className="mt-1 text-xs text-slate-400">Stellt alle Umfragen dieser ID auf diesem Gerät wieder her.</p>
            <div className="mt-2 flex gap-2">
              <input
                value={restoreInput}
                onChange={(e) => setRestoreInput(e.target.value)}
                placeholder="Ersteller-ID"
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
              />
              <button
                type="button"
                onClick={handleRestore}
                disabled={restoring}
                className="shrink-0 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-60"
              >
                {restoring ? "…" : "Laden"}
              </button>
            </div>
            {restoreMessage && <p className="mt-1 text-xs text-slate-500">{restoreMessage}</p>}
          </div>

          <div className="mt-4 border-t border-slate-100 pt-4">
            <div className="text-xs font-medium text-slate-500">Umfrage-Ergebnis-Link eingeben</div>
            <p className="mt-1 text-xs text-slate-400">
              Wenn jemand eine Umfrage mit dir geteilt hat: Link hier einfügen, um sie zu deiner Liste
              hinzuzufügen.
            </p>
            <div className="mt-2 flex gap-2">
              <input
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                placeholder="Ergebnis-Link einfügen"
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
              />
              <button
                type="button"
                onClick={handleAddLink}
                disabled={addingLink}
                className="shrink-0 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-60"
              >
                {addingLink ? "…" : "Laden"}
              </button>
            </div>
            {linkMessage && <p className="mt-1 text-xs text-slate-500">{linkMessage}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
