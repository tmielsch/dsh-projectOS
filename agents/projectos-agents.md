## Projekt-Manager: Namen und Aufträge (dsh-projectOS)

Dieser Abschnitt gehört zum Plugin `dsh-projectOS` und kommt aus der Datei `agents/projectos-agents.md`
im Repo `tmielsch/dsh-projectOS`. Er wird nur dort geändert. Wo frühere Anweisungen regeln, wie ein Agent
benannt, beschrieben oder beauftragt wird, **gilt dieser Abschnitt**.

**Warum es ihn gibt.** Der Projekt-Manager zeigt jede Abteilung als Brett: oben die Gruppenleiter, darunter
ihre Facharbeiter, daneben die Hilfsarbeiter des Abteilungsleiters. Eine Karte trägt, was der Aufrufer beim
Starten angegeben hat. Fehlt das, sieht der Mensch nur den Anfang des ersten Auftragstextes, und bei 80
Karten ist das unlesbar (Beleg 2026-10-28: „<system-reminder> You are …“ und „ERSTER SATZ: Du arbeitest“
auf fast jeder Karte). Der Mensch (2026-10-28): *„es muss halt benannt werden“.*

### 1. Das Feld `description` ist der Name der Karte

Jeder Aufruf von `delegate_task` und `spawn_teammate` füllt `description` mit einem **Namen für die Aufgabe**:

- drei bis fünf Wörter, in der Sprache des Menschen, ohne Satzzeichen am Ende und ohne Markup;
- sagt, **was** getan wird, nicht **wer** es tut: „Kehlbleche Gauben prüfen“, nicht „Red-Team“ oder „Helfer“;
- unterscheidbar von den anderen Karten derselben Gruppe: zwei Karten mit gleichem Namen sind ein Fehler;
- nie ein Anfang des Auftragstextes, nie `<system-reminder>`, nie „ERSTER SATZ“, nie eine Sitzungs-ID.

Beispiele, richtig: „Plan gegen Spec prüfen“, „Brückenfehler Blick melden“, „Kantenprojektion messen“.
Beispiele, falsch: „Du bist ein Facharbeiter …“, „## ERSTER SATZ“, „Task“, „Helper“.

### 2. Die erste Zeile des Auftrags ist ein Titel

Der Titel einer Sitzung entsteht aus den ersten Wörtern ihres ersten Auftrags. Deshalb beginnt **jeder**
Auftrag an einen Unteragenten oder ein Teammitglied mit einer eigenen Zeile:

```text
Titel: <derselbe Name wie in description>
```

Danach folgen alle anderen Blöcke, die ein Projekt vorschreibt (zum Beispiel der Block „ERSTER SATZ“ oder
„Grundkonzept“). Die Titelzeile ersetzt sie nicht und wird von ihnen nicht verdrängt: Sie steht **davor**.
Wo ein Projekt verlangt, dass „jeder Auftrag mit diesem Block beginnt“, gilt das für den Inhalt **nach** der
Titelzeile.

### 3. Wer in welcher Spalte steht

- **Gruppenleiter** (Teammitglieder) heißen so, wie sie beim Starten genannt wurden (`name`). Sie sind die
  Einzigen, die „auf einen Auftrag warten“.
- **Facharbeiter** (Unteragenten eines Gruppenleiters) und **Hilfsarbeiter** (Unteragenten des Abteilungsleiters)
  arbeiten oder sind fertig. Wer fertig ist, wird nicht „wartend“ gehalten, nur damit die Karte stehen bleibt.
- **Bestehende Facharbeiter werden weiterbenutzt** (Regel „Rollen“ in dieser Datei weiter oben): Ein weiterer
  Auftrag an dieselbe Karte per `send_message` ist besser als ein neuer Unteragent. Wer einen neuen startet,
  gibt ihm einen eigenen, neuen Namen nach Punkt 1.

### 4. Was in die Beschreibung eines Gruppenleiters gehört

`spawn_teammate` verlangt eine `description`. Beim Gruppenleiter ist sie keine Aufgabe, sondern sein
**Aufgabengebiet** in einem Satz („STRATA-HDA: Wandmodule, Ecken, Projektion“). Sie wird im Team gespeichert
und ist Teil seiner Sitzung. Der Projekt-Manager zeigt sie **noch nicht** an: die Team-Projektion, die der
Browser liest, trägt für Mitglieder nur Name, Rolle und Zustand. Trotzdem gehört sie sauber ausgefüllt, weil
sie die einzige Stelle ist, an der das Gebiet des Gruppenleiters steht.

### 5. Was der Projekt-Manager nicht ändert

Rollen (`rolle` bei `delegate_task`), Specs, Ziele und Abnahmen laufen wie zuvor. Dieser Abschnitt regelt nur
Namen, Titelzeile und die Einordnung in Spalten.
