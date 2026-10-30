# Kontext-Menü in DSH — Plan (Stand 2026-10-30)

Anordnung des Menschen vom 2026-10-30, sinngemäß wörtlich: „Es ist halt noch kein
richtiges Rechtsklick-Menü. Ich meine einfach einen Rechtsklick, ein Kontext-Menü. Und das
sollte nicht nur auf Workspaces funktionieren, das sollte quasi global in DSH funktionieren.
Je nachdem, wo man draufklickt, kann das dann context-dependent andere Sachen anzeigen.“
Nachtrag: „Es wäre gut, wenn dieses Rechtsklick-Kontext-Menü quasi nur eine andere
Darstellungsform derselben Felder ist — der Inhalt, mit dem die Menüs populated werden, soll
man auch in anderen Frames und im Node-Graphen später haben. Das ist jetzt nur architektonisch
für den Hinterkopf.“

Die Spec gewinnt: SPEC.md Zeilen 410–416 (A19 Punkt 3) verlangen das Rechtsklick-Fenster
(„Set Policies“ → Pop-up mit den Policies) und „so einen kleinen Window-Manager mit Windows,
die man hin und her ziehen kann“. SPEC.md Zeile 331 (A16 Punkt 7): Brett und Graph zeigen
dieselben Kacheln in zwei Darstellungen. Dieser Plan setzt diese Sätze um und schlägt nichts
vor, was ihnen widerspricht.

## 1. Gemessener Ist-Stand

- **Heute gibt es kein Kontext-Menü.** entry.tsx Zeilen 124–139 hören auf `contextmenu` im
  Dokument und öffnen das Fenster direkt, wenn die getroffene Zeile `data-row-key` mit
  `workspace:` beginnt. Ein Menü wird nicht gezeichnet.
- **Die Zeilen der Seitenleiste tragen die Kennung:** Workspace-Zeile
  `data-row-key="workspace:<key>"` (dsh-client-ui-workspace/lib/client.js Zeile 1287),
  Sitzungszeile `data-row-key="session:<id>"` (Zeile 1592).
- **Das Menü der Workspace-Zeile ist fest:** `workspaceMenuItems` = rename, delete
  (Zeilen 1275–1284), gezeichnet mit `dsh-client-ui-primitives.Menu` am
  Dreipunkte-Knopf (Zeilen 1316–1340). Die Projektzeile ist die feste Funktion
  `ProjectRowItem`; in ihr steht kein `renderSlot` (SPEC B4, gemessen Zeilen 487–494).
- **Der Menü-Baustein ist vorhanden und kann an einer Zeigerposition verankert werden:**
  `Menu` mit `portal: true` rendert die Liste in document.body, fest positioniert aus dem
  Anker-Rechteck (dsh-client-ui-primitives/lib/types/Menu.d.ts Zeilen 89–91), und
  `getAnchorRect` (Zeilen 99–104) erlaubt, das Rechteck direkt zu liefern — genau das für
  einen Rechtsklick ohne eigenen Trigger-Knopf. Eintragstypen: MenuItem {id, label, icon,
  disabled, danger, shortcut, submenu}, MenuSeparator, MenuLabel (Zeilen 3–31).
- **Die Stapelschicht ist gemessen:** die Shell-Overlay-Schicht `.pI_x6G_overlayLayer`
  (dsh-client-ui-layout/lib/client.js Zeile 73) ist `z-index:20; position:absolute` — eigener
  Stapelkontext. In Chromium gemessen: ein Fenster in dieser Schicht verliert gegen die
  Matrix-Kanvas bei z-index 2147482000, egal wie hoch sein eigener Wert ist
  (elementFromPoint antwortet CANVAS); ein Körper-Container gewinnt. Gemessene Matrix-Höhen:
  canvas 2147482000 (~/.dsh/profiles/web/node_modules/@weibaohui/dsh-matrix/client/index.js
  Zeile 230), toast 2147482400 (Zeile 658), modal 2147483000 (client/bundle.js Zeile 130).
  dsh-matrix wird nicht angefasst.

## 2. Quellen, die das Menü populated

Vier gemessene Quellen; sie sind getrennt von der Darstellung:

1. **Slot-Katalog (Einhängepunkte der Shell).** Verträge in
   dsh-client-ui-{sidebar,workspace,conversation,sidebar-right}/lib/types/client/contract/slots.d.ts.
   Gemessen deklariert: `sidebar.panellist` (list, root), `sidebar.workspaces` (single, root),
   `sidebar.workspaces.session.menu.item` (list, root) und
   `sidebar.workspaces.session.row.action` (list, root) — beide gehören zur **Sitzungs**zeile;
   für die **Workspace**-Zeile gibt es keinen Slot. `shell.overlay` (list, root) ist die
   Rahmen-Schicht (dsh-client-ui-layout/lib/client.js Zeilen 617–620).
2. **Plugin-Registry.** Im Profil ~/.dsh/profiles/web/package.json stehen 21 Abhängigkeiten;
   cordis.patch.yml führt Plugins mit `id`, `name` und Konfiguration. Jedes Plugin erklärt in
   seiner package.json den Block `dsh.client` (Paketform gemessen in SPEC B7); projectOS tut
   das mit `inject: [remotes, session-controller, locale, layout-ui, sidebar-ui, workspace-ui]`.
3. **Workspace-Registry im Browser.** `useWorkspaces` ist ein
   SnapshotSelectorHook über WorkspaceSnapshot
   (dsh-client-ui-workspace/lib/types/client/index.d.ts Zeile 11); projectOS liest
   `state.items` als `{workspaceId, path, title}` (src/client/policy-model.ts Zeilen 18–22).
4. **Project-OS-Karten.** Die Policy-Library über die Remote-Fassade `policies`:
   listLibrary, listWorkspace, savePolicy, deletePolicy, setEnable
   (src/client/policy-schemas.ts Zeilen 27–66; Karten {id, title, body, order, createdAt,
   updatedAt, enabled}). Der Host hält die Wahrheit in
   ~/.dsh/storages/workspace_policies.json.

## 3. Wie pro Klickstelle die Quelle gewählt wird — der Kontext-Descriptor

Der Kern des Menüs ist **eine kleine Datenform**, nicht eine Liste von Knoten: ein
Kontext-Descriptor, der aus dem Treffer im DOM entsteht.

```ts
interface ContextDescriptor {
  kind: 'workspace' | 'session' | 'card' | 'file' | 'none'   // gemessen: workspace:, session:
  id: string            // workspaceId, sessionId, cardId, Pfad
  title: string         // Anzeigename der Zeile
  origin: { x: number; y: number }   // Klickpunkt für getAnchorRect
  actions: MenuEntry[]  // Reihen, die eine Quelle für diesen kind beigesteuert hat
}
```

Ablauf je Rechtsklick:

1. **Treffer bestimmen:** `event.target.closest('[data-row-key]')` liefert Präfix und Id;
   ohne Treffer ist der Descriptor `kind: 'none'` und das Menü zeigt nur globale Einträge.
2. **Quelle wählen:** ein Resolver ordnet `kind` den Beiträgen zu. projectOS meldet für
   `workspace` die Zeile „Set Policies“ (öffnet das Policy-Fenster an dieser Stelle) und für
   `session` später „In die Abteilung“; die Workspace-Registry liefert Titel und Pfad; die
   Karten-Library liefert die Policy-Karten dieses Workspace als Unter-Menü (Toggle je Karte,
   gemessen am vorhandenen CardRow-Schalter in Policies.tsx Zeilen 100–109).
3. **Beitrag anmelden:** Quellen melden sich beim Kern mit `register({kind, entries})`; der
   Kern mischt sie pro Descriptor. Das ist die schmale Schnittstelle aus SPEC A8 („Erweiterbarkeit
   durch gute Architektur, nicht durch ein System“): eine neue Quelle ist ein Modul im Repo, das
   seinen `kind` und seine Reihen anmeldet, ohne den Kern umzubauen.

## 4. Das Menü als eigene Overlay-Schicht über der Rain

- **Zeichnung:** `Menu` mit `portal: true` und `getAnchorRect: () => rect` aus dem Klickpunkt
  (gemessener Vertrag Menu.d.ts Zeilen 89–104). Die Liste landet in document.body, also
  außerhalb der Overlay-Schicht bei z-index 20.
- **Höhe:** die Menü-Ebene wird wie das Policy-Fenster als Körper-Container mit
  `z-index: 2147483647` angelegt (styles.ts Zeile 119, gemessen über canvas 2147482000,
  toast 2147482400, modal 2147483000). Ein `MenuSurface` (Menu.d.ts Zeilen 1–15 der
  MenuSurface.d.ts) trägt das Menü-Material und die macOS-Unterlegung.
- **Regeln:** `event.preventDefault()` auf contextmenu; `onClose` bei Outside-Click, Escape
  (gemessen Zeilen 84–86); `closeOnPointerLeave` für Unter-Menüs.
- **Kein zweites React:** Portal durch react-dom aus dem Modulsystem der Seite
  (gemessen: in index-5SrrfWpU.js Zeile 126 als „react-dom“ und „react-dom/client“ registriert;
  `eval('require')` erreicht diese require im Bundel, Messergebnis runtime result 'function').

## 5. Was projectOS beisteuert

- **„Set Policies“ auf Workspace-Zeilen:** der Eintrag öffnet das vorhandene Policy-Fenster
  (PolicyWindow in Policies.tsx Zeilen 221–283) an der Klickstelle; der Store
  (policy-store.ts Zeilen 24–49) hält genau eine Fensteranfrage, Ziehen am Kopf verschiebt,
  ✕ schließt — alles vorhanden, nichts neu geschrieben.
- **Karten im Unter-Menü:** die Policy-Karten des getroffenen Workspace als MenuItem-Zeilen
  mit Toggle (enabled), sortiert nach `order` (sortCards in policy-model.ts Zeilen 25–27).
- **Der Tab „Policies“** bleibt der Editor der Library (PolicyTab, Policies.tsx Zeilen 177–215);
  das Menü ist eine Darstellungsform derselben Felder, keine zweite Implementierung.

## 6. Dieselben Felder in anderen Frames und im Node-Graphen

Der Kontext-Descriptor ist die gemeinsame Form: Brett-Kachel (ManagerPage), Graph-Kachel
(SPEC A16/A17: „die Knoten des Graphen sind identisch mit den Kanban-Kacheln“), Seitenpanel
und künftige Widgets lesen dieselben Felder {kind, id, title, actions}. Ein Menü, ein Frame
und ein Knoten sind drei Darstellungen desselben Datensatzes; eine neue Darstellung braucht
keine neue Quelle. Der Node-Graph ist ein eigenes Vorhaben mit eigener Spec (SPEC D29).

## 7. Offene Punkte vor dem Bau

1. **Kein Slot für die Workspace-Zeile:** ein Beitrag zur Workspace-Zeile braucht entweder
   einen neuen Slot im Kern (`sidebar.workspaces.project.row.action`, analog zu
   `session.row.action`, SPEC B4 Zeilen 493–494) oder den Dokument-Listener, den projectOS
   heute nutzt. Empfehlung: der Listener bleibt die erste Fassung, der Slot wird beim Kern
   beantragt.
2. **Reihenfolge der Beiträge:** mehrere Quellen melden denselben `kind`; eine `order`-Zahl
   wie bei Slots (gemessen order 30/40 in entry.tsx Zeilen 100 und 118) entscheidet.
3. **Tastatur:** `Menu` bringt Tab/Escape/Fokusrückgabe bereits (gemessen Zeilen 70–76).

## 8. Abnahme des Plans

- Der Plan nennt die Sätze der Spec, die er umsetzt (oben, A19 und A16 Punkt 7).
- Jede Aussage ist mit Datei und Zeile gemessen; nichts ist behauptet.
- Eine Red-Team-Stichprobe prüft den Plan zuerst gegen die Spec, dann gegen Lücken.
- Bis zum Ja des Leads geschieht keine Code-Änderung.
