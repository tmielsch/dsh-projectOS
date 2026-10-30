/**
 * goal-await-test — Trockenlauf ohne Houdini, ohne Sitzung
 * ========================================================
 *
 * Baut einen nachgemachten Cordis-Kontext mit genau den Diensten, die
 * `goal-await.mjs` anfasst (`tools`, `goals`, `agents`, `systemPrompt`, `on`,
 * `effect`, `set`), und prüft die vier Zusagen:
 *
 *   1. Ein Aufruf von `await_goal_dependency` entschärft das Ziel
 *      (`goals.disarm`) und legt das Werkzeug wieder ab.
 *   2. Eine eingehende Nachricht schaltet es scharf zurück (`goals.resume`)
 *      und die Ziel-Kennung/Revision wird dabei korrekt übergeben.
 *   3. Die Zielrunde selbst (`source.kind === "goal"`) weckt NICHT.
 *   4. Ablauf der Frist weckt ebenfalls, und ein zweiter Aufruf ersetzt den
 *      ersten statt zu stapeln.
 *
 * Der Trockenlauf ist die Bedingung dafür, dass der Patch überhaupt geladen
 * wird: er beweist die Logik, ohne die echte Sitzung zu berühren.
 *
 *   node ~/.dsh/patches/goal-await-test.mjs
 */

import { apply, WERKZEUG } from "./goal-await.mjs";

const ergebnisse = [];
function pruefe(name, ok, zusatz = "") {
	ergebnisse.push({ name, ok, zusatz });
	console.log(`${ok ? "OK  " : "FAIL"}  ${name}${zusatz === "" ? "" : `  — ${zusatz}`}`);
}

/**
 * Ein nachgemachter Kontext.
 *
 * @param ziel - das Ziel, das `goals.get` liefert, oder undefined.
 * @returns der Kontext plus Aufzeichnungen und die Auslöser für Ereignisse.
 */
function bauKontext(ziel) {
	const aufzeichnung = { disarm: [], resume: [], register: [], section: [], provide: [], dienste: {} };
	const hoerer = new Map();
	let effectAufraeumen;
	const kontext = {
		tools: {
			register(definition) {
				aufzeichnung.register.push(definition);
				return () => {
					aufzeichnung.unregister = definition.name;
				};
			}
		},
		goals: {
			get() {
				return ziel;
			},
			disarm(agent) {
				aufzeichnung.disarm.push(agent.id);
				if (ziel !== undefined) ziel.activation = "disarmed";
				return ziel;
			},
			resume(agent, ref) {
				aufzeichnung.resume.push({ agent: agent.id, id: ref.id, revision: ref.revision });
				if (ziel !== undefined) ziel.activation = "armed";
				return ziel;
			}
		},
		agents: { list: () => [] },
		systemPrompt: {
			section(inhalt) {
				aufzeichnung.section.push(inhalt);
				return () => {};
			},
			getSectionOrder: () => 2400
		},
		on(ereignis, rueckruf) {
			const liste = hoerer.get(ereignis) ?? [];
			liste.push(rueckruf);
			hoerer.set(ereignis, liste);
			return () => {
				const jetzt = hoerer.get(ereignis) ?? [];
				const stelle = jetzt.indexOf(rueckruf);
				if (stelle >= 0) jetzt.splice(stelle, 1);
			};
		},
		effect(rueckruf) {
			effectAufraeumen = rueckruf();
		},
		set() {},
		// gemessen 2026-10-29: cordis verlangt ctx.provide vor ctx.set
		// (cordis/lib/index.js:785: "cannot set property ... without provide").
		// Der Attrapp bildet die Anmeldung nach, damit der Trockenlauf den
		// Diagnose-Dienst wirklich anmelden lässt und nicht in den Warn-Zweig
		// abbiegt. Ohne diesen Zweig prüft der Trockenlauf die Reparatur nicht.
		provide(name, value) {
			aufzeichnung.provide.push(name);
			aufzeichnung.dienste[name] = value;
			return () => { delete aufzeichnung.dienste[name]; };
		}
	};
	const ausloesen = (ereignis, nutzlast) => {
		for (const rueckruf of hoerer.get(ereignis) ?? []) rueckruf(nutzlast);
	};
	return { kontext, aufzeichnung, ausloesen, aufraeumen: () => effectAufraeumen?.() };
}

const warten = (ms) => new Promise((fertig) => setTimeout(fertig, ms));

// ---------------------------------------------------------------- Fall 1..4
{
	const ziel = { id: "goal-test", revision: 7, objective: "Testziel", phase: "active", activation: "armed", roundsStarted: 2, maxGoalRounds: 10 };
	const { kontext, aufzeichnung, ausloesen, aufraeumen } = bauKontext(ziel);
	apply(kontext, { maxWaitSeconds: 900 });
	await warten(50);

	const werkzeug = aufzeichnung.register.find((d) => d.name === WERKZEUG);
	pruefe("Werkzeug registriert", werkzeug !== undefined, werkzeug === undefined ? "kein register" : WERKZEUG);
	if (werkzeug === undefined) {
		process.exit(1);
	}

	const agent = { id: "agent-1" };
	const antwort = await werkzeug.execute({ waiting_for: "  die Zahlen von P8  " }, { agent });

	pruefe("Ziel entwaffnet", aufzeichnung.disarm.includes("agent-1") === true);
	pruefe("Ziel danach disarmed", ziel.activation === "disarmed");
	pruefe("Antwort sagt: wartet", antwort.waiting === true);
	pruefe("Antwort weckt bei Nachricht", antwort.wakes_on === "message", antwort.wakes_on);
	pruefe("Bedingung getrimmt", antwort.note.includes("die Zahlen von P8"), antwort.note);
	pruefe("Frist 900 s", antwort.max_wait_seconds === 900, String(antwort.max_wait_seconds));

	// Die Zielrunde selbst darf NICHT wecken.
	ausloesen("agent/inbox/inserted", { agent, message: { source: { kind: "goal", round: 3 } } });
	pruefe("Zielrunde weckt nicht", ziel.activation === "disarmed" && aufzeichnung.resume.length === 0);

	// Eine echte Nachricht weckt und trägt Kennung + Revision.
	ausloesen("agent/inbox/inserted", { agent, message: { source: { kind: "team-message", senderName: "strata-hda-experte" } } });
	pruefe("Nachricht schaltet scharf", ziel.activation === "armed");
	pruefe("resume mit Kennung und Revision", aufzeichnung.resume.length === 1 && aufzeichnung.resume[0].id === "goal-test" && aufzeichnung.resume[0].revision === 7);

	// Zweite Nachricht darf nicht doppelt fortsetzen.
	ausloesen("agent/inbox/inserted", { agent, message: { source: { kind: "agent-message" } } });
	pruefe("kein zweites resume ohne Wartezustand", aufzeichnung.resume.length === 1);

	// Aufräumen nimmt den Werkzeug-Eintrag zurück.
	aufraeumen();
	pruefe("Aufräumen meldet Werkzeug ab", aufzeichnung.unregister === WERKZEUG);
}

// ---------------------------------------------------------------- Fristablauf
{
	const ziel = { id: "goal-frist", revision: 2, objective: "Fristziel", phase: "active", activation: "armed", roundsStarted: 0, maxGoalRounds: 5 };
	const { kontext, aufzeichnung } = bauKontext(ziel);
	apply(kontext, { maxWaitSeconds: 5 });
	await warten(50);
	const werkzeug = aufzeichnung.register.find((d) => d.name === WERKZEUG);
	const agent = { id: "agent-2" };
	const antwort = await werkzeug.execute({ waiting_for: "etwas, das nie kommt", max_wait_seconds: 5 }, { agent });
	pruefe("kurze Frist angenommen", antwort.max_wait_seconds === 5, String(antwort.max_wait_seconds));
	pruefe("Ziel wartet", ziel.activation === "disarmed");
	// Die kleinste erlaubte Frist ist 5 s; der Test wartet deshalb gut 6 s.
	await warten(6000);
	pruefe("Frist weckt von selbst", ziel.activation === "armed", `resume=${aufzeichnung.resume.length}`);
}

// ---------------------------------------------------------------- Ersetzen
{
	const ziel = { id: "goal-ersatz", revision: 1, objective: "Ersatzziel", phase: "active", activation: "armed", roundsStarted: 0, maxGoalRounds: 5 };
	const { kontext, aufzeichnung } = bauKontext(ziel);
	apply(kontext, {});
	await warten(50);
	const werkzeug = aufzeichnung.register.find((d) => d.name === WERKZEUG);
	const agent = { id: "agent-3" };
	await werkzeug.execute({ waiting_for: "erste Sache" }, { agent });
	await werkzeug.execute({ waiting_for: "zweite Sache", max_wait_seconds: 60 }, { agent });
	pruefe("zwei Aufrufe entwaffnen zweimal", aufzeichnung.disarm.length === 2, String(aufzeichnung.disarm.length));
	pruefe("kein resume beim Ersetzen", aufzeichnung.resume.length === 0);
}

// ---------------------------------------------------------------- Kein Ziel
{
	const ziel = undefined;
	const { kontext, aufzeichnung } = bauKontext(ziel);
	apply(kontext, {});
	await warten(50);
	const werkzeug = aufzeichnung.register.find((d) => d.name === WERKZEUG);
	const antwort = await werkzeug.execute({ waiting_for: "irgendwas" }, { agent: { id: "agent-4" } });
	pruefe("ohne Ziel nichts entwaffnet", antwort.waiting === false && antwort.wakes_on === "none", antwort.note);
	pruefe("ohne Ziel kein disarm", aufzeichnung.disarm.length === 0);
}

// ---------------------------------------------------------------- Diagnose-Dienst
// Die Reparatur vom 2026-10-29: Der Dienst `goalAwait` muss mit ctx.provide
// angemeldet werden, weil cordis ein ctx.set ohne vorheriges provide abweist
// (cordis/lib/index.js:785). Der Start-Abbruch dieses Patches war genau das.
{
	const ziel = { id: "goal-dienst", revision: 1, objective: "Dienstziel", phase: "active", activation: "armed", roundsStarted: 0, maxGoalRounds: 5 };
	const { kontext, aufzeichnung, aufraeumen } = bauKontext(ziel);
	apply(kontext, {});
	await warten(50);
	pruefe("Diagnose-Dienst goalAwait angemeldet", aufzeichnung.provide.includes("goalAwait"), JSON.stringify(aufzeichnung.provide));
	pruefe("Diagnose-Dienst lesbar", typeof aufzeichnung.dienste.goalAwait?.offene === "function" && typeof aufzeichnung.dienste.goalAwait?.wecke === "function");
	aufraeumen();
	pruefe("Diagnose-Dienst beim Abbau weg", aufzeichnung.dienste.goalAwait === undefined);
}

const fehler = ergebnisse.filter((e) => !e.ok);
console.log(`\n${ergebnisse.length - fehler.length}/${ergebnisse.length} Prüfungen bestanden`);
process.exit(fehler.length === 0 ? 0 : 1);
