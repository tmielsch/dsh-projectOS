# Patch-Inventur — was am installierten DSH verändert ist (Stand 2026-10-28)

Quelle: `~/.dsh/patches/` (42 Einträge), `~/.dsh/profiles/web/cordis.patch.yml`, `~/.dsh/doctor.sh`, Haiku-Inventur plus
Nachprüfung des Leads. **MESSUNG** = Kopfkommentar und `--status` gelesen; Rümpfe von `delegate-send`, `goal-await`,
`teammate-remove`, `team-rente`, `teammate-model`, `member-model`, `reasoning-guard` **nicht** vollständig gelesen.
Zwei Arten von Eingriff: **A** = Datei im DSH-Paket wird direkt umgeschrieben (`allow-*.mjs`, wirkt bis zum nächsten DSH-Update,
`--status` und `--revert` vorhanden); **B** = Plugin im Profil (`cordis.patch.yml`), lädt beim Start, DSH-Dateien bleiben unberührt.

| # | Patch | Art | Wirkung (ein Satz) | Zielpaket | doctor prüft | verteilt |
|---|---|---|---|---|---|---|
| 1 | `allow-child-goal-resume` / `child-goal-resume` | A | Kind-Sitzung darf ihr pausiertes Ziel wieder aufnehmen | dsh-tool-goal | ja | nein |
| 2 | `allow-child-session-routing` / `child-session-routing` | A | lebende Kind-Sitzung ist bedienbar (Start, Löschen, Umbenennen) | dsh-api-session-controller | ja | nein |
| 3 | `allow-subagent-goals` / `goals-for-subagents` | A | Ziel-Werkzeuge auch für Teammitglieder und Unteragenten | dsh-tool-goal | ja | nein |
| 4 | `allow-subagent-model-fields` / `subagent-model-fields` | A | `provider`, `model`, `reasoning_effort` für `delegate_task` | dsh-tool-subagent | ja | nein |
| 5 | `allow-subagent-rolle` / `subagent-rolle` | A | Feld `rolle`: Textbaustein aus `~/.dsh/rollen/` vor den Auftrag | dsh-tool-subagent | ja | nein |
| 6 | `allow-subagent-files` / `subagent-files` | A | Büroklammer im Chat eines Unteragenten für beliebige Dateien | Browser- und Host-Leitung | ja | nein |
| 7 | `allow-member-images` / `member-images` | A+B | Bild-Anhänge im Chat eines Teammitglieds | dsh-client-ui-conversation | ja | nein |
| 8 | `allow-member-model` / `member-model` | A+B | Modellwahl im Chat eines Teammitglieds (Browser-Teil) | dsh-client-ui-model-selection | **nein** | nein |
| 9 | `delegate-send` | B | Teammitglied kann den eigenen Unteragenten anschreiben (`agent_id`) | dsh-tools, dsh-subagent, Upload | nein | nein |
| 10 | `teammate-model` | B | Teammitglied auf anderem Modell als der Lead | dsh-tool-subagent | nein | nein |
| 11 | `goal-await` | B | `await_goal_dependency`: Ziel wartet statt Runden zu verbrennen | dsh-goal, dsh-goal-round-driver, dsh-tool-goal | nein | nein |
| 12 | `reasoning-guard` | B | Denkspuren gehen nicht mehr an den Anbieter | dsh-agent-loop | nein | **ja** (einziger) |
| 13 | `system-prompt-ohne-modell` | B | Modellname aus dem Persona-Satz, Cache-Präfix bleibt gleich | dsh-web-app | nein | nein |
| 14 | `team-rente` (**Fremd-Patch** von ExpertKT) | A | Phase `retired`/`resting`, `retire_teammate`, `/team retire\|rest\|work\|model\|add` | dsh-experimental-agent-team, `-tool-agent-team` | nein | nein |
| 15 | `teammate-remove` | — | **stillgelegt** (hat nie funktioniert, ersetzt durch Nr. 14) | — | — | — |
| 16 | `stille-nachrichten` | B | `send_message` bekommt `quiet: true`: Direkt-Nachricht an ein Mitglied, ohne Lead-Kaskade | dsh-experimental-tool-agent-team, `-agent-team`, dsh-system-prompt | nein | nein |

**Nr. 16 (Anordnung des Menschen 2026-10-30, Stand 2026-10-30):** Ursache gemessen — `dsh-experimental-tool-agent-team`
schreibt in jedes Mitglied einen Reminder (Zeile 87–88: „To message your Team Lead, use send_message({target:'lead'})“)
und die Lead-Policy (Zeile 28) verlangt, dass der Lead auf jedes Mitglied wartet; `send_message` hat nur die Felder
`target` und `message`, sein Ergebnis-Schema ist `additionalProperties:false` (Zeile 322ff), kann also keinen Hinweis an
den Absender tragen. Der Patch gibt dem Werkzeug das optionale Feld `quiet`, setzt einen Vermerk in die Nachricht
(„nur für dich, antworte in diesem Thread, dem Lead nichts melden“), gibt dem Absender den Hinweis aus der ersetzten
`execute`, und schreibt die Kaskaden-Regel in den System-Prompt jedes Mitglieds (`order 610`) und des Leads.
Selbstprüfung: `node ~/.dsh/patches/stille-nachrichten.mjs` → „alles in Ordnung“. Zurück: Eintrag aus
`cordis.patch.yml` entfernen und DSH neu starten.

**Zum Limit der Teammitglieder (MESSUNG):** Kein Patch ändert es. Die Grenze `maxMembers` (Standardwert im Kern 16, im Bundle 8) steht
als Einstellung im Profil auf **32** (`cordis.patch.yml` Zeile 1156). Der Fremd-Patch Nr. 14 ändert nur die **Zählung**: entlassene
Mitglieder (`retired`) zählen nicht mehr mit (Kern Zeile 665).

**Eigene Ordner (MESSUNG):** `dsh-agent-team-patch` = ExpertKT-Repo, **fremde Organisation**, Lizenz nicht geprüft, Quelle von Nr. 14;
`dsh-fork-tree` = eigenes Repo, Fork-Tab für `dsh-better-sidebar`, **kein** Bezug zu Agent-Teams; `dsh-agent-compact` = eigenes Release
(`@tmielsch/rolling-compaction`), eigenes Repo; `dsh-houdini`, `cleanup-agents` = kein Repo, Zweck nicht belegt.

## Entschieden am 2026-10-29 (SPEC A14): Team-Patches liegen jetzt hier, `team-rente` bleibt draußen
- **Eingezogen** in `patches/` (und als Verweise nach `~/.dsh/patches/` gehängt): Nr. 1–6, 9, 10, 11 samt Selbsttests und den Notizen `KIND-SITZUNGEN.md`, `UEBERGABE-2026-10-25-unteragenten.md`; die Rollen in `rollen/`.
- **`delegate-send` und `teammate-model`** wurden dabei an einer Stelle geändert: der Vergleich „wurde diese Datei direkt gestartet“ löst jetzt den Verweis auf (`realpathSync`), sonst hätte ihr Selbsttest über den Verweis nichts mehr geprüft (MESSUNG: `argv[1]` bleibt der Verweispfad, `import.meta.url` ist der echte Pfad). Die Fassung vor der Änderung liegt in `~/.dsh/patches/backup-projectos-links/`.
- **Nr. 14 `team-rente` (ExpertKT)** bleibt draußen und steht als externe Abhängigkeit in der `README.md`.
- **Bleiben draußen:** Nr. 7, 8 (Browser-Teile, doctor prüft Nr. 8 nicht), 12, 13, `dsh-fork-tree`, `dsh-agent-compact`.

## Frühere Fassung dieses Vorschlags (vor der Entscheidung)
- **Gehören hinein** (betreffen Teams, Unteragenten, Ziele): Nr. 1–6, 9, 10, 11 und die Rollen aus `~/.dsh/rollen/`. Sie werden Unterordner
  `patches/` mit demselben `--status`/`--revert`-Verhalten und je einem Selbsttest.
- **Bleiben draußen** (kein Team-Bezug): Nr. 12, 13 (Anbieter und Prompt), `dsh-fork-tree`, `dsh-agent-compact`.
- **Vor dem Einziehen klären:** Nr. 7 und 8 (Bilder und Modellwahl im Mitglied-Chat; Team-Bezug ja, aber Browser-Teile), Nr. 14 (Fremdcode,
  Lizenz und Einverständnis des Autors klären; die Alternative ist, die Rente nachzubauen).
- **Neue Repos nötig:** keines. Alles lässt sich als Unterordner in dsh-projectOS führen; später abtrennen, wenn es sich lohnt.
