# Kind-Sitzungen bedienbar halten — Befund und zwei Patches

**Stand:** 2026-10-25, dsh 0.2.0-rc.2 unter `/opt/homebrew/lib/node_modules`.
**Anlass:** Beim Teammitglied „strata-hda-experte" (Sitzung `ec5d9db0`) kam bei
Starten, Löschen, Umbenennen und Rollback die Meldung
`session "ec5d9db0-…" is owned by subagent routing`. Besonders schlimm war es,
als das eigene Ziel des Teammitglieds pausiert war: danach ging von keiner Seite
mehr etwas.

## Was gemessen falsch stand

Der Kern hat genau eine gemeinsame Prüfung, `hasApiSessionSubagentOwner` in
`@deepseek-ai/dsh-api-session-controller`. Sie erklärt jede Sitzung mit
`header.origin === "subagent"` für fremd verwaltet — **auch wenn ihr Agent
läuft**. Diese Prüfung sitzt unter anderem in `liveAgent()`, und `liveAgent()`
ist die erste Station von `resolve()`, also der Auflösung hinter dem
Agent-Lookup des Gateways (`ctx.typert.lookups.configure("agent", …)`).

An dieser einen Sperre hingen deshalb: `goals.*` (die Zielkarte), `commands.*`
(also `/rollback`, `/goal`, `/plan`), `session.rename`, `session.selectModel`,
`terminal.*`, `fileUploads.*` und `userQuestions.*`.

Für ein pausiertes Ziel ergab das drei verschlossene Wege:

1. **Das Modell** darf ein pausiertes Ziel nicht fortsetzen; im Werkzeug steht
   dafür hart `GOAL_TOOL_RESUME_PAUSED`.
2. **Der Mensch** darf es, aber nur über die Zielkarte — und die läuft über den
   Lookup. Ist der Teammate untätig, entsorgt DSH seinen Agenten; dann findet
   der Lookup nichts mehr.
3. **Die Nachricht an das Kind** weckt es zwar wieder, gab ihm aber keine
   Erlaubnis, sein eigenes Ziel aufzunehmen — Weg 1.

## Die zwei Patches

| Werkzeug | Datei im Kern | Was es ändert |
|---|---|---|
| `allow-child-session-routing.mjs` | `dsh-api-session-controller/lib/index.js` | `liveAgent()` nimmt einen **lebenden** Kind-Agenten an; `session.prompt` weist eine Kind-Sitzung weiterhin auf den Kind-Weg (`subagents.prompt`). |
| `allow-child-goal-resume.mjs` | `dsh-tool-goal/lib/index.js` | Die Sperre `GOAL_TOOL_RESUME_PAUSED` gilt nur noch für eine **Wurzelsitzung**; eine Kind-Sitzung darf ihr pausiertes Ziel aufnehmen, wenn `requireDirectHuman` die Autorität gibt. Dazu der Beschreibungstext. |

**Bewusst nicht geändert:** `resolve()`, `resumeObserved()`, `createOrAdopt()`
und `cancel()`. Ein kaltes Kind über den gewöhnlichen Weg zu wecken erzeugte
einen Agenten ohne Eigentümer (Wurzelsitzung), während das Unteragenten-Routing
ihn später erneut aufbauen will — zwei Aufenthaltsräume für dieselbe Sitzung.
Ein kaltes Kind weckt man über eine Nachricht; danach ist es lebend und alles
andere greift. `cancel()` behält seine Sperre, weil der Kind-Weg dort
`subagents.interruptByParent` heißt und von der Oberfläche schon benutzt wird.

**Autorität bleibt Pflicht.** `requireDirectHuman` ist unverändert die Bedingung;
durch `goals-for-subagents.mjs` ist sie für Kind-Sitzungen bereits geöffnet:
menschliche Nachricht **oder** Auftrag des direkten Elternteils (Art
`agent-message` bzw. `team-message` vom eigenen `parentSession`). Eigeninitiative
(`model`, `tool`, `goal`) öffnet weiterhin nichts. In der Wurzelsitzung bleibt
es beim Menschen, weil ein selbst wieder scharf geschaltetes Ziel genau die
Pause aufhebt, die der Mensch eingelegt hat.

## Bedienung

```bash
node ~/.dsh/patches/allow-child-session-routing.mjs --status
node ~/.dsh/patches/allow-child-goal-resume.mjs --status
node ~/.dsh/patches/allow-child-session-routing.mjs     # freigeben
node ~/.dsh/patches/allow-child-goal-resume.mjs
node ~/.dsh/patches/allow-child-session-routing.mjs --revert   # zurücknehmen
node ~/.dsh/patches/allow-child-goal-resume.mjs --revert
```

Selbstprüfung der Textumwandlung, ohne eine Datei anzufassen:

```bash
node ~/.dsh/patches/child-session-routing.mjs --test
node ~/.dsh/patches/child-goal-resume.mjs --test
```

**Nach dem Freigeben und nach dem Zurücknehmen muss `dsh web` neu starten**, weil
der Host die Module beim Start lädt. Ein DSH-Update überschreibt beide Dateien;
`bash ~/.dsh/doctor.sh` prüft sie seit dem 2026-10-25 mit und meldet dann
„gesperrt" mit dem passenden Befehl.

Originale liegen unter `patches/backup-child-session-routing/<zeitstempel>/` und
`patches/backup-child-goal-resume/<zeitstempel>/` (in `.gitignore`, weil fremder
Installationscode).
