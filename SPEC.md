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

### A5 — Task-Board wird nicht benutzt, 2026-10-28

> „momentan benutzen wir das gar nicht, weil das halt irgendwie ein fremdes Plugin ist, keiner weiss so richtig,
> wie das genutzt wird, es beißt sich ein bisschen mit den normalen Magent-Teams, und wenn ich es mal nutzen
> wollte, gab es irgendwelche Fehler mit dem Board, deswegen bin ich so ein bisschen verbrannt damit und will
> das eigentlich so ein bisschen ignorieren, aber vom Ding her ist die Idee gut, ein Kanban hier mit einzubauen,
> ist genial, es muss halt nur richtig gemacht."

Entschieden (Antwort auf D1): **dsh-projectOS hängt nicht am Task-Board-Plugin.** Es liest sein Hauptbuch nicht und
schreibt nicht hinein; es läuft auch, wenn das Task-Board abgeschaltet ist. Die Kanban-Idee bleibt und wird **richtig**
gebaut, auf den Daten des Agent-Teams-Plugins (Mitglieder, gemeinsame Aufgaben, Abhängigkeiten; B1), die der Mensch
tatsächlich benutzt. Das Task-Board bleibt unberührt stehen; wir schalten es nicht ab und ändern es nicht.
Folgerung für den Bau: Wiederverwendung des Task-Board-**Codes** ist wegen der Kopplung (B3: Controller, Store,
Übersetzungen) und der Erfahrung des Menschen nicht der Weg; höchstens als Vorlage für das Ziehen und Ablegen (Apache-2.0,
Änderungshinweis nötig). Das Arbeiter-Kanban wird klein und neu geschrieben.

### A6 — Grundlage, Wrapper, Patches und erste Ansicht, 2026-10-28

> „ich will nicht auf Third-Party-Plugins bauen, sondern halt auf die Plugins, die mit DSH kommen, und das ist das
> Agent-Teams-Plugin, und ich will halt einfach nur einen schönen Wrapper haben und das Ganze halt um diese
> Team-Presets und so weiter ergänzen. Es sollte im Prinzip gar kein allzu riesiger Eingriff sein"

> „ich DSH so modifiziert habe, dass ich Subagents direkt anschreiben kann und sowas, da ist eine ganze Liste von
> Sachen, die nicht offiziell sind, die ich quasi eingebaut habe, zum Beispiel Team-Member-Begrenzung habe ich
> rausgenommen, dass man Sub-Agents keine Dateien schicken kann, habe ich rausgenommen, all solche Sachen so, und
> das sollte im Prinzip alles da mit reingebundelt werden, dass es aufhört, so ein Flickenteppich zu sein"

> „es können auch gerne einzelne Plugins bleiben oder so, so Sub-Plugins gibt es ja auch, dass man sagt, okay, wir
> haben ProjectOS und [dazu] Dependency-Plugins, davon sind halt die Patches, die ich gemacht habe. Ich weiss nicht,
> ob ich dafür jetzt neue Repos anlegen muss, […] da müsstest du mir eine Liste machen oder so. Aber wir können das
> auch gerne alles einfach in dem Repo lassen und […] die Dependencies als Teil des Repos bauen und dann irgendwann
> später Standalone umbauen."

> „das Kanban zeigt nur die ganzen Worker und wo sie gerade sind, und wenn ich dann da draufklicke, dann poppt quasi
> die Karte für den Worker auf und da sind quasi seine Aufgaben drin, die er geclaimed hat, und das spielt dann halt
> mit dem Shared-Team-Tasks-Ding halt zusammen, nicht mit dem Taskboard, dem Third-Party-Ding, sondern mit dem
> Originalen. Um Verwirrung zu vermeiden, können wir es halt auch wirklich deaktivieren, weil ich benutze es eh
> nicht so, also das Third-Party."

Entschieden:
1. **Grundlage sind nur Pakete, die mit DSH kommen** (Agent-Teams: `dsh-experimental-agent-team`, `…-tool-agent-team`,
   `…-client-ui-agent-team`). Keine Abhängigkeit von Third-Party-Plugins.
2. **dsh-projectOS ist ein Wrapper** um das Agent-Teams-Plugin, ergänzt um Team-Profile und Manager-Ansicht, ohne
   großen Eingriff in dessen Kern.
3. **Die eigenen Patches des Menschen werden mit eingebunden** (Teammitglied-Begrenzung entfernt, Dateien an Unteragenten
   senden, Unteragenten direkt anschreiben u. a.), damit der „Flickenteppich“ aufhört. Zunächst **alles in diesem Repo**
   als Teile (Unterordner/Unterpaket); später darf es in eigene Repos zerlegt werden („Standalone umbauen“).
   Der Mensch wünscht eine **Liste**, welche Patches es gibt und was davon eigene Repos bräuchte (Inventur läuft).
4. **Erste Ansicht:** Das Kanban zeigt **nur die Arbeiter** und wo sie gerade sind (Karte = Arbeiter). Ein Klick öffnet
   die **Karte des Arbeiters** mit den Aufgaben, die er **geclaimed** hat; diese kommen aus den **gemeinsamen Aufgaben
   des Agent-Teams** (`TeamTaskView`, `ownerName`), nicht aus dem Third-Party-Task-Board.
5. **Das Third-Party-Task-Board darf deaktiviert werden**, um Verwirrung zu vermeiden. Das geschieht erst bei der
   Einbindung unseres Plugins, mit vorherigem Speicherpunkt des Konfigurations-Repos, nicht vorher.
6. Aufgaben-Ansicht als eigenes Kanban (Karte = Aufgabe) bleibt Möglichkeit für später, nicht erster Schnitt.

### A7 — Elastisch und erweiterbar, 2026-10-28

> „Es gibt auch Automation-Tasks, das ist ein separates Plugin für Chrome-Jobs und so, das können wir auch mit einbinden.
> Das ist jetzt nicht nur das Agent-Teams-Plugin, aber wenn DSH dann noch weitere Sachen hinzubekommt... Vielleicht kann man
> das auch so ein bisschen elastisch machen, dass man es einfach so macht, dass es leicht erweiterbar ist, dass wenn ich jetzt
> irgendein Custom-Plugin finde, was super cool ist, dass ich das quasi mit einbauen kann, ohne alles rausreißen zu müssen."

Entschieden: dsh-projectOS ist **kein Einzelwerkzeug für Agent-Teams**, sondern ein Rahmen, in den sich weitere Quellen
einhängen lassen (zunächst Agent-Teams, danach das Aufgaben-/Zeitplan-Plugin von DSH, später beliebige Plugins), ohne dass der
Kern umgebaut wird. Wie diese Einhängung aussieht, ist **offen** (D9). Welches Plugin der Mensch mit „Automation-Tasks / Chrome-Jobs“ meint,
ist **offen** (D10): gemessen wurde nur das mit DSH gelieferte `dsh-schedule` (Erinnerungen, Cron, Aufgaben-Seite).

### A8 — Klein halten, 2026-10-28

> „Ja, scheint dann DSH-Scheduled zu sein. In der Oberfläche steht Automation Tasks. Ja, Kleinhalten. Das können ja auch
> Agents machen, dann es geht nur darum, eine gute Architektur zu haben, die leicht erweiterbar ist. Da muss jetzt kein
> dediziertes Hotswap oder irgendein System drin sein, was irgendwie komplex ist."

Entschieden:
1. „Automation Tasks“ ist die Beschriftung der Oberfläche von **`dsh-schedule`** / `dsh-client-ui-schedule` (gemessen:
   `dsh-client-ui-schedule/lib/client.js` Zeile 6379, `"panel": "Automation tasks"`). Es gehört zu DSH und darf als Quelle
   eingebunden werden. (Antwort auf D10.)
2. **Erweiterbarkeit durch gute Architektur, nicht durch ein System.** Kein Hot-Swap, keine Plugin-Registry mit Laufzeitlogik,
   keine Konfigurationssprache. Der Kern ist klein und hat eine klare, schmale Schnittstelle für „Quelle“; eine neue Quelle ist
   ein Modul im Repo, das ein Agent in kurzer Zeit nachbauen kann. (Antwort auf D9.)

### A9 — Begriffe, Firma, Kommunikationsregeln, CEO, 2026-10-28

> „es muss halt sehr deskriptiv sein, dass es im Prinzip ohne eine Anleitung zu lesen direkt klar ist, wie auch das
> gemeint ist, aber was auch gleichzeitig allgemein genug ist, […] um halt für alle Presets zu funktionieren."

> „eine Arbeitsgruppe […] besteht aus einem Experten und dann den dedizierten Facharbeitern und generellen Arbeitern,
> Hilfsarbeitern, Facharbeiter und Hilfsarbeiter, plus Experte bilden eine Arbeitsgruppe, und das ist quasi wie so ein
> Senior mit seinen Juniors in einer Firma, und ja, dann gibt es halt noch die Abteilung, […] eine Abteilung besteht aus
> Arbeitsgruppen, dass man ein bisschen von diesem Begriff Teams wegkommt, weil Team kann so vieles sein, und eine
> Arbeitsgruppe ist halt eher was Spezifisches, was sich halt mit einer speziellen Sache direkt arbeitend
> auseinandersetzt, während ein Team nicht unbedingt arbeiten muss, sondern ja auch design oder entwerfen kann"

> „die Inspiration so ein bisschen ist auch hell at loose und dies, diese Commander-Chat oder der Squad-Chat, dass es
> halt diese Hierarchie-Ebenen gibt, die Arbeitsgruppenleiter können mit anderen Arbeitsgruppenleitern sprechen, mit den
> Leads, aber jede Arbeitsgruppe ist ansonsten für sich isoliert, beziehungsweise innerhalb untereinander, also die
> Subagents, aber jeder Vorgesetzte kann quasi überall reinschauen und weiss, wie das gesamte Team und das gesamte
> Department strukturiert ist."
> (Lesart des Agenten: „hell at loose“ im Diktat = das Spiel *Hell Let Loose* mit seinem Commander- und Squad-Chat.)

> „das muss auch alles gut in Englisch übersetzbar sein, ich habe jetzt hier mit deutschen Begriffen gesprochen, aber
> vielleicht gibt es da irgendwas Griffigeres in Englisch."

> „der Arbeitsordner ist das Projekt, […] der Workspace ist quasi die Firma. Und dann kann ich halt alle Sessions, die
> quasi in diesem Workspace sind, die Teams sind, zählen dann als Department und diese Meta-Sessions, die quasi
> Departmentsleiter, die Abteilungsleiter, die können mit anderen Abteilungsleitern reden. Im Prinzip ist das dasselbe
> […] Prinzip, nur mit mehreren hierarchischen Ebenen"

> „im Prinzip wäre es halt gut, wenn man auch sowas wie ein CEO haben könnte, dass man einfach sagt, hier, ich mache ein
> neues Projekt, das ist jetzt mein Workspace, und ich mache hier jetzt ein CEO so, oder ja, und in dem CEO fängt dann
> diese genestete Hierarchie an, so, dann brauche ich nicht unbedingt verschiedene Sessions und ich kann vom Ding her
> sogar noch weiter das treiben und verschiedene CEOs für dasselbe Projekt haben, […] dass ich quasi ein ganzes
> Firmenkonglomerat innerhalb eines Workspaces bauen kann, wenn ich denn unbedingt wollen würde"

Entschieden:
1. **Begriffe (deutsch):** *Firma* = Workspace (der Arbeitsordner ist das Projekt). *Abteilung* = eine Teamsitzung mit allem
   darunter, geleitet vom *Abteilungsleiter*. *Arbeitsgruppe* = ein *Experte* (Gruppenleiter) mit seinen *Facharbeitern*
   (dedizierte Rollen) und *Hilfsarbeitern* (allgemeine Arbeiter), „wie ein Senior mit seinen Juniors“. Eine Abteilung besteht aus
   Arbeitsgruppen. „Team“ wird **nicht** mehr als Oberbegriff benutzt. Die Begriffe müssen **ohne Anleitung verständlich** und
   **für alle Presets allgemein genug** sein. (Antwort auf D4, deutsche Seite.)
2. **Zuordnung:** Alle Teamsitzungen im Workspace zählen als Abteilungen dieser Firma. (Antwort auf D5; Messung zu `cwd` in B2.)
3. **Kommunikationsregeln (Vorbild Commander-/Squad-Chat):** Abteilungsleiter sprechen mit Abteilungsleitern; Gruppenleiter mit
   Gruppenleitern und mit ihren Leads; innerhalb einer Arbeitsgruppe sprechen die Mitglieder frei miteinander; sonst ist jede
   Arbeitsgruppe **isoliert**; **jeder Vorgesetzte darf überall hineinsehen** und kennt die Struktur seiner ganzen Abteilung.
4. **CEO:** Wunsch, kein erster Schnitt. Eine oberste Sitzung („CEO“), in der die verschachtelte Hierarchie beginnt, sodass der
   Mensch nicht mehrere Sitzungen von Hand anlegen muss; **mehrere CEOs je Workspace** („Firmenkonglomerat“) sollen möglich sein.
5. **Die Texte müssen gut ins Englische übersetzbar sein;** griffige englische Wörter sind erwünscht (offen, D11).

### A10 — Kein Firmenwort, Bau beginnt, 2026-10-28

> „Schon mal gut mit dem Begriffen, ich will nur Company nicht drin haben, weil eine Company ist halt ein privatwirtschaftliches
> Thing und das hier soll ja allgemein abstrakt sein. Und ja, du kannst loslegen."

Entschieden:
1. **Kein Firmenwort in der Oberfläche:** weder „Company“ noch „Firma“. Die oberste Ebene heißt **Workspace** (so nennt DSH sie selbst;
   Vorschlag des Agenten, vom Menschen nicht ausdrücklich bestätigt, aber nicht beanstandet; Alternative „Organisation / Organization“).
   „CEO“ ist ebenfalls ein Firmenbegriff; Wortwahl dafür ist **offen** (D13) und wird erst für das zweite Stück gebraucht.
2. Die übrigen Wörter der Tabelle C7 gelten als gebilligt (Department, Work Group, Group Lead, Specialist, Helper bzw. Abteilung, Arbeitsgruppe, …).
3. **Der Bau beginnt** mit dem ersten Schnitt aus A6 Punkt 4.

### A11 — Das Brett zeigt nur eine Ebene, Karten klappen auf, Namen statt Satzanfänge, 2026-10-28

Nach dem ersten Blick auf die Seite (Bild: 87 Karten in einem Brett, Titel wie „<system-reminder> You are …“):

> „Ja, kannst du gerne abschalten das Taskboard. Also ein Problem, was wir mit dem Kanban so ein bisschen haben, ist erstmal, dass es wäre schön, wenn man Karten aufklappen könnte, dass man dann quasi so eingerückt Unterkarten der Subagents sieht, aber nicht alle Subagents auf einem Level auf einmal sichtbar sind."

> „Es müsste halt irgendwie ein Filter geben, der sagt, okay, das hier ist ein offizielles Subagent-Team-Member-Ding innerhalb dieses Systems. Und dann kriegt das quasi ein Header, eine Überschrift, einen Titel, eine Aufgabe und so weiter, und das ist einfach irgendwie, kriegt Metadaten, die das Ganze leicht identifizierbar machen […] Weil im Moment ist es nur so der Titel, der Titel der Session quasi."

> „[…] dass Sub-Agents und Teammates alle werden ohne Unterschied einfach nur in das Top-Level-Board geworfen und das ist nicht gut. Weil das klattert und ne, woher weiß ich, was sind jetzt die, die überhaupt relevant sind für mich, weißt du? Nachher hast du 300 Teammates und dann hast du ein Board voll mit 300 Karten, das ist unbenutzbar. Deswegen gibt es ja die hierarchischen Level des Boardes quasi, dass ich nur das hierarchische Level zurzeit betrachte, in das ich nicht reingeklickt habe. Nur das Team, nur den Ausschnitt des Teams quasi, den ich gerade beobachten will. Und wenn ich jetzt wissen will, okay, da ist ein Sub-Agent, der ist gerade oder ein Teammate, der arbeitet gerade und ich will wissen, was dessen Sub-Agents machen, so, dann klicke ich halt einfach auf dessen Karte, klappt die aus und sehe dann da ausgeklappt die Sub-Agents. Und wenn ich dann auf eine ausgeklappte Sub-Agent-Karte klicke, so, dann gehe ich in deren Taskboard rein und so weiter. Das muss halt diese hierarchischen Level und dieses Nesting muss halt funktionieren."

> „Und dieses Waiting for an Order ist auch, also Sub-Agents sollten darauf komplett, ne, […]" (Lesart des Agenten: Facharbeiter sollen nie in der Spalte „Wartet auf Auftrag“ stehen.)

> „Auch hier dieses, dass alles irgendwie nur der erste Satz ist, weißt du, es muss halt benannt werden. Und vielleicht kann man aufhören damit, Sub-Agents mit dieser einfach nur direkt den Init-Block rein zu pasten, sondern erstmal als erstes einfach einen Namen zu geben, weißt du, weil dann werden die ja automatisch benannt. Aber das muss halt, weiß ich nicht, mit diesem Project Manager muss quasi, müssen Agents-MD-Anweisungen kommen, die alle anderen überschreiben und so machen, dass sie damit harmonisieren."

Entschieden:
1. **Das Task-Board wird abgeschaltet** (geschehen am 2026-10-28 im Profil: `web-ui-task-board` und `web-ui-task-board-github` auf `disabled: true`).
2. **Das Brett zeigt immer nur eine Ebene:** die direkten Kinder der Karte, in die man hineingegangen ist. Oberste Ebene: die Gruppenleiter der Abteilung plus **eine** zusammengefasste Karte für alles, was der Abteilungsleiter sonst gestartet hat (Hilfsarbeiter). Hilfsarbeiter und Facharbeiter stehen nicht einzeln auf der obersten Ebene.
3. **Eine Karte klappt auf** und zeigt eingerückt ihre direkten Kinder (nicht alle Ebenen auf einmal). **Ein Klick auf ein aufgeklapptes Kind geht in dessen Brett hinein**, und so weiter beliebig tief.
4. **Facharbeiter und Hilfsarbeiter stehen nie in „Wartet auf Auftrag“.** Sie arbeiten oder sind fertig. Auf einen Auftrag warten nur Gruppenleiter.
5. **Karten tragen einen Namen, nicht den Anfang des ersten Auftrags.** Quelle des Namens: bei Gruppenleitern der Name im Team; bei allen anderen das Label, das der Aufrufer bei `delegate_task` (Feld `description`, „kurze Beschreibung in 3–5 Wörtern“) mitgibt und das in der Katalog-Projektion des Elternteils steht (`subagentCatalog[].label`); erst danach der bereinigte Sitzungstitel, zuletzt die Kurz-ID.
6. **Anweisungen an die Agenten (AGENTS.md) gehören zum Projekt-Manager** und sollen die bestehenden überschreiben, soweit sie Namen und Aufträge betreffen. Inhalt und Ablage sind **offen** (D14).

### A12 — Es wird mit Aufgaben gearbeitet; Zusatzanweisungen erklären die Stock-Plugins; Brücke zu GitHub-Issues, 2026-10-28

Nach dem zweiten Blick auf die Seite (Bild: Gruppenleiter mit Namen, Facharbeiter mit Label; aber „0 open tasks“ und „This worker has not claimed any task“):

> „Also nochmal, es sollte nur mit Tasks gearbeitet werden. Ich weiss nicht, woran es, also es liegt an dem Teamlead, der keinen Task erstellt hat, bevor der die Teammates erstellt hat, aber es sollte halt einfach vielleicht in diesen Zusatzinstructions stehen, wie diese Stock-Plugins wie das Agent-Teams-Plugin zu benutzen sind, nämlich, dass bestimmte Features immer genutzt werden und der Nutzer auch darauf hingewiesen wird, wie das benutzt wird, sofern der irgendwie was anderes vorhat oder so. Der Nutzer kann das natürlich immer überschreiben, aber auf Nachfrage und so sollte halt genau klar sein, wie alles zusammenspielt, auch mit dem Projektmanagement."

> „Und dann sollte es vielleicht eine Möglichkeit geben, dass diese Tasks mit GitHub-Issues verbunden werden können, irgendwie so eine kleine Bridge, dass es vielleicht irgendwie die Titel der Issues importiert oder so, und gleichzeitig dann dem Task-Zustand irgendwie Labels zugeordnet werden können, dass wenn ein Agent in dem Projektmanager eine Karte verschiebt, sich automatisch der Zustand in dem GitHub-Issue ändert und Dinge, die in die Karte geschrieben werden, irgendwie automatisch als Kommentar in GitHub-Issues gepostet hätten oder so, das wäre cool.“

Entschieden:
1. **Gearbeitet wird mit den gemeinsamen Aufgaben des Agent-Teams.** Der Abteilungsleiter legt **vor** dem Einstellen eines Gruppenleiters eine Aufgabe an, der Gruppenleiter übernimmt sie, und er schließt sie, wenn sie erledigt ist. Das steht als verbindliche Regel in den Zusatzanweisungen (`agents/projectos-agents.md`, Abschnitt 5).
2. **Die Zusatzanweisungen erklären, wie die mitgelieferten Plugins zusammenspielen** (Agent-Teams, gemeinsame Aufgaben, Unteragenten, Projekt-Manager), damit sie von den Agenten **immer** so benutzt werden. Der Mensch darf jede dieser Regeln ausdrücklich überschreiben; **auf Nachfrage** erklärt der Agent genau, wie alles zusammenspielt.
3. **Wenn der Mensch etwas anderes vorhat**, weist der Agent ihn darauf hin, wie die vorgesehene Benutzung aussieht (ein Satz), und folgt danach seiner Anordnung.
4. **Brücke zu GitHub-Issues** (Wunsch, **kein** erster Schnitt, Entwurf offen, D15): Titel der Issues importieren; dem Zustand einer Aufgabe ein Label zuordnen; verschiebt ein Agent eine Karte, ändert sich der Zustand des Issues; was in die Karte geschrieben wird, erscheint als Kommentar im Issue.

### A13 — Antworten zur GitHub-Brücke, Berechtigungen nach Gruppen, Live-Stand an der Aufgabe, Blick in den Chat, 2026-10-28

Antworten auf die fünf Fragen zur GitHub-Brücke (A12 Punkt 4), Nummern wie gestellt:

> „1 J 2 J 3 J 4 J - gh auf host kann eien dependency sein für dieses feature (sonst warnung) 5 Nur Mensch darf final schließen nach review, oder aber der Mensch gibt einer gruppe die berechtigung.“

Das heißt im Einzelnen: (1) Die Verknüpfung steht als Zeile `Issue: <Repo>#<Nummer>` in der Beschreibung der Aufgabe. (2) Der Zustand im Issue wird in der ersten Fassung über Labels geführt (`status:todo`, `status:in-progress`, `status:done`); ein Projekt-Feld kommt später. (3) Kommentare im Issue entstehen bei: Aufgabe übernommen, Aufgabe abgeschlossen, Beschreibung geändert; das Verschieben der Karte ändert nur das Label. (4) Das Token kommt von `gh auth token`; **`gh` auf dem Rechner ist eine Abhängigkeit dieser Funktion, fehlt es, erscheint eine Warnung** und die Brücke bleibt aus. (5) Das Issue schließt **nur der Mensch** nach der Abnahme, es sei denn, er gibt einer Gruppe ausdrücklich diese Berechtigung.

Neue Wünsche aus derselben Nachricht:

> „Es sollte ein berechtigungs management geben. agents sollten usergroups haben (department/workgroup/agent), und auf jedem level berechtigungen vererbt bekommen, die man aber auch overriden kann, so das man an einem ort sehen kann was wer darf und was nicht. Wenn ich einen Agent überschreiben will, kann ich einfach auf ihn klicken, und seine Berechtigungen mit per agent overrides überschreiben. Generell aktuell ist es ja so, dass wenn ich auf einen klicke, dann kriege ich Claim Task und Open Session und so, und da, wo Open Session ist und so, da wo diese Buttons sind, kann man ja auch Einstellungen haben, genau, und wenn ich jetzt keine Einstellung für einzelne Subagents gesetzt habe, dann kriegen die einfach ihre Gruppendefaults“

> „was noch wirklich schön wäre, wäre irgendwie, wenn Teammates irgendwie dazu angehalten werden könnten, wir haben das ja schon so ein bisschen mit diesen Zwischenfazits, aber dass wir diese, dass das quasi so ein Ich-arbeite gerade hier dran, also dass ein Agent checkt einen Task aus, liest ihn sich einmal durch und schreibt einmal auf, woran er jetzt arbeitet, was er genau macht, irgendwie ein Satz oder so, und postet das in den Status von dem Task, so dass man wirklich so einen kleinen Live-Einblick kriegt“

> „und was supergeil wäre, ich weiss nicht, ob das möglich ist, wäre, wenn man irgendwie ja so ein Peak, also Peak mit wie Peaking, also Luschern, dass man so ein Sneak Peek in den Chat von dem jeweiligen Agent kriegt, schon über das Sidepanel im Projekt Manager.“

Entschieden bzw. festgehalten:
1. **Berechtigungen nach Gruppen** (Wunsch, noch kein Entwurf): drei Ebenen Abteilung → Arbeitsgruppe → Agent; jede Ebene erbt von der darüber, kann überschreiben, und **an einem Ort** ist zu sehen, wer was darf und was nicht. Ein Klick auf einen Agenten öffnet seine Karte im Seitenpanel; dort stehen neben den Knöpfen (Sitzung öffnen, Aufgabe übernehmen) auch seine Einstellungen. Hat ein Agent keine eigene Einstellung, gilt der Gruppenstandard. Mensch-nur-Rechte (zum Beispiel ein Issue schließen) bleiben beim Menschen, solange er sie keiner Gruppe gibt.
2. **Live-Stand an der Aufgabe** (Wunsch): Ein Agent, der eine Aufgabe übernimmt, liest sie, schreibt **einen Satz**, woran er gerade arbeitet, und trägt ihn in den Stand der Aufgabe ein; so entsteht ein kleiner Live-Einblick. Er wird in den Zusatzanweisungen verlangt, wie die Zwischenfazits.
3. **Blick in den Chat** (Wunsch, „ich weiß nicht, ob das möglich ist“): Im Seitenpanel des Projekt-Managers soll man einem Agenten **über die Schulter schauen** können, ohne die Sitzung zu öffnen.

### A14 — Bestätigung der Reihenfolge, nur zeigen, ein Plugin-Ordner, Abteilungsleiter erreichbar, 2026-10-29

Antwort auf die drei Fragen zu Berechtigungen, Ablage und Reihenfolge:

> „Ja, ist okay. Erstmal nur zeigen, nicht durchsetzen. Es wäre gut, wenn wir einfach einen Plugin-Ordner hätten, wo alle Sachen drin sind. Dass das nicht so über DSH verteilt ist und wir einfach alles ordentlich beieinander haben. Und ja, ich stimme der Reihenfolge zu. Und eine Sache noch, aktuell kommt man nicht über den Projektmanager direkt zu den Projektsessions hin, also zu den eigentlichen Teamleads. Sondern halt nur zu deren Teilsessions."

Entschieden:
1. **Berechtigungen werden zuerst nur angezeigt und einstellbar gemacht, nicht durchgesetzt** (Antwort auf Frage 1 vom 2026-10-28). Die Einstellungen liegen in Dateien unter `~/.dsh/team-profile/abteilung/…` und `…/gruppe/…` (Antwort auf Frage 2).
2. **Reihenfolge:** (a) Chat-Blick über die Seitenleiste, (b) Live-Stand an der Aufgabe als Regel in den Zusatzanweisungen, (c) GitHub-Brücke, (d) Berechtigungen. **Vorgezogen vor (a)** wegen des Mangels in Punkt 4.
3. **Ein Plugin-Ordner, der alles enthält** (Wunsch): Was zu den Teams gehört — Patches, Rollen, Anweisungen, Profile, Plugin-Code — soll **in diesem Repo beieinander liegen**, nicht über `~/.dsh` verteilt. Umsetzung ist **offen** (D19): was wohin kommt und wie `~/.dsh` danach darauf zeigt, muss mit dem Menschen geklärt werden, weil `doctor.sh`, die Rücknahme-Sicherungen und der Rollen-Patch (`DSH_ROLLEN_DIR`) heute auf `~/.dsh/…` zeigen.
4. **Mangel: Der Abteilungsleiter ist über den Projekt-Manager nicht erreichbar** (Beobachtung des Menschen): man kommt nur zu den Teilsitzungen (Gruppenleiter, Facharbeiter), nicht zur Sitzung des Abteilungsleiters selbst. Ursache (gelesen in `src/client/ManagerPage.tsx`): der Abteilungsleiter ist keine Karte, er steht nur als Reiter und als Pfad-Eintrag „Abteilung: …“, und beide öffnen keine Sitzung. Korrektur: ein Knopf „Sitzung des Abteilungsleiters öffnen“ am Kopf des Bretts, dazu ein Knopf in den Reitern.

### A15 — Name „Project OS“, Auswahl oben, nur echte Teams, Dashboard mit Live-Ticker, 2026-10-29

Nach dem Blick auf 0.1.2 (Bild: Titel „Project Manager“, sieben Reiter mit Sitzungstiteln, Brett mit drei Spalten):

> „Gerade steht hier Projektmanager. Aber es wäre besser, wenn da einfach irgendwie, ja, weiß ich nicht, Projekt OS oder so steht. Und dann da oben so ein kleiner, ja, weiß ich nicht, wie so ein Projekt. Also wo man das Projekt auswählen kann. Ganz oben. Und dann wählt man halt da den Workspace aus. Und dann Teams aus dem Workspace. Keine Einzel Sessions. Also wenn irgendwo eine Session nur alleine als Teamlead ist, wird die nicht daran aufgenommen."

> „Dann brauchen die halt alle einen vernünftigen Namen oder so. Und was mir halt fehlt, ist, dass es noch sehr statisch ist. Man hat sogar keine Ahnung, was darunter passiert, weißt du. Und ja, das muss noch ein bisschen mehr so Dashboard-Charakter haben, dass man auf einen Blick sieht, wer wo am Arbeiten ist und idealerweise sogar so die letzte Thinking-Zeile in den Cards live-Ticker-mäßig sieht und so."

> „Und im Dashboard halt für jedes Team, also für jede Abteilung, dass man quasi sieht, okay, die Abteilung ist gerade inaktiv oder die ist aktiv und wenn die aktiv ist, ja, dass man auch so ein bisschen wie so ein Live-Ticker hat, dass man so ein bisschen sieht, was geht hier gerade drin vor."

Festgehalten:
1. **Der Name der Seite ist „Project OS“** (Seitenleiste und Überschrift), nicht „Projekt-Manager“.
2. **Ganz oben wählt man den Workspace** (so nennt DSH das „Projekt“). Darunter stehen **nur die Teams dieses Workspaces**. **Keine Einzelsitzungen:** eine Sitzung, die nur allein als Teamleiter dasteht, gehört nicht in die Liste.
3. **Jede Abteilung braucht einen vernünftigen Namen.** Wie er entsteht, ist offen (D21).
4. **Die Seite soll ein Dashboard sein, nicht statisch:** auf einen Blick, wer wo arbeitet; je Abteilung ob sie **aktiv oder inaktiv** ist, und bei einer aktiven Abteilung ein **Live-Ticker** darüber, was gerade darin geschieht; auf den Karten **idealerweise die letzte Denkzeile** der Agenten. Ob die Denkzeile technisch erreichbar ist, wird gemessen (B11, D22).

### A16 — Zweite Ansicht: Endlos-Leinwand mit Graph, Streaming an den Kacheln, 2026-10-29

> „Ich habe eine Idee. Neben dem als zweiten View-Mode stelle ich mir eine Endlos-Canvas vor, wo in der Mitte quasi als Root, wie in der Mindmap der Workspace ist. Und von dieser Root gehen einfach Ordner ab für das Filesystem. Also die ganzen Artefakte, Dateien und so weiter sind alle in diesem Canvas liegen die einfach und sind mit Drehten miteinander verbunden, wie Nodes. Vielleicht kann man Ordner auch auf und zuklappen, dass quasi die Nodes, die in einem Ordner drin sind, also die Artefakte zum Beispiel, dass man die halt ausklappen kann oder halt alles dann sieht um den Ordner herum. Und das ist dann so ein bisschen wie diese Obsidian Graph View, dass man so ein bisschen die Stiffness und so zwischen den Nodes bestimmen kann und wie der Graph sich so ein bisschen verhält."

> „Dann gibt es auch die Sessions an sich sind auch Artefakte dann einfach. Und sind halt, ja, ich stelle mir das so ein bisschen so vor, dass es halt einfach die ganzen Teams und Abteilungen, dass die auch so ringförmig halt um diesen Mittelpunkt angeordnet sind und wie in einer Mindmap halt aus diesem Mittelpunkt rauswachsen in ihrer Verästelung. Und ja, weiß ich nicht. Artefakte, kein Plan, ob die unbedingt verbunden sein müssen. Es wäre halt cool, wenn die Artefakte, die von Sessions benutzt werden, auch physisch in deren Nähe sichtbar wären mit einer Verbindung zu denen, so dass man einfach sieht, hey, wer arbeitet an was. Vielleicht kann man ja einen Artefakte-Ordner haben, der normalerweise zugeklappt ist und der dann neben den Sessions liegt und der mit den Sessions verbunden ist. Und wenn man ihn dann aufklappt, dann sieht man genau, welche Session mit welchem Artefakt arbeitet."

> „Was mir halt jetzt gerade fehlt, ist das Streaming direkt zu sehen. Ich hätte gerne, ne, dass wenn ich jetzt in einer normalen Session bin, dann kann ich ja den Thinking-Block aufklappen und dann kann ich dir beim Denken quasi zugucken. Das ist wie so ein Fenster in den Denkprozess. Selbst das Überfliegen davon reicht, um irgendeine ungefähre Ahnung davon zu kriegen, was gerade bei irgendwem vorgeht. Da reicht einfach nur ein Blick teilweise. Und das, was wir jetzt haben, ist schon cool, dass quasi so eine so eine kleine Mini-Meldung, was jetzt gerade los war, gespeichert wird. Es sind halt noch nicht die Streaming-Token."

> „Und das hätte ich halt gerne so als Live-Ticker an jeder Kacheln auch gerne die Nodes identisch zu den Kanban-Kacheln machen, dass quasi der Kanban und der Node-Graph einfach nur verschiedene Darstellungsformen derselben Kacheln sind."

Festgehalten (Wünsche, **noch kein Entwurf**, Fragen in D23–D26):
1. **Zweite Ansicht neben dem Brett:** eine **Endlos-Leinwand** (Zoomen, Verschieben) mit einem Graphen wie die Obsidian-Graphansicht; die **Wurzel in der Mitte ist der Workspace**, wie bei einer Mindmap.
2. **Abteilungen und Arbeitsgruppen wachsen ringförmig** aus der Mitte heraus, in ihrer Verästelung. **Sitzungen sind selbst Knoten** (Artefakte).
3. **Ordner und Dateien des Dateisystems** hängen ebenfalls als Knoten an der Wurzel, mit Linien verbunden; **Ordner lassen sich auf- und zuklappen**.
4. **Verhalten einstellbar** wie in Obsidian (zum Beispiel Steifigkeit der Verbindungen und wie der Graph sich bewegt).
5. **Artefakte, die eine Sitzung benutzt, liegen sichtbar in ihrer Nähe, mit Verbindung.** Vorschlag des Menschen: ein **Artefakte-Ordner** je Sitzung, normal zugeklappt, daneben verbunden; aufgeklappt sieht man, welche Sitzung mit welchem Artefakt arbeitet.
6. **Streaming:** Der Mensch will den **Denkprozess beim Entstehen** sehen können (wie den aufgeklappten Denkblock in einer normalen Sitzung); ein Überfliegen genügt. Was es heute gibt (eine Mini-Meldung je Schritt, A15) reicht ihm nicht.
7. **Brett und Graph zeigen dieselben Kacheln** in zwei Darstellungen; die Knoten des Graphen sind **identisch mit den Kanban-Kacheln** (mit Live-Ticker).

### A17 — Kacheln mit Inferenzstatus, Quick-Chat in der Leinwand, Center-Peek, Widgets, Name „MadOS“, 2026-10-30

(Bild des Menschen: eine Karte „Model state“ mit den Zuständen Idle, Reading, Generating, Queued, Error und einer Zeile „Reading prompt“ mit Fortschrittsbalken.)

> „Ich überlege gerade. Es gibt einmal den aufgabenstatus: arbeitet eine session daran? aber es gbit auch den inferenzstatus (read, write, idle, error, queue) etc. - der sollte in form einer farbigen "LED" auf der Karte angezeigt werden. Die Karten selber haben dann eine farbige umrandung, die ihren Prozess-Status zeigt. (oder vllt sogar farbiger hintergrund)."

> „So sieht man direkt auf einen blick wer in welchem team gerade aktiv ist, und auch was der exakte live/status ist. Evtl statt einer LED, kann man aber auch einfach eine Zeile oder ein feld machen, in dem die letzten Thinking token gestreamed werden, laufende toolcalls, und die Farbe des Hintergrundes ist der Inferenzstatus (der die Strata farben spiegelt)."

> „Das ganz soll angenehmer dark mode sein. Die Strata farben sind auch ganz angenehm. Wichtig ist, das jede Karte einen header hat, der sauber erkennbar ist. Dieser header kann dann auch die statusfarbe als sekundärfarbe halten (z.B. grün = working, red = blocked etc.)."

> „Die Frage ist, wie gestaltet man diese kacheln ideal? Was für Informationen und Shortcuts brauchen sie? der ganze Baum der Abteilung ist dann ja einfach flach auf der Leinwand ausgebreitet, deswegen muss man nicht irgendwie in verschachtelte ordner von sessions die an sessions hängen, sondern man sieht einfach die gesamte struktur auf einen schlag, und kann direkt zu jeder Kachel gehen, ob nun subagent oder team mate. - genau. Was super wichtig ist, eine art pop up "in place" chat zu haben - egal wie. Es muss möglich sein, über dieses Graph-Dashboard, direkt mit jeder Session zu sprechen, ohne den Graphen verlassen zu müssen. Das ist essenziell um Reibung zu vermeiden."

> „Natürlich muss man auch lesen können. Aber das sollte ja gehen, einfach ein md render popup bubble mit Messenger Funktion, die die letzten 3-5 Nachrichten vorhält, aber den rest löscht."

> „Das ist dann quasi der Quick-Comms Kanal. Als nächstes sollte man den in center peek öffnen können. Also weiter das dashboard offen, aber eine ausgewählte Kachel groß und Zentriert, evlt hintergrund blurred oder dunkel."

> „Und dann schlussendlich kann man von da dann zum eigentlichen chat, was einen dann auch aus dem dashboard bringt."

> „In zukunft will ich dieses dashboard zur zentralen interaktionsfläche mit DSH machen, und ein erweiterbares widget system haben."

> „DIe idee ist es, sowas wie dsh in dsh zu haben, wo ein agent mit speziellem skill, neue widgets für diese canvas programmieren kann, die dann als subtools des... genau. MadOS (in Anlehnung an GladOS) - so wird das ding am ende heissen."

> „... die dann als subtools registriert werden, und allen agents danach zur verfügung stehen. z.B. könnte man einfach ein kanban widget entwickeln, inklusiver tools wie card_create(), die dann durch das zentrale MadOS plugin an DSH weitergerreicht werden."

> „Die Idee ist am Ende sowas wie ein ultimatives AgentOS zu haben."

> „Das ganze kann auch einfach mit den normalen workspaces funktionieren. Es gibt dann einen launcher/finder, in dem man MadOS workspaces verwalten kann, welche im Prinzip einfach nur Graphen sind, die als Root den jeweiligen dsh workspace folder haben."

> „Von dieser root ausgehend, kann ich nun sessions an diese root node hängen, also die experten usw, die wiederrum ihre eigenen sessions haben."

> „KP wie, aber es soll auch möglich sein, dass der user eine team struktur anlegt, ohne dass agents das für ihn tun. Sobald änderungen committed werden, und neue sessions/cards initialisiert wurden (einfach so ein plus icon neben leaf nodes, mit denen man neue children da hinzufügen kann, um genestet team strukturen selber entwerfen zu können."

> „So eine art agent team designer/houdini, das sowohl manuell, als auch agentic bedient werden kann. und mit richtigen tools. Halt ein richtiges profi werkzeug, nicht einfach nur irgendein chat interface."

> „Auf dieser oberfläche soll es dann halt auch diese widgets/apps geben. z.B. könnte man textverarbeitung direkt dort machen. Wenn es mit einer art infinite scroll geht, z.B. neben den teams, einfach die ganzen artefakte in ganz mikro klein zu haben, so dass man einfach nahe an ein team ranzoomen kann, und dann sieht man im prinzip alle artefakte mit denen sie arbeiten, und an wem sie hängen."

> „Und dann kann man halt da vllt sowas wie einen collaborative editor draus machen, sowas wie die chatgpt canvas oder so. Aber das ist nur eine idee für apps."

Festgehalten (Wünsche, **noch kein Entwurf**, Fragen in D27 bis D31):
1. **Zwei getrennte Zustände je Kachel:** der **Aufgabenstatus** (arbeitet die Sitzung an etwas?) und der **Inferenzstatus** (was tut das Modell gerade: Idle, Reading, Generating, Queued, Error). Der Inferenzstatus erscheint als farbige **LED** auf der Kachel; die Kachel trägt eine **farbige Umrandung** (oder einen farbigen Hintergrund) nach dem Prozessstatus. Alternative des Menschen zur LED: eine **Zeile**, in der die **letzten Denk-Token gestreamt** werden und die laufenden Werkzeugaufrufe stehen; die **Hintergrundfarbe ist der Inferenzstatus** und spiegelt die STRATA-Farben.
2. **Gestaltung:** angenehmer **Dark Mode**; die STRATA-Farben gefallen ihm; **jede Kachel hat einen sauber erkennbaren Kopf**, der die Statusfarbe als Zweitfarbe trägt (grün = arbeitet, rot = blockiert usw.).
3. **Der ganze Baum einer Abteilung liegt flach auf der Leinwand,** ohne Verschachtelung in Ordner; jede Kachel (Unteragent oder Teammitglied) ist direkt erreichbar.
4. **Quick-Chat in der Leinwand (essenziell, „um Reibung zu vermeiden“):** Man muss über das Graph-Dashboard **direkt mit jeder Sitzung sprechen** können, **ohne die Leinwand zu verlassen**. Form: ein **Popup / eine Sprechblase mit Messenger-Funktion**, Markdown dargestellt, die **die letzten 3–5 Nachrichten** vorhält und den Rest verwirft („Quick-Comms-Kanal“).
5. **Drei Stufen der Nähe:** (a) Quick-Chat an der Kachel; (b) **Center-Peek**: die gewählte Kachel groß und zentriert, die Leinwand bleibt offen (Hintergrund unscharf oder dunkel); (c) **der eigentliche Chat** (verlässt das Dashboard).
6. **Richtung (Zukunft): „MadOS“** (in Anlehnung an GladOS) ist der künftige Name des Ganzen. Das Dashboard soll die **zentrale Bedienfläche für DSH** werden mit einem **erweiterbaren Widget-System**: ein Agent mit besonderer Fähigkeit programmiert neue Widgets für die Leinwand („DSH in DSH“), die als **Unterwerkzeuge** angemeldet werden und **allen Agenten danach zur Verfügung stehen** (Beispiel: ein Kanban-Widget samt Werkzeug `card_create()`, durchgereicht vom zentralen MadOS-Plugin an DSH). Ziel: „ein ultimatives AgentOS“.
7. **MadOS-Workspaces:** ein **Starter/Finder**, in dem man MadOS-Workspaces verwaltet; ein solcher Workspace ist ein **Graph, dessen Wurzel der DSH-Arbeitsordner ist**. Von der Wurzel aus hängt man Sitzungen (Experten usw.) an, die wiederum eigene Sitzungen haben.
8. **Team-Designer:** der Mensch kann **eine Teamstruktur selbst anlegen**, ohne dass Agenten das tun: ein **Plus-Zeichen neben Blattknoten** fügt Kinder hinzu; sobald Änderungen **bestätigt (committed)** werden und neue Sitzungen/Kacheln angelegt sind, entstehen sie. „Eine Art Agent-Team-Designer, **Houdini**“, **von Hand und von Agenten** bedienbar, „ein richtiges Profi-Werkzeug, nicht einfach nur irgendein Chat-Interface“.
9. **Apps/Widgets auf der Fläche (Beispiele, keine Entscheidung):** Textverarbeitung direkt dort; **Artefakte ganz klein** neben den Teams, sodass man an ein Team heranzoomt und sieht, **welche Artefakte** es nutzt und **an wem sie hängen**; daraus ein **gemeinsamer Editor** („wie ChatGPT Canvas“).

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
`agent.session.header.parentSession`, `agent-team/lib/index.js` Zeilen 404, 626, 766). **Gemessen (Haiku-Helfer, vom Lead an den Zeilen nachgelesen):** Teammitglieder **und** `delegate_task`-Unteragenten laufen
durch dieselbe Funktion (`TeamRoster.spawn` → `ctx.subagents.startContinuable`, `agent-team/lib/index.js` Zeile 674;
`delegate_task` ruft dasselbe in `dsh-tool-subagent/lib/index.js` Zeile 557; Kopf geschrieben von `childSessionMeta`,
`dsh-subagent/lib/index.js` Zeilen 470–485). Beide tragen daher `origin: 'subagent'` und `parentSession`. **Im Sitzungskopf
gibt es kein Feld, das beide Arten trennt.** Der Deskriptor (`foldSubagentDescriptor`) sagt nur „ist ein Unteragent“,
nicht welcher Art.
**Folgerung (Vorschlag, aus den Messungen abgeleitet, noch nicht im Betrieb geprüft):** Die Art ergibt sich aus der
Team-Projektion der Wurzelsitzung, die der Browser schon liest (`projectionsBySession[leadId].values.agentTeam.members`,
`agent-team/lib/client.js` Zeile 239):
- Kindsitzung, deren `id` in `members` steht → **Teammitglied (Experte)**;
- Kindsitzung mit `origin === 'subagent'`, deren `parentSession` ein Mitglied ist → **Facharbeiter dieses Experten**;
- Kindsitzung, deren `parentSession` die Wurzel ist, aber nicht in `members` steht → **eigener Helfer des Leads**.
Offen: die Sitzungsdateien sind zstd-komprimiert und wurden nicht entpackt; der Kopf einer echten Teamsitzung wurde
noch nicht angesehen (D3).
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

**B6 — Nachrichten und Einsicht über Teamgrenzen (MESSUNG, Haiku-Helfer plus Nachlesen des Leads, 2026-10-28):**
- **`send_message` endet an der Teamgrenze.** `resolveActiveMember` (`agent-team/lib/index.js` Zeilen 350–366) kennt nur `"lead"` (die Wurzel des
  **eigenen** Teams) und aktive Mitglieder in `state.members` des **eigenen** Teams; sonst `TEAM_MEMBER_NOT_FOUND` oder `TEAM_MEMBER_RESTING`. Ein Abteilungsleiter
  kann mit diesem Werkzeug keinen anderen Abteilungsleiter erreichen. `list_agents` zeigt ebenfalls nur das eigene Team.
- **Der Kern kann trotzdem jede Sitzung ansprechen, nur nicht über dieses Werkzeug.** `dsh-schedule` legt eine fällige Erinnerung so in die Sitzung, die im
  Zeitplan-Eintrag steht (`task.sessionId`; der Mechanismus selbst nimmt eine **beliebige** ID) (`dsh-schedule/lib/index.js` Zeilen 1576–1597): `ctx.sessionController.resolveAgent(task.sessionId)` liefert den Agenten der Sitzung, dann
  `agent.followup(createUserMessage({content, source: { kind: "schedule" }}))` und `ctx.sessions.flush(agent.session)`. Der Browser-Weg ist
  `session.prompt` (`dsh-api-session-controller/lib/index.js` Zeile 863) mit beliebiger `sessionId`. Eine Nachricht von Abteilungsleiter zu Abteilungsleiter
  braucht daher **eine neue, kleine Host-Schicht** (ein Werkzeug, das nach diesem Muster arbeitet), aber **keinen Umbau des Kerns**.
- **Neue Wurzelsitzung (CEO startet Abteilungen):** `session.create` nimmt `workspaceId` **oder** `cwd`, optional `sessionId` und `agentPreset`; die Berechtigung kommt
  danach über den Befehl `/permission <id>`, der Auftrag über `session.prompt` mit `mode: 'queue'` (Vorlage, nur die Dienstaufrufe gelesen: Task-Board
  `host-runner.ts`). Eine so angelegte Sitzung ohne `parentSession` gilt als Lead (`tryMembership`, `agent-team/lib/index.js` Zeilen 391–445) und darf Teammitglieder starten
  (aus dem Code gelesen, **nicht** im Lauf geprüft).
- **Fremde Sitzung lesen:** kein Werkzeug des Modells liest Verlauf oder Projektion einer fremden Sitzung; der Kern-Dienst `observeSession`/`sessionQuery.observeSession(sessionId)`
  (`dsh-api-session-controller/lib/index.js` Zeilen 804, 1589, 2959) nimmt beliebige IDs, nur `inspect` prüft den Arbeitsordner im Kopf (Zeile 160); ob ein Werkzeug ihn erreicht, ist ungemessen (`dsh-tool-subagent` nutzt `sessions.get` nur für die Modellliste
  des Elternteils). Im Browser liest `useSessions` Projektionen (`projectionsBySession[…].values.agentTeam`, `state.byId[…].running`); **ob er alle Sitzungen des
  Workspaces liefert oder nur geöffnete, ist ungemessen** (`dsh-client-ui-session/lib/types` nicht gelesen).
- **Nicht gemessen:** ob ein Browser-Plugin diese Host-Dienste direkt erreicht oder ein eigener Host-Teil nötig ist (Vermutung: eigener Host-Teil nötig, so macht es das
  Task-Board); ob ein Lauf tatsächlich funktioniert.

**B7 — Bauweise eines Browser-Plugins und Datenquelle im Browser (MESSUNG, 2026-10-28; Haiku-Helfer, vom Lead an den Dateien nachgelesen).**
Wäre eine Zeile falsch, stünde in der genannten Datei etwas anderes.
- **Paketform.** `package.json` trägt `"exports": {"./client": {"default": "./lib/client.js"}}` und einen Block `"dsh": {"bundle": {"patch": "./cordis.patch.yml"}, "client": {"platform": "web", "inject": [<Paketnamen der benötigten Dienste>]}}`
  (Vorbilder: `~/dsh-agent-compact/package.json`, `@linxin666/dsh-client-ui-task-board/package.json`, `@deepseek-ai/dsh-experimental-client-ui-agent-team/package.json`). `react` ist Peer-Abhängigkeit und wird **nicht** mitgebaut.
- **Einstieg.** Die gebaute Datei ruft `window.__ModuleLoader__.load({id, factory})` auf; die Fabrik gibt `exports.apply(ctx)` und `exports.inject` zurück (`dsh-agent-compact/scripts/build-client.mjs` Z. 125–147; Agent-Teams `lib/client.js` Z. 455–511). `inject` ist die Liste der Dienste, die in `ctx` ankommen (Agent-Teams: `["sessions","uiWorkspace","slots","locale"]`).
- **Bau.** esbuild bündelt die React-Ansicht (`format: 'cjs'`, `jsx: 'automatic'`, `external: ['react','react/jsx-runtime','react/jsx-dev-runtime']`, `platform: 'browser'`, `target: 'es2020'`; `build-client.mjs` Z. 46–58) und schreibt `lib/client.js` mit dem Kopf `window.__ModuleLoader__.load(...)` davor. `tsconfig.client.json` mit `jsx: react-jsx`, `moduleResolution: Bundler`, `noEmit`. Kein tsdown nötig.
- **Profil.** Eigene Pakete stehen als Release-URL in `~/.dsh/profiles/web/package.json` (`"@tmielsch/rolling-compaction": "https://github.com/…/releases/download/…tgz"`); `file:`-Pfade sind ebenfalls möglich (`vendor/`). `cordis.patch.yml` im Paket ist nur nötig, wenn ein Host-Teil eingehängt wird. Ein Browser-Plugin allein braucht ihn nicht.
- **Zwei Einhängungen.** Zeile in der Seitenleiste: `ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({name:'sidebar.panellist', id, order, label: () => t('…')}, IconKomponente))`. Seite im mittleren Bereich: `ctx.slots.inject('main', () => ctx.slots.register({name:'main', key: id, inject: () => ({…}) }, SeitenKomponente))`. So macht es auch `dsh-client-ui-schedule/lib/client.js` Z. 6794–6811 (`PANEL_ID`, `order: 10`).
- **Daten im Browser.** Die Seitenkomponente bekommt als Standardprops `useSessions`, `useWorkspaces`, `useSessionStatus` (so wie `TaskDetail` von `dsh-client-ui-schedule`: `Pick<PropsRuntime<'main'>, 'useSessions' | 'useWorkspaces'>`). `useSessions(state => …)` liefert `SessionListState {ids, byId, phase, projectionsBySession}`
  (`dsh-api-session-controller/lib/types/client/sessions/service.d.ts` Z. 40–52). Jede Zeile `byId[id]` trägt `id, displayTitle, cwd?, parentId?, origin?: 'subagent', running, updatedAt, projectionValues?`. `projectionsBySession[leadId].values.agentTeam` ist `TeamProjection {members, tasks, failure?}`;
  Mitglied `{id, name, role: 'lead'|'teammate', phase: 'provisioning'|'active'|'failed', error?}` (die Zustände `running|inactive` des Agent-Teams-Knopfs werden dort aus `useSessionStatus`/`byId[id].running` abgeleitet, `TeamMemberRow` Z. 88–95); Aufgabe `TeamTaskView` wie in B1.
  **Facharbeiter (löst D3):** jede Sitzung trägt in ihrer Projektion `subagentCatalog: [{id, createdAt, mode: 'one-shot'|'continuable'|'unknown', label?}]` (direkte Kinder, `dsh-subagent/lib/types/projection-types.d.ts` Z. 7–20). Der Browser trägt diese Kinder selbst in `byId` ein (`parentId`, `origin: 'subagent'`, `displayTitle`; `dsh-api-session-controller/lib/client.js` Z. 3514–3535). Facharbeiter eines Experten = `subagentCatalog` der Projektion des Experten.
  Der Titel eines Facharbeiters ist sein Label (z. B. „Packaging eines DSH-Browser-Plugins klären“); eine Rolle wie `redteam` steht dort nur, wenn sie im Label steht.
- **Sitzung öffnen.** `ctx.uiWorkspace.openSession(id)` bzw. `openSession({parentSessionId, childSessionId, mode: 'continuable'})` (Agent-Teams `lib/client.js` Z. 478–490).
- **Nicht geprüft:** ob nach dem Hinzufügen eines Plugins ein Neustart von `dsh web` genügt oder die Weboberfläche neu gebaut werden muss (SCHÄTZUNG: Neustart genügt, der Host liefert `dsh.client`-Pakete unter `/plugins/<id>/client.js` aus, `dsh-client-modules/lib/index.js` ~Z. 713–719, nur vom Helfer gelesen); ob `byId` alle Sitzungen des Workspaces enthält oder nur die in der Liste sichtbaren (die Liste `ids` kommt vom Host mit allen Sitzungen, Filterung liegt beim Verbraucher: Kommentar in `service.d.ts` „the store carries every row“); die Anordnung (`order`) der Zeile gegenüber Task-Board und Zeitplan.

**B8 — Team-Aufgaben beobachten und GitHub erreichen (MESSUNG, Haiku-Helfer, die tragenden Stellen vom Lead nachgelesen, 2026-10-28).**
- **Ereignis.** Jede Änderung an einer gemeinsamen Aufgabe schreibt das Ereignis `team/task` mit `{version: 2, teamId, task}`; `task` ist `TeamTaskSnapshot {id, revision, subject, description, status: pending|in_progress|completed|deleted, ownerId?, blockedBy, writeScopes}` (`dsh-experimental-agent-team/lib/types/types.d.ts` Z. 194–199, „stored only in the Team Lead Session“; geschrieben in `lib/index.js` Z. 1596 beim Anlegen und Z. 1737 bei Änderungen). Die Revision steigt bei jeder Änderung.
- **Beobachten.** Jedes Host-Plugin kann `ctx.on("session/event", (session, event) => …)` abonnieren und nach `event.type === "team/task"` filtern; so macht es der Kern selbst (`dsh-experimental-agent-team/lib/index.js` Z. 1833, `dsh-session-projection/lib/index.js` Z. 64, `dsh-client-product-analytics/lib/index.js` Z. 115, `dsh-agent-loop/lib/index.js` Z. 319). Die Lead-Sitzung ist die Sitzung, an der das Ereignis hängt. **Nicht geprüft:** die genaue Form von `event` (Feldnamen, ob `data` das Team-Ereignis trägt); das wird beim Bau an einer echten Aufgabe gelesen.
- **Ändern von außen.** `update` verlangt Lead oder Besitzer (`TEAM_TASK_UNAUTHORIZED`) und eine passende Revision (`TEAM_TASK_STALE_REVISION`); ein Besitzer, der nicht der Aufrufer ist, blockiert das Übernehmen (`TEAM_TASK_ALREADY_CLAIMED`; `lib/index.js` Z. 1634–1655). Ob ein fremdes Host-Plugin den Dienst erreicht, ist **nicht geprüft**. Folgerung für den Entwurf: Die Brücke **liest** Team-Aufgaben und **schreibt nach GitHub**; die Gegenrichtung (Issue ändert Aufgabe) braucht entweder die Werkzeuge der Agenten oder einen noch ungeprüften Zugang und bleibt für später.
- **GitHub.** Das Fremd-Plugin `@linxin666/dsh-client-ui-task-board-github` ruft GitHub per `fetch` (REST) mit `Authorization: Bearer <Token>` auf, nicht über die `gh`-Befehlszeile. Reihenfolge der Quellen für das Token: DSH-Credential-Store, dann Umgebungsvariable (Standard `GITHUB_TOKEN`), dann `GH_TOKEN` (`lib/index.js` Z. 553, 575–576, 613–620, 2300–2303). Auf diesem Mac ist `gh` mit `repo`-Recht angemeldet (`~/.dsh/AGENTS.md`, Maschinenteil); ob ein Host-Plugin dessen Token lesen darf (`gh auth token`), ist **nicht geprüft**.
- **Nicht geprüft:** wie ein Host-Plugin dem Browser eine Methode anbietet (`dsh-api-remotes`, Task-Board-Host nutzt dafür HTTP-Routen wie `POST /credential`); der Helfer rief außerdem einmal `execute_python` an Houdini auf (Leerbefehl `pass`, folgenlos, von ihm selbst gemeldet).

**B9 — Blick in den Chat eines Agenten (MESSUNG, Haiku-Helfer plus Nachlesen des Leads, 2026-10-28).**
- **Es gibt schon einen Chat in der rechten Leiste.** Das mitgelieferte Paket `dsh-client-ui-subagent` bietet im Katalog der Unteragenten die Aktion `openChildAside` an und öffnet damit die Unterhaltung eines Unteragenten **in der rechten Seitenleiste** (`lib/client.js` Z. 226 ff.). Technisch ist das ein Tab der rechten Leiste mit der Adresse `dsh-resource://subagentchat/session/<ChildId>?parent=<ParentId>&mode=<one-shot|continuable|unknown>` (Z. 692–730, Tab-Körper `ConversationSlotPanel` Z. 775 ff. mit festem Chat-Ansicht `FixedChatConversationView` Z. 771). Statt der Eingabezeile zeigt er bei einem Einmal-Unteragenten den Hinweis „schreibgeschützt“ (`SubagentReadOnlyComposer`, Z. 650–672).
- **Wie ein fremdes Plugin das benutzt:** Die rechte Leiste bietet `ctx.sidebarRight.openResource(address, options)` an (`dsh-client-ui-sidebar-right/lib/types/client/service.d.ts` Z. 161: „claim it, place it, reveal the column“; ein Name aus dem Umkreis `dsh-resource://` ist Pflicht, sonst wird geworfen). Das Team-Plugin öffnet Teammitglieder dagegen im **Hauptbereich** (`openTeammate`, `dsh-experimental-client-ui-agent-team/lib/client.js` Z. 478–495).
- **Einschränkung (aus dem Typ gelesen, nicht erprobt):** Die rechte Leiste gehört zu der Sitzung, die gerade auf dem Bildschirm ist; `mounted` ist `undefined`, solange ein globales Panel die Hauptspalte füllt (`service.d.ts` Z. 140–148). Die Seite des Projekt-Managers ist ein solches Panel. **Ergebnis der Nachlesung (MESSUNG, 2026-10-29):** `openResource` ruft `this.require()`, und das wirft `sidebarRight: no session surface is mounted`, wenn `mounted` leer ist (`dsh-client-ui-sidebar-right/lib/client.js` Z. 6385–6388 und 6744–6747). Auf der Manager-Seite, die ein globales Panel ist, ist `mounted` leer; **dort kann `openResource` also nicht benutzt werden**. Der Chat-Blick muss daher entweder in einer **eigenen Ansicht im Seitenpanel der Manager-Seite** liegen (dafür fehlt eine einbettbare Chat-Komponente, `ConversationSlotPanel` ist im Paket `dsh-client-ui-subagent` nicht ausgeführt) oder die Sitzung zuerst öffnen und dann die rechte Leiste benutzen; beides ist **noch zu entscheiden** (D20). Ungeprüft ist auch, ob die Adresse für **Teammitglieder** (nicht nur `delegate_task`-Unteragenten) funktioniert.
- **Der Browser hält keinen Nachrichtenverlauf im Listenzustand:** `useSessions` liefert Kopfdaten, Status und Projektionen (`byId`, `projectionsBySession`); `sessionListMetadata` hat nur `blank` und `lastPromptAt` (`dsh-api-session-controller/lib/index.js` Z. 1809–1812). Eine Projektion mit letzter Nachricht oder laufendem Werkzeug gibt es **nicht**. Der Verlauf wird erst beim Öffnen einer Sitzung geladen. Die billige Stufe „Statuszeile ohne Chat“ muss also aus Zustand, Titel und Zeitangaben zusammengesetzt werden oder entfällt.
- **Namen der vorhandenen Projektionen:** `sessionListMetadata`, `imageLimits`, `modelSelection`, `subagentCatalog`, `subagentTiming`, `subagent`, `agentTeam`.

**B10 — Berechtigungen (MESSUNG, Haiku-Helfer plus Nachlesen des Leads, 2026-10-28).**
- **Was DSH kennt:** drei Stufen **je Sitzung**: `read-only` (Sandbox nur lesen, Rückfrage `ask`), `workspace-write` (schreiben im Arbeitsordner, `ask`) und `danger-full-access` (alles, `never` = nie fragen). Befehl `/permission`; bei dir ist `danger-full-access` der Standard (`dsh-permission-presets/lib/index.js` Z. 146–155 und 208–210; `cordis.patch.yml` Z. 619 ff.). Die Rückfrage-Regel kennt nur `ask` und `never` (`dsh-user-approval/lib/types/index.d.ts`, `ApprovalPolicy`).
- **Vererbung an Unteragenten:** Ein `delegate_task`-Kind übernimmt vom Elternteil nur die Stufe `danger-full-access` (oder `auto`) und eine Sandbox-Übersteuerung; seine Rückfrage-Regel ist **immer `never`** (`dsh-subagent/lib/types/child-agent.js` Z. 175–212). **Nicht gefunden:** wie ein Teammitglied (`spawn_teammate`) seine Stufe bekommt; die Suche nach `permission|sandbox|approval|preset` in `dsh-experimental-agent-team/lib/index.js` hat keinen Treffer.
- **Eine Stelle, an der ein Plugin Werkzeugaufrufe vor der Ausführung prüfen und ablehnen kann, gibt es:** das Ereignis `tools/pre-execute` des Werkzeug-Dienstes (`dsh-tools/lib/types/index.d.ts`, Kommentar: „Allow, deny, cancel, or ask before dispatch“). Es bekommt den Aufruf (Werkzeugname, geparste Argumente, aufrufender Agent) und antwortet mit `allow`, `deny` (mit Begründung), `cancel` oder `ask`; ein Hörer gilt je Agent („agent-scoped listeners receive only that agent's calls“). Das ist der Haken, an dem eine Regel wie „dieser Agent darf dieses Werkzeug nicht benutzen“ **durchgesetzt** werden kann. **Ungeprüft:** wie ein Plugin den Agenten einer Gruppe zuordnet (aus dem Aufrufer Sitzung → Mitgliedschaft → Arbeitsgruppe), und wie `bash`-Aufrufe wie `gh issue close` darin erkannt werden (man müsste den Befehlstext lesen).
- **Folgerung für den Entwurf (aus den Messungen, noch nicht bestätigt):** Die Stufen von DSH sind zu grob und gelten je Sitzung; die Gruppen-Rechte des Menschen (A13 Punkt 1) wären eine **eigene Schicht** darüber, die in `tools/pre-execute` entscheidet. Das Schließen eines Issues durch die GitHub-Brücke braucht diese Schicht nicht: die Brücke schließt nie von selbst, außer eine Gruppe hat das Recht.

**B11 — Live-Ticker: Ereignisse und Projektion (MESSUNG, Lead an einer echten Sitzungsdatei und an den Typdateien, 2026-10-29).**
- **Denktext ist ein Block im Ereignis `assistant/message`:** `data.message.content` ist eine Liste von Blöcken der Typen `reasoning` (Feld `text`), `text` und `tool-call`; in den 25 jüngsten Sitzungsdateien kamen 9102 `reasoning`-Blöcke, 5468 `text`-Blöcke und 15587 `tool-call`-Blöcke vor. Ein `reasoning`-Block ist **ein Ganzes am Ende des Schritts**, kein Strom von Teilen (die Teile stehen getrennt in `data.stream`, den wir nicht lesen). Länge der `reasoning`-Texte: Median 319 Zeichen, 90. Perzentil 5190, Maximum 607007. Deshalb behält die Projektion nur die **letzte Zeile, höchstens 240 Zeichen**.
- **Werkzeugaufruf:** Ereignis `tool/call` mit `data.name` und `data.arguments` (nur der Name wird benutzt, die Argumente können private Inhalte tragen).
- **Projektion:** `ctx.sessionProjections.register({key, stateSchema, init, apply, wire:{viewSchema, view}, stateVersion})` (`dsh-session-projection/lib/types/index.d.ts` Z. 38–79, 150–159). `apply` ist synchron und rein, gibt bei uninteressanten Ereignissen **dieselbe Referenz** zurück (dann entsteht keine Folgearbeit), der Zustand muss reines JSON sein. Der Host baut aus `snapshot.values` je Sitzung den Wert, der im Browser unter `projectionsBySession[id].values.<key>` ankommt (`dsh-api-session-controller/lib/index.js` Z. 1193–1205 und `lib/client.js` Z. 2961).
- **Umsetzung (0.2.0):** `src/host/index.js` registriert die Projektion `projectOsActivity` `{thought, said, tool, at}`; geprüft mit Tests (`test/dashboard.test.mjs`): letzte Zeile, gleiche Referenz bei fremden Ereignissen, kaputte Ereignisse, Schema.
- **Nicht geprüft:** ob eine Projektion einer **nicht geöffneten** Sitzung im Browser live nachgezogen wird oder erst nach `refreshProjections` erscheint (Befund des Helfers: der Code deutet auf Push über den Sitzungslistenstrom, nicht belegt); die Kosten der Projektion bei sehr vielen Ereignissen (Faltung ist ein Vergleich je Ereignis); ob die Werte in einer **bereits laufenden** Sitzung nach Neustart von `dsh web` vorhanden sind (Projektionen werden aus dem Protokoll neu gefaltet, SCHÄTZUNG).

**B12 — Streaming der Denk-Token (MESSUNG, Haiku-Helfer, tragende Stellen vom Lead nachgelesen, 2026-10-29).**
- **Es gibt einen Live-Strom, er heißt „assistant stream“.** Der Agentenloop sendet je Modellaufruf die Frames `start`, viele `chunk` und `end` über das Host-Ereignis `agent/assistant-stream` (`dsh-agent-loop/lib/index.js` Z. 1068: `this.dispatch.emit("agent/assistant-stream", { frame })`; Typ in `dsh-agent-loop/lib/types/assistant-stream.d.ts`). Die `chunk`-Frames tragen die rohen Teile des Modells (`block-start`, `block-end`, Denk- und Textteile, `usage`).
- **Ein Host-Plugin sieht ihn für ALLE Sitzungen:** `ctx.on("agent/assistant-stream", ({agent, frame}) => …, { global: true })`, so macht es der Kern selbst (`dsh-api-session-controller/lib/index.js` Z. 1408–1415 und 1501–1510). `agent.session.id` nennt die Sitzung.
- **Ein Browser bekommt ihn nur für eine VERFOLGTE Sitzung:** Der Verfolger (`follow`) muss `assistantStream: true` verlangen; der Host filtert dann auf genau diese Sitzung (`index.js` Z. 1501–1510) und schickt die Frames im selben Strom wie das Verlaufsfenster (Z. 1540–1560); der Browser setzt sie dort zusammen (`lib/client.js` Z. 2075 `case "assistant-stream"`). Jede verfolgte Sitzung lädt **zusätzlich ein Verlaufsfenster** (`request.maxMessages`, Standard unbekannt). Es gibt **keine Drosselung** und keine Begrenzung der Warteschlange (`pushBack`).
- **Projektionen taugen nicht für den Strom:** `apply` läuft nur für **abgeschlossene** Ereignisse (B11); ein Wert, der sich je Wort ändert, ist keine Projektion.
- **Server-Push aus einem Plugin ist möglich, aber aufwendig:** Ein Remote-Dienst (`dsh-api-remotes`) kennt den Modus `stream` (`lib/index.js` Z. 2617–2619, Client `lib/client.js` Z. 440–452). Ein eigener Dienst braucht aber einen **Beschreiber im Typert-Format** (Beispiel `~/dsh-agent-compact/src/typert.host.ts`: Paket, Dienst, Methode, Parameter- und Ergebnisschema) und eine Browserseite (`typert.remote-client`). Das Schwesterplugin tut das für **eine** Anfrage/Antwort-Methode; ein Strom-Beispiel wurde **nicht** gelesen.
- **Drei Wege, aus den Messungen abgeleitet (SCHÄTZUNG, ungebaut):** (1) **Je Schritt** (jetzt gebaut, B11): die letzte Denkzeile springt, wenn ein Schritt endet. (2) **Echte Token für die arbeitenden Sitzungen der gewählten Abteilung:** der Browser verfolgt sie mit `assistantStream: true` und kleinem Verlaufsfenster; Aufwand moderat, Kosten wachsen mit der Zahl der verfolgten Sitzungen; **ob ein Plugin `follow` selbst auslösen darf, ist ungeprüft**. (3) **Ein Strom für alles:** das Host-Plugin faltet alle Frames (`global: true`) zu den letzten Zeichen je Sitzung und schickt sie über **einen** Remote-Strom an den Browser; billig im Betrieb, aber der Bau braucht den Typert-Beschreiber und eine Drosselung (zum Beispiel alle 300 ms).
- **Nicht geprüft:** Rate und Größe der `chunk`-Frames im Betrieb; ob der Host bei vielen Verfolgern langsam wird; das Verfolgen fremder Sitzungen aus einem Plugin.

**B13 — Dateien, Datei-Dienst, Größenordnung (MESSUNG, Haiku-Helfer; Werkzeugzählung vom Lead an 30 Sitzungen, 2026-10-29).**
- **Datei-Dienst `workspaceFiles`** (`dsh-api-workspace-files`, Remote): Methoden `list` ({entries:[{path,name,type,size?}], truncated}), `read`, `readBytes`, `stat`, `changes` (Strom aus `ready`- und `change`-Frames; `watch` im Host vorhanden). Kein Tiefen- oder Eintragslimit gefunden außer `truncated`; `maxFileBytes` 2 MiB. Aufruf im Browser über `remote.workspaceFiles` (`dsh-client-ui-sidebar-files`, `lib/client.js` Z. 110, 348, 456). **Nicht geprüft:** ob der Host dahinter einen echten Dateiwächter laufen hat; das Verhalten live.
- **Karte „Changed files“** (`dsh-client-ui-deliverables`) kommt **nicht** aus dem Datei-Dienst, sondern aus `dsh-workspace-changes`: Am Ende jedes Zugs vergleicht der Host Schnappschüsse und Git und schreibt das Ereignis `workspace/changes` {turn} in die Sitzung (`dsh-workspace-changes/lib/index.js` Z. 891–897, Git Z. 407); die Karte holt die Zusammenfassung über die Route `/api/changes.summary` (Sitzung und Folge-Nummer), höchstens 500 Dateien (Z. 980). Das ist **die vorhandene Quelle für „diese Sitzung hat diese Dateien geändert“**; sie liefert nur **Änderungen**, nicht Lesen, und gilt nur für lebende Sitzungen.
- **`dsh-file-reference`** kennt nur Kandidaten `{path, kind}` und schreibt nichts in Sitzungsereignisse; „Sitzung X benutzt Datei Y“ ist daraus **nicht** ablesbar.
- **Werkzeugaufrufe in den 30 jüngsten Sitzungen (MESSUNG):** `bash` 6188 (Feld `command`; in **5703 davon, 92 %**, steht im Befehl ein erkennbarer Pfad), `read` 1038 (`file_path`), `edit` 692 (`file_path`), `grep` 184 (`path`), `read_image` 234 (`file_path`); dazu `send_message` 2081, Houdini-Werkzeuge 1923 u. a. **Folgerung:** Dateien, die eine Sitzung **gelesen oder geändert** hat, stehen sicher in `read`/`edit`/`write` (`file_path`); Dateien aus `bash` nur als **Schätzung** aus dem Befehlstext (die 92 sagen nur, dass **ein** Pfad vorkommt, nicht, dass er **benutzt** wurde).
- **Größenordnung (MESSUNG):** `~/Perforce/stalker-dev` ohne `node_modules` und `.git`: 66 636 Dateien; bis Tiefe 2 nur 35 Dateien und 29 Ordner.

**B5 — Profile heute.** Es gibt Agent-Presets, Permission-Presets und Modellauswahl als eigene Plugins
(`dsh-client-ui-agent-preset`, `…-permission-presets`, `…-model-selection`, `…-settings-subagent`). Ein
**Team-Profil** (Abteilung/Gruppe) gibt es nicht; `~/.dsh/team-profile/` existiert nicht.

---

## C. Vorschläge des Agenten (noch keine Entscheidungen)

### C1 — Bausteine statt Neubau
Das Plugin **liest** die Team-Projektion (B1) und die Facharbeiter (über die Sitzungsköpfe, B2) und schreibt
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
5. Aufgaben-Ansicht auf den gemeinsamen Aufgaben des Agent-Teams (Karte = `TeamTaskView`, mit Besitzer und `blockedBy`).

### C7 — Begriffe deutsch und englisch (Vorschlag des Agenten, noch keine Entscheidung)
| Ebene | Deutsch | Englisch, beschreibend (empfohlen) | Englisch, griffig (Alternative) |
|---|---|---|---|
| Workspace | Workspace (**nicht** „Firma“, siehe A10) | Workspace (**nicht** „Company“, siehe A10) | Organization |
| oberste Sitzung (Wunsch) | CEO | CEO | — |
| Teamsitzung | Abteilung | Department | — |
| Leiter der Abteilung | Abteilungsleiter | Department Lead | Commander |
| Experte mit Mitarbeitern | Arbeitsgruppe | Work Group | Squad |
| Leiter der Gruppe | Experte / Gruppenleiter | Group Lead | Squad Lead |
| dedizierte Rolle | Facharbeiter | Specialist | — |
| allgemeiner Arbeiter | Hilfsarbeiter | Helper | — |
Begründung der Empfehlung: „Work Group“ und „Department“ sagen ohne Erklärung, was gemeint ist, und tragen keinen Spielgeschmack;
„Squad“ und „Commander“ sind kürzer, lesen sich aber nach Militär und sind für eine Firma weniger selbsterklärend.

---

## D. Offene Fragen (kurze Liste; die ersten zwei werden zuerst geklärt)

1. **Wie viel vom Task-Board-Plugin dürfen wir nutzen?** ~~erledigt~~ **entschieden am 2026-10-28, siehe A5: gar nicht.** Ist es nur Lesequelle, oder soll das Plugin dessen Hauptbuch
   mit beschreiben (dann liegt unsere Karte im selben `ledger-v2.json`)? Lizenz Apache-2.0 erlaubt das Kopieren
   der Kanban-Logik.
2. ~~Zugang~~ **entschieden am 2026-10-28, siehe A4.**
3. ~~Quelle der Facharbeiter~~ **gemessen am 2026-10-28, siehe B7 (`subagentCatalog`).** Ursprüngliche Frage: Vorschlag in B2 (Kindsitzungen über `parentSession` plus Mitgliederliste). Zu prüfen am echten
   Beispiel: ob der Browser die Kopfdaten **aller** Kindsitzungen eines Leads bekommt (Dienst `ctx.sessions`, Liste
   `session.list`) oder nur geöffnete. Messung steht aus.
4. ~~Name der Ebene~~ **deutsch entschieden am 2026-10-28, siehe A9 Punkt 1;** englische Wörter offen (D11).
5. ~~Mehrere Teams pro Projekt~~ **entschieden am 2026-10-28, siehe A9 Punkt 2.**
6. **Sprache der Oberfläche:** Die Texte müssen ins Englische übersetzbar sein (A9 Punkt 5). Offen: ob die erste Fassung nur Deutsch ausliefert.
7. ~~Größe des ersten Schnitts~~ **entschieden am 2026-10-28, siehe A6 Punkt 4:** nur Arbeiter, Karte mit geclaimten Aufgaben.
8. **Chat-Knopf in einer Sitzung ohne Team:** Soll er fehlen, deaktiviert sein oder zur Projektübersicht führen?
9. ~~Wie hängt man weitere Plugins ein?~~ **entschieden am 2026-10-28, siehe A8: klein, kein System.** Ursprünglicher Vorschlag, bleibt als Richtschnur für die Schnittstelle: Vorschlag zur Diskussion: der Kern kennt nur den Begriff „Quelle“ (liefert Arbeiter,
   Aufgaben oder Zustände in einer festen kleinen Form); Agent-Teams ist die erste Quelle; eine neue Quelle ist ein kleines Modul, das
   sich beim Kern anmeldet. Die Form der Anmeldung folgt dem Muster, das DSH selbst benutzt (Slots, `ctx.slots.inject`).
10. ~~Was ist „Automation-Tasks“?~~ **geklärt, siehe A8 Punkt 1.** Gemessen war: Gemessen im Profil: `dsh-schedule` (Host-weite Erinnerungen, Zeitplan) samt `dsh-client-ui-schedule`
    (Aufgaben-Seite) im Bundle `dsh-experimental-schedule-bundle`. Von Chrome-Jobs kommt dort nichts vor.
11. ~~Englische Wörter~~ **gebilligt am 2026-10-28 mit Ausnahme von „Company“, siehe A10.**
12. **Kommunikation zwischen Abteilungen und CEO:** Messung steht in B6. Zusammengefasst: innerhalb einer Abteilung geht alles schon (`send_message`);
    zwischen Abteilungsleitern und für einen CEO braucht es eine neue, kleine Host-Schicht nach dem Muster von `dsh-schedule`, ohne Umbau des Kerns. Erste Fassung
    bleibt nach A6 eine **lesende** Ansicht; die Schicht kommt danach, als zweites Stück. Offen: ob ein Browser-Plugin ohne eigenen Host-Teil auskommt.
13. **Wort für „CEO“:** firmenneutral gewünscht (A10). Vorschlag zur Diskussion: *Root Lead* / *Oberste Leitung*, oder bei „Director“ bleiben. Wird für das zweite Stück gebraucht.
14. **Anweisungen für die Namensvergabe (A11 Punkt 6):** Welche Sätze genau in welche AGENTS.md, und ob sie das Plugin mitliefert oder nur vorschlägt. Gemessen ist: `delegate_task` verlangt bereits das Feld `description` (kurze Beschreibung, 3–5 Wörter) und `spawn_teammate` das Feld `description`; beide landen als Label im Katalog. Die Sitzungstitel, die der Mensch sieht, stammen dagegen aus dem ersten Auftragstext (`dsh-session-title`).
15. **Brücke zu GitHub-Issues (A12 Punkt 4):** Entwurf offen. Gemessen ist bisher nur: Der Systemtext des Agent-Teams (`dsh-experimental-tool-agent-team/lib/index.js` Z. 23–28) verlangt „list, get, claim with the current revision, perform the work, then complete“ und kennt Besitzer, Abhängigkeiten und Schreibbereiche, aber keine Verbindung nach außen. Offene Teilfragen: (a) ob ein Host-Teil Änderungen an Team-Aufgaben beobachten kann (Helfer klärt, Bericht steht aus); (b) wie GitHub erreicht wird (`gh`-Befehl oder REST mit Token); (c) welche Zustände auf welche Labels abgebildet werden; (d) ob die Brücke in einer Richtung (Aufgabe → Issue) oder in beiden Richtungen arbeitet; (e) was bei Widerspruch gilt, wenn der Mensch das Issue von Hand ändert (die globale Regel `github-lifecycle` sagt: GitHub ist die Quelle für den sichtbaren Zustand, Labels nur für Nebensächliches, Zustand gehört in Projekt-Felder).
16. **Berechtigungen nach Gruppen (A13 Punkt 1):** Was kann DSH überhaupt erlauben und verbieten, und auf welcher Ebene (Sitzung, Agent-Voreinstellung, Werkzeug)? Messung durch Helfer läuft. Offen danach: welche Rechte es geben soll (Liste), wo die Einstellungen liegen, ob sie nur anzeigen oder auch durchsetzen.
17. **Live-Stand an der Aufgabe (A13 Punkt 2) — umgesetzt in 0.1.3 (2026-10-29):** Die Anzeige liest die erste Zeile der Form `Stand: …` aus der Beschreibung der Aufgabe, die der Gruppenleiter gerade bearbeitet (`liveNote` in `model.ts`); die Regel steht in `agents/projectos-agents.md` Abschnitt 5 Punkt 3. Die GitHub-Brücke muss diese Zeile bei ihren Kommentaren ausnehmen. Ursprünglicher Vorschlag: Die Aufgabe trägt laut Messung (B8) keine Notizfläche (Felder: Titel, Beschreibung, Zustand, Besitzer, Abhängigkeiten, Schreibbereiche). Vorschlag: eine Zeile `Stand: …` am Anfang der Beschreibung, die der Agent mit `team_task_update` `edit` ersetzt. Folge: Jede Stand-Änderung erhöht die Revision und löst das Ereignis `team/task` aus; die GitHub-Brücke muss Änderungen, die **nur** diese Zeile betreffen, **nicht** als „Beschreibung geändert“ kommentieren (A13 Punkt 3 der Brückenantworten), sonst wird das Issue zugemüllt.
18. **Blick in den Chat (A13 Punkt 3):** Messung durch Helfer läuft (ob der Browser den Verlauf einer fremden Sitzung lesen und anzeigen kann, ob es dafür schon eine Komponente gibt).
19. **Plugin-Ordner mit allem (A14 Punkt 3) — umgesetzt am 2026-10-29:** Antwort des Menschen auf die Frage nach `team-rente`: „ok dann so. ansonsten als externe dependency listen“ (Ordner ja, `team-rente` nicht hinein, als externe Abhängigkeit in `README.md` geführt). Eingezogen sind `patches/` (17 Skripte, 2 Notizen) und `rollen/`; `scripts/link-dsh.mjs` hängt sie nach `~/.dsh` (Liste: `dsh-links.json`, Test: `test/links.test.mjs`). Ursprünglicher Vorschlag: Bestand heute: `~/.dsh/patches/` (42 Einträge, `docs/PATCHES.md`), `~/.dsh/rollen/` (4 Rollen + Entwurf), Anweisungsblock `agents/projectos-agents.md` (liegt schon hier), Profile `~/.dsh/team-profile/` (noch nicht angelegt). Vorschlag: im Repo Ordner `patches/`, `rollen/`, `agents/`, `profiles/` und ein Skript `scripts/link-dsh.mjs`, das die alten Orte unter `~/.dsh` als **Verweise** auf das Repo setzt (damit `doctor.sh` und `DSH_ROLLEN_DIR` unverändert funktionieren); vorher Speicherpunkt von `~/.dsh`. Offen: ob Fremd-Patch `team-rente` (ExpertKT) mit hinein darf (Lizenz), ob alle 42 Einträge oder nur die Team-bezogenen.
20. **Wie der Chat-Blick auf der Manager-Seite aussieht (B9, 2026-10-29):** Die rechte Leiste der DSH-Oberfläche geht dort nicht (kein Sitzungsbild gemountet). Zur Wahl: (a) Der Knopf „Hineinsehen“ öffnet die Sitzung des Agenten im Hauptbereich und die Leiste zeigt dort ein Brett; (b) wir bauen im Seitenpanel der Manager-Seite eine eigene, einfache Anzeige des Verlaufs (braucht eine Quelle für den Verlauf; die gibt es im Browser-Zustand nicht, B9); (c) der Blick zeigt nur das, was bereits im Zustand steht: Name, Zustand, Modell, Zeit des letzten Auftrags, dazu den Live-Stand aus der Aufgabe (A13 Punkt 2). Empfehlung des Agenten: (c) zuerst, weil es sofort geht, und danach (a) als Knopf „Sitzung öffnen“, das es schon gibt.
21. **Name einer Abteilung (A15 Punkt 3) — erster Schnitt in 0.2.0:** Der Mensch kann den Namen auf der Seite setzen (Stift neben dem Namen); er wird **in diesem Browser** gemerkt (`localStorage`, Schlüssel `project-os.names`), noch nicht in der Datei unten. Ursprünglicher Vorschlag: Heute ist der Name der Titel der Sitzung des Abteilungsleiters, also der Anfang seines ersten Auftrags („Wir bauen gerade einen House“). Vorschlag: der Mensch kann den Namen auf der Seite selbst setzen (ein Klick auf den Namen, Eingabe, Enter); gespeichert in der Datei `~/.dsh/team-profile/abteilung/<Sitzungs-Id>.json` (Feld `name`), damit er auf allen Rechnern und nach Neustarts gilt; dazu eine Anweisung an Abteilungsleiter, ihre Abteilung beim Anlegen der ersten Aufgabe zu benennen. Offen: ob der Mensch das selbst setzen will oder ob der Abteilungsleiter es soll.
22. **Live-Ticker mit der letzten Denkzeile (A15 Punkt 4) — gemessen in B11, umgesetzt in 0.2.0:** Der Browser hält keinen Verlauf fremder Sitzungen (B9). Der DSH-eigene Weg wäre eine eigene Projektion im Host-Teil dieses Plugins (wie `agentTeam` und `subagentCatalog`), die je Sitzung die letzte Denkzeile und das letzte Werkzeug aus den Ereignissen faltet und an den Browser liefert. Messung läuft (B11).
23. **Welche Dateien gehören zu einer Sitzung?** (A16 Punkt 5) — gemessen in B13: Es gibt keine Liste „diese Sitzung benutzt diese Datei“ in DSH. Möglichkeit: aus den Werkzeugaufrufen der Sitzung die Pfade lesen (lesen, schreiben, ändern); das ist eine Fassung der Projektion `projectOsActivity`. Messung läuft (B12). Offen: nur Dateien im Workspace, oder alles?
24. **Wie viel vom Dateisystem?** (A16 Punkt 3) — Zahlen in B13 (66 636 Dateien, aber nur 29 Ordner bis Tiefe 2): Ein ganzer Workspace hat tausende Dateien. Vorschlag: nur Ordner der obersten zwei Ebenen, und Dateien nur dort, wo eine Sitzung sie benutzt; der Rest wird auf Klick geladen. Offen: Entscheidung des Menschen.
25. **Streaming der Denk-Token (A16 Punkt 6) — gemessen in B12, Entscheidung offen:** Der Verlauf der Sitzung enthält je Schritt die Teile des Stroms (`data.stream`, B11), aber erst nach dem Schritt. Was der Browser **während** des Schritts bekommt, ist zu messen (B12). Das ist die schwerste Frage dieser Runde.
26. **Bausteine statt Neubau (Anordnung 2026-10-29, `~/.dsh/AGENTS.md`):** Für Graph, Kräfte, Zoom und Verschieben ist zuerst zu suchen, was DSH schon mitbringt, danach eine fertige Bibliothek; **kein eigener Kräfte-Löser**. Messung läuft (B12).
27. **Inferenzstatus (A17 Punkt 1):** Woher kommt er? Gemessen ist der Strom der Frames `start`/`chunk`/`end` je Modellaufruf (B12). Daraus lassen sich ableiten: **Generating** (Chunks laufen), **Idle** (kein Aufruf läuft), **Error** (Wiederholung/Fehler, Ereignis `llm/retry` vorhanden). **Reading** (das Modell verarbeitet noch den Prompt, bevor das erste Teil kommt) wäre „Aufruf gestartet, noch kein Chunk“, und **Queued** (der Anbieter hat die Anfrage in einer Warteschlange, zum Beispiel ein lokaler Server) ist **nirgends gemessen**. Offen: ob die Anbieter dafür etwas melden (Messung steht aus).
28. **Quick-Chat (A17 Punkt 4):** Sprechen ohne die Leinwand zu verlassen verlangt, eine Nachricht an eine **fremde** Sitzung zu schicken (B6: `session.prompt` im Browser, `send_message` endet an der Teamgrenze) und ihre letzten Nachrichten zu lesen (B9: der Browser hält keinen Verlauf fremder Sitzungen; das Folgen einer Sitzung mit `assistantStream: true` liefert Fenster und Strom, B12). Ob ein Plugin das aus der Manager-Seite heraus darf, ist **ungeprüft** und der erste Versuch am echten Plugin.
29. **Reihenfolge und Zuschnitt (A17 gesamt):** A16 und A17 zusammen sind **mehr als ein Baustein**. Vorschlag zur Diskussion: erst die Leinwand mit den Kacheln und dem Inferenzstatus (A16 Schnitt i), dann Quick-Chat und Center-Peek, dann Dateien (Schnitt ii/iii), danach Team-Designer, zuletzt das Widget-System. Das Widget-System ist ein eigenes Vorhaben mit eigener Spec.
30. **Name:** „MadOS“ als künftiger Name; **heute heißt das Plugin und die Seite „Project OS“** (A15). Offen, ob umbenannt wird, und wann.
31. **Team-Designer (A17 Punkt 8):** Eine Sitzung, die der Mensch auf der Leinwand anlegt, braucht einen Weg, Teammitglieder zu erzeugen (B6: `session.create`, `spawn_teammate` ist ein Agentenwerkzeug). Das Anlegen einer Struktur ohne Agent ist **ungemessen**.
