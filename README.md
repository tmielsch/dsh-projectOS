# dsh-projectOS

Ein Plugin für [DeepSeek Harness (DSH)](https://github.com/deepseek-ai), das aus den Agent-Teams einer Sitzung ein
sichtbares Betriebssystem für Agenten macht: **Abteilungen** (eine Teamsitzung mit ihrem Abteilungsleiter),
**Arbeitsgruppen** (ein Gruppenleiter mit seinen Facharbeitern) und ein **Kanban-Brett nach Arbeitern**, das immer nur
eine Ebene zeigt und in die Tiefe geht.

Die Entscheidungen des Menschen, die Messungen am Bestand und die offenen Fragen stehen in [`SPEC.md`](SPEC.md).
**Wer hier arbeitet, liest sie zuerst vollständig.**

## Was in diesem Ordner liegt — alles beieinander

| Ordner / Datei | Inhalt |
|---|---|
| `src/client/` | Das Browser-Plugin (Seite „Projekt-Manager“, Kanban, Texte in Deutsch und Englisch) |
| `agents/projectos-agents.md` | Zusatzanweisungen für alle Agenten (Namen, Titelzeile, gemeinsame Aufgaben, Live-Stand). Wird mit `scripts/agents-block.mjs` in `~/.dsh/AGENTS.md` eingesetzt |
| `patches/` | Die lokalen Patches am installierten DSH, soweit sie Teams, Unteragenten und Ziele betreffen, samt Selbsttests und Notizen |
| `rollen/` | Textbausteine für Facharbeiter (`redteam`, `projektmanager`, `draft`, `rag`) und der Entwurf der Team-Profile |
| `docs/PATCHES.md` | Inventur aller Patches: was jeder tut, was `doctor.sh` prüft, was hierher gehört und was nicht |
| `dsh-links.json` + `scripts/link-dsh.mjs` | Welche dieser Dateien als Verweise nach `~/.dsh` gehängt werden |
| `SPEC.md` | Die Spec dieses Repos |

## Auf einer Maschine einrichten

```bash
git clone git@github.com:tmielsch/dsh-projectOS.git ~/dsh-projectOS
cd ~/dsh-projectOS && npm install && npm test

# 1. Speicherpunkt des Konfigurations-Repos (immer vorher)
git -C ~/.dsh add -A && git -C ~/.dsh commit -m "vor projectOS-Verweise" && git -C ~/.dsh push

# 2. Verweise nach ~/.dsh: erst Trockenlauf lesen, dann anwenden
node scripts/link-dsh.mjs
node scripts/link-dsh.mjs --apply

# 3. Anweisungsblock einsetzen, danach ~/.dsh committen
node scripts/agents-block.mjs --install

# 4. Prüfen
bash ~/.dsh/doctor.sh
```

`link-dsh.mjs` ersetzt eine Datei **nur**, wenn sie byte-gleich mit der Datei im Repo ist. Weicht sie ab oder zeigt ein
Verweis woandershin, bleibt sie liegen und wird gemeldet. Zurück geht es mit `node scripts/link-dsh.mjs --revert`
(die Verweise werden durch Kopien ersetzt). Die Ordner `patches/backup-*` und alles andere in `~/.dsh` bleiben, wo sie sind.

## Externe Abhängigkeiten (gehören nicht zu diesem Repo)

| Abhängigkeit | Wozu | Pflicht? | Hinweis |
|---|---|---|---|
| **DSH** mit den Paketen `dsh-experimental-agent-team`, `…-tool-agent-team`, `…-client-ui-agent-team` (0.2.0-rc.2) | Teams, gemeinsame Aufgaben, Mitglieder | ja | kommt mit DSH |
| **`team-rente`** von **ExpertKT**, <https://github.com/ExpertKT/dsh-agent-team-patch> | Phase `retired`/`resting`, Werkzeug `retire_teammate`, Befehle `/team retire\|rest\|work\|model\|add` | nein, aber das Brett kennt die Phasen `resting` und `retired` und zeigt sie nur dann | **Fremder Code, Lizenz nicht geprüft, deshalb nicht in diesem Repo.** Eigenes Repo klonen und mit dessen `apply.mjs` einspielen; unsere Notiz dazu steht in `patches/TEAM-RENTE.md` (nur im Konfigurations-Repo `~/.dsh`) |
| **`gh`** (GitHub-Befehlszeile), angemeldet | Token für die geplante Brücke zu GitHub-Issues | nur für die Brücke; fehlt es, erscheint eine Warnung und die Brücke bleibt aus | SPEC A13 |
| `@linxin666/dsh-client-ui-task-board` | — | **nein** | Das Plugin hängt nicht daran. Im Profil abgeschaltet (`disabled: true`), kann bleiben, wie es ist |

## Lizenz

MIT, siehe [`LICENSE`](LICENSE).
