# dsh-projectOS — Spec (Stand 2026-10-28, Entwurf Nr. 1)

> Diese Datei ist die Spec dieses Repos. Sie wächst durch Gespräch mit dem Menschen (Tilman).
> Jede neue Entscheidung wird sofort mit Datum und in seinen Worten eingetragen.
> Wer hier arbeitet, liest sie vollständig, bevor er etwas tut. Eine Zusammenfassung gibt sie nie
> mit eigenen Worten wieder.
> Abschnitt A enthält nur Wörtliches und Entscheidungen des Menschen. Abschnitt B enthält gemessene
> Tatsachen über das Bestehende. Abschnitt C enthält **Vorschläge des Agenten**, sie sind noch
> **keine Entscheidungen**. Abschnitt D enthält offene Fragen.

## Name und Zweck in einem Satz

`dsh-projectOS` ist ein Plugin für DeepSeek Harness (DSH), das aus den Agent-Teams einer Projektsitzung
ein sichtbares Betriebssystem für eine Agenten-Firma macht: Abteilungen, Gruppen, Mitarbeiter, ein
Kanban-Brett, das nach Arbeitern statt nach Aufgaben sortiert ist, und bearbeitbare Profile je Ebene.

---

## A. Entscheidungen und Wünsche des Menschen (wörtlich)

### A1 — Der Auftrag, 2026-10-28

> „von mir aus können wir einen richtigen department manager bauen, wo man quasi alle TLs des agent teams
> plugins als Departments sieht, und in den departments sind dann die experten, die wiederrum dann die fach
> und generellen arbeiter haben."

> „In diesem manager sollte ersichtlich sein, welche presets für welches hierarchische Level gelten, die
> möglichkeit bestehen, team presets zu editieren etc."

> „Es gibt hier einmal das Taskboard, das ist ein externes Plugin, das ist sowas wie ein Kanban-Board, und
> wir hatten ein bisschen Schwierigkeiten damit, aber sowas wie ein Kanban, ein Team-Kanban zu haben, wo
> quasi alle Departments […] das wäre dann mein eigenes Taskboard, was vielleicht ein bisschen mehr sich mit
> dem Agent-Teams-Plugin integriert. Wir können auch gerne das normale Taskboard-Plugin dann abschalten und
> das einfach nur als Quelle für das Kanban, für die Kanban-Logik nutzen, dass wir nicht das nicht nochmal
> entwickeln müssen"

> „wenn ich auf ein Team eine Karte auf dem Kanban-Board ist dann eine Session mitsamt alle gepinnten
> Sessions an dieses, so, und jede Session hat quasi ihr eigenes Kanban-Board […] ich stelle mir halt so
> genestete Kanban-Boards vor, wo quasi der Departmentsleiter hat sein Kanban-Board auf Department-Level,
> und da sind halt die ganzen Experten drin, was deren Status gerade ist, arbeiten die gerade an irgendwas,
> und das ist dann halt ein Kanban-Board, was nicht Task-orientiert ist, sondern was arbeiterorientiert
> ist, also wir drehen so ein bisschen das Prinzip um, und ja, dann kann man halt über diese Oberfläche
> reingehen und halt sehen, wer macht was"

> „vielleicht so ein, wie so eine Art Betriebssystem auch für ein Agent-Department halt. Ich würde das Ganze
> dann auch richtig als, weiss ich nicht, ob Department das richtige Wort dafür ist, so, aber Agent, also
> es ist halt mehr als Team, weil es halt wirklich schon eine richtige Hierarchie wie aus einer Firma ist"

> „das wäre dann ein Projekt, also es wäre dann projektweit, jede Session in einem Projekt, die als Team
> initialisiert wird, taucht dann da auf"

> „momentan in DSH ist das so, dass wenn ich jetzt auf ein Projekt klicke, dann wird es einfach auf und zu
> geklappt, und da sind so zwei Buttons, wo ich dann die drei Punkte habe für Rename oder New Session. Ich
> könnte noch einen dritten Button da haben, und das wäre irgendwie der Manager-Button, der mich in das
> Manager-Dashboard für das Projekt bringt, und da sehe ich dann quasi alle Experten-Teams […] und kann
> dann halt in der Hierarchie immer weiter abtauchen und habe dann halt dieses Kanban, was quasi der
> zentrale Ort ist, dann vielleicht unten eine Werkzeugleiste oder so, wie so ein Doc, wo verschiedene
> Werkzeuge drin sind, wie man das Ganze steuern kann und vielleicht irgendwie Infrastruktur, damit Agents
> zusammenarbeiten können, effektiver"

> „hier würde ich halt so gerne so viel wie möglich von den vorhandenen DSH-Plugins nutzen, wie zum Beispiel
> das Agent-Teams und das Automation-Tasks-Plugin, weil es gibt ja schon sowas wie Shared Tasks und so, wo
> dieses ganze Dependency-Management in Teamarbeit und so ja schon mit integriert ist, darauf sollte man
> auf jeden Fall aufbauen."

### A2 — Frühere Entscheidungen, die hierher gehören (aus der Sitzung vom 2026-10-27)

- **Drei Ebenen:** Teamlead = Abteilungsleiter → Experten = Gruppenleiter → Facharbeiter (Unteragenten der
  Experten, `delegate_task`). Facharbeiter sind relativ statische Rollen (Red-Team, Projektmanager, Recherche,
  Draft, RAG, allgemeine Arbeiter).
- **Zwei Profilebenen:** ein **Abteilungsprofil** setzt den Rahmen (Modelle je Ebene, erlaubte Rollen mit
  Höchstzahl, Obergrenzen); ein **Gruppenprofil** gehört einem Experten und darf den Rahmen **verengen und
  erweitern**; jede Abweichung steht sichtbar im Feld `abweichungVomRahmen` mit Begründung; der Teamlead
  genehmigt, der Mensch erfährt es im Zwischenfazit. Das bestätigte Gruppenprofil ist die Erlaubnis zum
  Einstellen. Harte Grenzen außerhalb der Profile bleiben (`maxDepth`, `maxMembers`, höchstens 3
  gleichzeitige Worker, Liste erlaubter Modelle).
- **Solo ist das Standardprofil** (Einzelchats fragen nichts); ein hartes Gate gibt es nur bei ausdrücklicher
  Teambildung.
- Ein Plugin als eigenes Repo (Erweiterung des Agent-Teams-Plugins, Paketdatei von einer GitHub-Release-Adresse)
  ist erwünscht; hier ist es.
- Der Entwurf der Profil-Dateien steht in `~/.dsh/rollen/_ENTWURF-team-profile.md` (Quelle dieser Spec für
  Dateiformate; wird beim Bauen hierher übernommen).

### A3 — Repo, 2026-10-28

> „https://github.com/tmielsch/dsh-projectOS Ist public, aber GH ist ja auch installiert. Es ist ein leeres
> Repo, kannst du machen, was du willst"

### A4 — Zugang und Chat-Knopf, 2026-10-28

> „Ja neben dem taskboard, und dann einen shortcut im chat irgendwo. Vllt neben den existing task controls
> button einen button, der einen direkt zum relevanten team im manager schickt?"

Entschieden: (1) eigene Zeile **neben dem Task-Board** in der Seitenleiste (Weg a aus C3); (2) zusätzlich ein
**Knopf im Chat** neben „Existing task controls“, der direkt zum **relevanten Team** im Manager führt. Der Knopf in
der Projektzeile (Wunsch aus A1) bleibt zurückgestellt, bis es im DSH-Kern einen Slot dafür gibt.

---

## B. Gemessener Bestand (Stand 2026-10-28, MESSUNG am Mac, DSH-Installation und Profil)

Jeder Punkt ist aus Dateien gelesen. Wäre er falsch, stünde die Zeile anders in der genannten Datei.

**B1 — Agent-Teams-Plugin (Kern).** Pakete `@deepseek-ai/dsh-experimental-agent-team` (Logik),
`…-tool-agent-team` (Werkzeuge), `…-client-ui-agent-team` (Oberfläche), Version 0.2.0-rc.2, im Bundle
`dsh-experimental-agent-team-profile`.
- Daten pro Mitglied (`TeamMemberView`): `id`, `name`, `role` (`lead`|`teammate`), `status`
  (`running`|`inactive`|`provisioning`|`failed`), `description`, `provider`, `context` (`fresh`|`fork`), `model`.
- Geteilte Aufgaben (`TeamTaskView`): `id`, `revision`, `subject`, `description`, `status`
  (`pending`|`in_progress`|`completed`|`deleted`), `blockedBy[]`, `writeScopes[]`, `ownerName`, `ready`,
  `writeScopeWarnings[]`. Abhängigkeitsverwaltung (`task-graph`, `blockedBy`, `ready`) ist bereits eingebaut.
- Zustand lebt als **Projektion** (`agentTeam`, Ereignisse `team/member`, `team/task`, `team/message/queued`,
  `team/message/delivered`) und ist mit `teamProjectionView` als `TeamProjection {members, tasks, failure}` abrufbar.
- Genau **eine** Team-Ebene: jede Sitzung, mit der der Mensch spricht, ist implizit Lead (`TeamId = SessionId`).
  Ein Teammitglied kann keine Teammitglieder starten (`TEAM_LEAD_REQUIRED`).
- Konfiguration: `maxMembers`, `maxTasks`, `maxPendingMessagesPerMember`, `maxMessageBytes`, `disposalTimeoutMs`.
  In diesem Profil `maxMembers: 32` (`~/.dsh/profiles/web/cordis.patch.yml`, Zeile ≈1153).
- Befehl `/team` ist belegt (`list | retire | rest | work | model | add`), kennt keine Rollen und keine Profile.

**B2 — Unteragenten (`delegate_task`).** Persönliche Facharbeiter eines Experten, `maxDepth: 2`
(Teamlead 0 → Experte 1 → Facharbeiter 2). Sie sind **keine** Teammitglieder und erscheinen nicht in der
Team-Projektion; die Hierarchie Experte → Facharbeiter ist deshalb aus dem Team-Plugin allein **nicht** lesbar.
**Herkunftsfelder im Sitzungskopf (MESSUNG, `dsh-session/lib/types/types.d.ts` Zeilen 66–85):** `cwd?` (Arbeitsordner,
gesetzt aus `workspace.path`), `parentSession?` („Sitzung, aus der diese geforkt wurde"), `origin?: 'subagent'`
(„grobe Produktklassifizierung für ein Unteragenten-Kind"), `delegationDepth?`. Ein Unteragent ist damit an
`origin === 'subagent'` plus `parentSession` erkennbar; das Team-Plugin verwendet `parentSession` ebenfalls (liest
`agent.session.header.parentSession`, `agent-team/lib/index.js` Zeilen 404, 626, 766). **Noch ungemessen:** ob auch
Teammitglieder `origin === 'subagent'` tragen und woran man Teammitglied von `delegate_task`-Facharbeiter im Kopf
unterscheidet (Vorschlag: Teammitglied = steht in `agentTeam.members` der Wurzelsitzung; Facharbeiter = `origin
=== 'subagent'` und `parentSession` zeigt auf ein Mitglied).
Lokaler Patch `~/.dsh/patches/subagent-rolle.mjs` ergänzt das Feld `rolle` (Textbaustein aus `~/.dsh/rollen/`).

**B3 — Task-Board-Plugin (extern).** `@linxin666/dsh-client-ui-task-board` 0.4.5 (Apache-2.0, Quelle im Repo
`dsh-web`-Familie des Autors). Host-eigenes Hauptbuch unter `~/.dsh/task-board/ledger-v2.json`, fünf Spalten
(Backlog, To Do, Running, Done, Failed), Unteraufgaben bis Tiefe 3, Kaskadenläufe, **Agent-Team-Läufe**
(`teamRun`: ein Lead, ein Teammitglied je Unteraufgabe), Cron-Planer, Tags, Projektfilter, Ziel- und
Abnahme-Gate, acht Agentenwerkzeuge `task_board_*`, SSE-Synchronisation, Einzelheiten in dessen README.
Es kennt **Aufgaben als Karten**, nicht Arbeiter als Karten.
Aufbau (MESSUNG): Board-Oberfläche in `src/client/board/` (`TaskBoard.tsx` 558 Zeilen mit Ziehen und Ablegen,
`TaskCard.tsx` 315, `TaskDetail.tsx` 784, `NewTaskModal.tsx` 587, `board.module.css` 1837 u. a.); die Oberfläche hängt am
`BoardController` (`src/core/controller.ts`), am Store (`src/core/store.ts`) und an `src/client/locales.ts` (772 Zeilen),
ein Herauslösen des Ordners allein genügt also **nicht**. Das Paket exportiert `./client` und `./src/*`. Karten im
Hauptbuch tragen u. a. `id, title, description, prompt, status, executions, teamRun, tags, parentId`. Erweiterungsschnittstelle
für fremde Quellen: `TaskBoardExtension` mit `start?(host)` und `handleAction?(request)`, Anmeldung über
`registerExtension(extension)` (`src/host/extension-registry.ts:196`), genutzt vom GitHub-Plugin
`@linxin666/dsh-client-ui-task-board-github`. **Lizenz Apache-2.0** (LICENSE Abschnitt 4): geänderte Dateien müssen
deutlich als geändert gekennzeichnet werden; liegt eine NOTICE-Datei bei, ist ihr Inhalt zu übernehmen (im Paket wurde
keine gefunden). Keine Rechtsberatung. Es wird als Seitenleistenzeile und Seite im
mittleren Bereich eingehängt (Slots des Shell-Layouts).

**B4 — Oberfläche (Einhängepunkte).** Das Plugin-System der Weboberfläche arbeitet mit **Slots**
(`ctx.slots.inject(<name>, …)` und `ctx.slots.register`). Gemessen vorhanden:
- `sidebar.panellist` — Zeilen der Seitenleisten-Panelliste (so hängt sich das Task-Board ein).
- `sidebar.workspaces.session.row.action` — Knopf in der **Sitzungszeile** der Projektliste.
- `sidebar.workspaces.session.menu.item` — Eintrag im Menü der Sitzungszeile.
- `conversation.session.header.actions` — Knopf in der Kopfzeile einer Unterhaltung (so macht es Agent-Teams).
- `shell.leading`, `sidebar.footer.action`, `sidebar.settings`.
- **Projektzeile (MESSUNG, vom Menschen-Wunsch betroffen):** Die Projektzeile ist die feste Funktion `ProjectRowItem`
  (`dsh-client-ui-workspace/lib/client.js`, Zeilen 1270–1375). Darin steht **kein** `renderSlot`; die Liste des
  Dreipunkte-Menüs ist fest (`workspaceMenuItems` = `rename`, `delete`, Zeile 1275ff.), der Knopf „Neue Sitzung“
  ist fest eingebaut (Zeile 1341ff.), aufgerufen ohne Slot in Zeile 2509. Die offiziell deklarierten Slots unter
  `sidebar.workspaces.*` sind nur `directoryFlow`, `session.menu.item`, `session.row.action` (letztere zwei
  gehören zur **Sitzungs**zeile). Ein dritter Knopf in der Projektzeile ist **ohne Änderung an `client.js` nicht
  möglich**. Weg über den Autor von DSH: ein neuer Slot `sidebar.workspaces.project.row.action`, analog zu
  `session.row.action` (Zeile 4314). Nicht geprüft: ob `ProjectRowItem` über Cordis-Dienste austauschbar ist.
- **Chat-Knopf (MESSUNG):** Der Knopf „Existing task controls“ stammt aus dem Plugin `dsh-codex-connect`
  (`lib/client.js` Zeilen 7408 und 7774–7779) und hängt im Slot `conversation.input.right` (`kind: 'list'`,
  `scope: 'session'`, deklariert in `dsh-client-ui-conversation/lib/types/client/contract/slots.d.ts` Zeile 235). Es ist
  ein **Listen-Slot**: mehrere Plugins können nebeneinander Einträge setzen, `order` bestimmt die Reihenfolge (dort 30).
  Unser Knopf geht damit **offiziell** an dieselbe Stelle, mit eigener `id` und `order`. Der Slot gilt je Sitzung, die
  Komponente kennt also die Sitzung, in der sie steht (Lesart; Props nicht vollständig gelesen).
- **Seitenleisten-Seite eines Plugins (MESSUNG, Vorlage):** `@linxin666/dsh-client-ui-task-board`
  `src/client/native-panel.tsx` Zeilen 116–131 registriert `slots.inject('sidebar.panellist', …register({name:
  'sidebar.panellist', id, order, label}, Icon))` für die Zeile in der Seitenleiste und `slots.inject('main', …
  register({name:'main', key:id, children:{…}, inject:()=>({controller})}, Panel))` für die Seite im mittleren
  Bereich. Das ist der Weg, den auch unser Plugin geht.

**B5 — Profile heute.** Es gibt Agent-Presets, Permission-Presets und Modellauswahl als eigene Plugins
(`dsh-client-ui-agent-preset`, `…-permission-presets`, `…-model-selection`, `…-settings-subagent`). Ein
**Team-Profil** (Abteilung/Gruppe) gibt es nicht; `~/.dsh/team-profile/` existiert nicht.

---

## C. Vorschläge des Agenten (noch keine Entscheidungen)

### C1 — Bausteine statt Neubau
Das Plugin **liest** die Team-Projektion (B1), die Facharbeiter und das Task-Board-Hauptbuch (B3) und schreibt
nur seine eigenen Dateien: Profile (`~/.dsh/team-profile/…`) und eigene Ansichtseinstellungen. Gemeinsame
Aufgaben, Abhängigkeiten, Besitzer und Bereitschaft werden **nicht** nachgebaut, sondern aus `TeamTaskView`
gelesen.

### C2 — Arbeiter-Kanban
Spalten nach **Zustand des Arbeiters**, nicht der Aufgabe, zum Beispiel: Wartet · Arbeitet · Blockiert/wartet auf
Antwort · Gescheitert · Ruhend. Eine Karte ist ein Mitglied (Experte) oder Facharbeiter mit: Name, Rolle, Modell,
aktueller Aufgabe (aus den gemeinsamen Aufgaben, `ownerName`), letztem Lebenszeichen. Ein Klick öffnet die
Sitzung; ein Doppelklick „taucht ab" in das Brett der nächsten Ebene (Abteilung → Gruppe → Facharbeiter).
Aufgaben-Kanban (die Karte ist eine Aufgabe) bleibt als zweite Ansicht derselben Daten erhalten.

### C3 — Zugang (entschieden in A4, hier die Umsetzung)
(a) Zeile „Projekt-Manager“ in `sidebar.panellist` neben dem Task-Board, die die Seite im Slot `main` öffnet, wie es
`native-panel.tsx` des Task-Boards vormacht (B4). (b) Knopf in `conversation.input.right`; ein Klick öffnet die
Manager-Seite **auf dem Team, zu dem die aktuelle Sitzung gehört** (Lead: sein eigenes Team; Teammitglied oder
Unteragent: das Team seiner Wurzelsitzung über `parentSession`). Ist die Sitzung kein Team: Knopf ausgeblendet oder
führt zur Projektübersicht (offen, siehe D8). (c) Knopf in der Projektzeile erst, wenn der Slot im Kern existiert.

### C4 — Profile bearbeiten
Eine Ansicht „Profile": links die Ebenen (Abteilung, Gruppe, Facharbeiter), rechts das geltende Profil mit
Vererbung sichtbar (was kommt vom Rahmen, was ist abgeändert, Begründung der Abweichung), Formular zum Bearbeiten,
Speichern in die JSON-Dateien aus A2. Erzwingung beim Einstellen (Erlaubnis-Pflicht) ist ein späterer, eigener
Schritt (Werkzeug „Facharbeiter beantragen").

### C5 — Werkzeugleiste unten („Dock")
Zuerst nur Schalter, die es ohnehin gibt (Mitglied ruhen/arbeiten lassen, Modell wechseln, entlassen — das sind
die Befehle von `/team`), später Infrastruktur für die Zusammenarbeit (Nachrichtenfluss, Stand-Dateien).

### C6 — Reihenfolge des Baus (kleinster senkrechter Schnitt zuerst)
1. Nur lesen: Seite „Manager" mit Liste der Teamsitzungen des Projekts und deren Mitgliedern samt Status.
2. Arbeiter-Kanban einer Sitzung (Experten als Karten).
3. Facharbeiter hinzunehmen (braucht Quelle, siehe D3).
4. Profile lesen und anzeigen, dann bearbeiten.
5. Verbindung zum Task-Board (Aufgabenkarten ↔ Arbeiter).

---

## D. Offene Fragen (kurze Liste; die ersten zwei werden zuerst geklärt)

1. **Wie viel vom Task-Board-Plugin dürfen wir nutzen?** (offen, Frage an den Menschen gestellt am 2026-10-28) Ist es nur Lesequelle, oder soll das Plugin dessen Hauptbuch
   mit beschreiben (dann liegt unsere Karte im selben `ledger-v2.json`)? Lizenz Apache-2.0 erlaubt das Kopieren
   der Kanban-Logik.
2. **Zugang:** Reicht zunächst eine eigene Zeile in der Seitenleiste (C3 a) oder besteht der Mensch auf dem Knopf in der
   Projektzeile (dann ändern wir Teile der Projektliste, was bei jedem DSH-Update bricht)?
3. **Quelle der Facharbeiter:** `delegate_task`-Unteragenten stehen nicht in der Team-Projektion (B2). Entweder liest das Plugin
   die Sitzungsliste (Eltern-Kind-Beziehung der Sitzungen) oder die Experten melden Facharbeiter in eine Datei. Zu messen:
   ob die Sitzungsliste die Beziehung trägt.
4. **Name der Ebene:** „Department" (Abteilung) für den Teamlead und „Gruppe" für den Experten — oder anderes Wort?
5. **Mehrere Teams pro Projekt:** Jede Sitzung, die als Team beginnt, ist ein eigenes Team (B1). Soll die Manager-Ansicht
   sie alle als Abteilungen eines Projekts zeigen? (Der Wunsch in A1 sagt ja; offen ist nur, woran „gehört zum Projekt"
   erkannt wird: Arbeitsordner der Sitzung?)
6. **Sprache der Oberfläche:** Deutsch und Englisch, oder zunächst nur Deutsch?
7. **Größe des ersten Schnitts:** Lesende Ansicht aus C6 Punkt 1 als erstes Release.
8. **Chat-Knopf in einer Sitzung ohne Team:** Soll er fehlen, deaktiviert sein oder zur Projektübersicht führen?
