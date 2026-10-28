# Übergabe 2026-10-25, 02:15 — Unteragenten: Dateien, Bilder, Fortsetzbarkeit

**Für:** die Sitzung, die in der Nacht zum 2026-10-25 an Compaction gearbeitet hat
(und für jede Sitzung, die diese Datei später findet).

**Kurz:** Du hast mitten in der Arbeit eine geänderte `cordis.patch.yml`
vorgefunden, die von 1098 auf 573 Zeilen geschrumpft war und jetzt wieder 1098
Zeilen hat. Ich war das, und zwar absichtlich. Hier steht, warum, was genau
passiert ist und was du tun musst.

---

## Was los war

Um **02:05:04** war `~/.dsh/profiles/web/cordis.patch.yml` nur noch 573 Zeilen
lang (vorher 1098). Weg waren unter anderem:

- die ganze Houdini-Voreinstellung (`preset-houdini`) samt Delegations-Gruppe,
- `tool-delegate-task`,
- `subagent-model-selection-settings` (die gemeinsame Modell-Liste),
- `mitglied-bilder-freigabe`, `mitglied-modellwahl`, `teammate-modell`,
- `ui-chat`, `agent-loop`.

Gleichzeitig wuchs `profiles/web/cordis.yml` von 4 auf 1868 Zeilen. Das ist
genau die Fehlerklasse, die schon als Commit `89387fc` dokumentiert ist: die
**Live-Nachladung** schreibt die zusammengesetzte Fassung in `cordis.yml` und
kürzt dabei die Patch-Datei. `cordis.yml` ist die Wurzel des Baums und muss
leer bleiben (eigener Kommentar in der Datei: „Edit cordis.patch.yml, not this
file").

Ich habe das gemerkt, weil `git status` eine Änderung an dieser Datei meldete,
die ich nicht verursacht hatte — ich hatte zu diesem Zeitpunkt nur
`patches/*.mjs` angefasst. Ich habe dann aus `HEAD` wiederhergestellt:

```
git -C ~/.dsh checkout HEAD -- profiles/web/cordis.patch.yml profiles/web/cordis.yml
```

Damit ist der Stand **vor** deiner und vor meiner Sitzung zurück: 1098 Zeilen,
alle Einträge wieder da, `cordis.yml` wieder der leere Stummel.

## Was ich dabei versehentlich mit zurückgerollt habe — und was du tun musst

In der gekürzten Fassung stand eine Änderung, die **nicht von mir** war und die
ich beim Wiederherstellen mitgenommen habe:

```
- id: agent-default-model
  config:
    provider: neuralwatt
    model: glm-5.3-flex      # ← stand in der gekürzten Fassung
```

Jetzt steht dort wieder `deepseek-v4.1-flash`. Wenn `glm-5.3-flex` deine
Absicht war, setze es neu — ich habe es absichtlich **nicht** selbst
zurückgeschrieben, weil ich nicht weiß, ob du es noch willst, und weil ich nicht
ein zweites Mal in eine fremde Absicht eingreifen wollte.

Der vollständige gekürzte Stand liegt zum Vergleich hier:

```
~/.dsh/patches/cordis.patch.yml.gekuerzt-2026-10-25-0206.txt
```

Ein `diff` gegen die heutige Fassung zeigt dir jede Zeile, die dir fehlt.

## Was ich in dieser Zeit gebaut habe (Ursache für meine Schreibzugriffe)

Auftrag des Menschen: Unteragenten mit `delegate_task` sollen keine
Einmal-Aufgaben sein, sondern normale Sitzungen — mit ihnen schreiben können,
Bilder und Dateien senden. Vier Änderungen, alle committet und gepusht
(Zweig `mac`):

| Commit | Was |
|---|---|
| `95fb660` | `tool-delegate-task` von `one-shot` auf `continuable`; `send_message` bekommt `agent_id` |
| `15c77e6` | Argument-Prüfung nicht mehr verlieren (ein Aufruf ohne Text wurde leer zugestellt) |
| `dcc10a9` | Anhänge über `send_message`: `attach` mit Pfadliste (Dateien und Bilder) |
| `6d3b56b`, `d982b10` | Büroklammer im Browser-Fenster: `subagent-files.mjs`, `allow-subagent-files.mjs`, Prüfung in `doctor.sh` |

**Wichtig für dich, falls du Konfiguration änderst:** `tool-delegate-task` steht
jetzt auf `backgroundMode: continuable` (vorher `one-shot`). Das ist der
Kern-Normalfall; `one-shot` ist die Ausnahme für die Fremdanbieter `codex` und
`claude-code`. Bitte nicht wieder „zurückvereinfachen".

## Wie du diesen Fehler künftig vermeidest

Zwei Regeln, beide aus dem heutigen Abend:

1. **Vor jedem Commit `git -C ~/.dsh status` lesen.** Steht dort eine Datei, die
   du nicht angefasst hast, ist das keine Bequemlichkeit, sondern ein Signal.
   Heute war es das einzige.
2. **`profiles/web/cordis.yml` ist nie ein Ziel.** Wenn sie Inhalt bekommt, ist
   das die Live-Nachladung, nicht du. Zurück auf den Stummel:
   `git -C ~/.dsh checkout HEAD -- profiles/web/cordis.yml`

Wenn zwei Sitzungen gleichzeitig Konfiguration ändern, schreiben sie in
dieselbe Datei — die Plugins sind nur im Verhalten getrennt, nicht im
Speicherort. Gleichzeitige Schreibzugriffe gehören nacheinander, nicht
parallel.

## Offen bei dir

- Ist `glm-5.3-flex` als Standardmodell noch gewollt? Dann neu setzen.
- Deine Compaction-Arbeit selbst habe ich nicht angefasst — nur die
  Konfigurationsdatei, in die sie hineingeschrieben hätte. Prüfe, ob deine
  Einträge noch da sind; wenn dir etwas fehlt, sag es, dann trage ich es aus
  deiner Sitzung nach.
