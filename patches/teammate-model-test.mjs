/**
 * Pruefstand fuer teammate-model.mjs — laeuft ohne DSH und ohne Houdini.
 * ======================================================================
 *
 * WARUM
 * Das Plugin greift in fremde Objekte (Werkzeug-Definition, Prototyp des
 * fortsetzbaren Verwalters). Ein Syntaxcheck sagt darueber nichts. Dieser
 * Pruefstand baut die beteiligten Objekte nach — Form nach dem gelesenen Code
 * von DSH 0.2.0-rc.2 — und prueft das Verhalten von aussen: was steht am Ende
 * im Werkzeug-Schema, und was erreicht `startContinuable`?
 *
 * Aufruf:  node ~/.dsh/patches/teammate-model-test.mjs
 * Ergebnis: "Pruefstand: alles in Ordnung." und Rueckgabewert 0, sonst 1.
 */

import { apply, name, inject } from "./teammate-model.mjs";

// Das Protokoll des Pruefstands geht ins Leere: sonst schriebe jeder Testlauf in
// ~/.dsh/logs/teammate-modell.log und machte die Messung der laufenden Sitzung
// unbrauchbar.
process.env.DSH_TEAMMATE_MODELL_LOG = "/dev/null";

let fehler = 0;
const pruefe = (bedingung, was) => {
	if (bedingung) return;
	fehler += 1;
	console.log(`FEHLER  ${was}`);
};

/**
 * Eine Werkzeug-Definition, wie sie das Team-Plugin baut (verkuerzt).
 *
 * Der Ablauf stellt den echten Weg nach: das Team-Werkzeug ruft am Ende
 * `subagents.continuations.startContinuable(...)` — ohne `agentOptions`. Genau
 * dort setzt das Plugin an, deshalb muss der Pruefstand diesen Aufruf wirklich
 * ausfuehren und nicht nur mitzaehlen.
 *
 * @param {(spez: object) => Promise<unknown>} anlegen - der Anlege-Vorgang.
 * @returns {object} die nachgebaute Werkzeug-Definition.
 */
function werkzeugDefinition(anlegen) {
	return {
		name: "spawn_teammate",
		description: "Create one named, durable teammate. Only the Team Lead may call this tool.",
		parameters: {
			type: "object",
			properties: {
				name: { type: "string", description: "Unique lower-kebab-case teammate name." },
				description: { type: "string", description: "Short description of the delegated responsibility." },
				prompt: { type: "string", description: "Complete initial task for the teammate." },
				context: { type: "string", enum: ["fresh", "fork"], description: "fresh starts without Lead history; fork inherits completed Lead turns. Defaults to fresh." }
			},
			required: ["name", "description", "prompt"]
		},
		async execute(args) {
			aufrufe.push(args);
			await anlegen({
				childId: "kind-1",
				provider: args.context === "fork" ? "fork" : "spawn",
				label: args.description,
				request: { prompt: [{ type: "text", text: args.prompt }], parent: { id: "lead" } },
				signal: new AbortController().signal
			});
			return { member: { target: args.name, role: "teammate", status: "provisioning", diagnostics: [] } };
		}
	};
}

/** Was das umgebogene Werkzeug an den echten Anlege-Vorgang weitergegeben hat. */
const aufrufe = [];
/** Die Auftraege, die `startContinuable` erreicht haben. */
const angelegt = [];

/** Der fortsetzbare Verwalter: hier ist `startContinuable` definiert. */
class Verwalter {
	async startContinuable(spec) {
		angelegt.push(spec);
		return { childId: spec.childId, messageId: "nachricht-1" };
	}
}

/** Der Dienst `subagents`, wie er aus dem Modul gesehen wird. */
function subagentDienst() {
	const verwaltung = new Verwalter();
	const dienst = {
		continuations: verwaltung,
		async startContinuable(spec) {
			// Der echte Dienst reicht nur an den Verwalter weiter — genau wie hier.
			return verwaltung.startContinuable(spec);
		}
	};
	return { dienst, verwaltung };
}

/**
 * Baut das Cordis-Umfeld nach, das `apply` erwartet.
 *
 * @param {Array<{provider: string, model: string}>|undefined} routen - Inhalt der gemeinsamen Liste; undefined = abgeschaltet.
 * @param {object} [optionen] - `ohneWerkzeug`: das Team-Werkzeug ist (noch) nicht sichtbar.
 * @returns {object} das nachgebaute Umfeld samt Definition und Aufraeumern.
 */
function umfeld(routen, optionen = {}) {
	const { dienst, verwaltung } = subagentDienst();
	const definition = optionen.ohneWerkzeug === true
		? undefined
		: werkzeugDefinition(async (spez) => dienst.startContinuable(spez));
	const agent = { id: "lead" };
	const ereignisse = new Map();
	/** Die Aufraeumer aus `ctx.effect`, damit der Pruefstand die Ruecknahme pruefen kann. */
	const aufraeumer = [];
	const werkzeuge = {
		get: (n, scope) => n === "spawn_teammate" && scope === agent ? definition : undefined
	};
	const ctx = {
		logger: { info: () => {}, warn: () => {}, error: () => {} },
		get: (n) => {
			if (n === "subagents") return dienst;
			if (n === "subagentModelSelection") {
				return routen === undefined ? undefined : { current: () => ({ enabled: true, allowedModels: routen }) };
			}
			if (n === "llm") {
				return {
					async resolveCallConfig(config) {
						if (config.model === "gibt-es-nicht") throw new Error("unknown model");
						if (config.reasoningEffort === "unsinn") throw new Error("unsupported reasoning effort");
						return { ...config, reasoningEffort: config.reasoningEffort ?? "medium" };
					}
				};
			}
			return undefined;
		},
		agents: { list: () => (optionen.ohneAgent === true ? [] : [agent]) },
		tools: werkzeuge,
		on: (ereignis, hoerer) => {
			const liste = ereignisse.get(ereignis) ?? [];
			liste.push(hoerer);
			ereignisse.set(ereignis, liste);
		},
		effect: (lauf) => {
			const aufraeumen = lauf();
			if (typeof aufraeumen === "function") aufraeumer.push(aufraeumen);
			return () => {};
		},
		emit: (ereignis, nutzlast) => {
			for (const hoerer of ereignisse.get(ereignis) ?? []) hoerer(nutzlast);
		}
	};
	return { ctx, definition, verwaltung, werkzeuge, agent, ereignisse, aufraeumer };
}

const ROUTEN = [
	{ provider: "neuralwatt", model: "gemma-4-31b" },
	{ provider: "neuralwatt", model: "deepseek-v4-flash" }
];

// --- 1. Kopfdaten -----------------------------------------------------------
pruefe(name === "teammate-modell", `Modulname ist ${name}`);
pruefe(Array.isArray(inject) && inject.includes("tools") && inject.includes("subagents"), "inject nennt tools und subagents");

// --- 2. Das Werkzeug bekommt die drei Felder --------------------------------
{
	const { ctx, definition } = umfeld(ROUTEN);
	apply(ctx);
	const felder = Object.keys(definition.parameters.properties);
	for (const feld of ["provider", "model", "reasoning_effort"]) pruefe(felder.includes(feld), `Parameter ${feld} fehlt am Werkzeug`);
	pruefe(Object.keys(definition.parameters.properties).length === 7, `das Schema hat ${Object.keys(definition.parameters.properties).length} Felder, erwartet 7 (die vier alten und die drei neuen)`);
	pruefe(definition.parameters.required.length === 3, "die Pflichtfelder bleiben unveraendert drei");
	pruefe(definition.description.includes("gemma-4-31b"), "die erlaubten Routen stehen in der Werkzeug-Beschreibung");
	pruefe(definition.description.startsWith("Create one named, durable teammate."), "die urspruengliche Beschreibung bleibt am Anfang stehen");
}

// --- 3. Ohne Modellangabe aendert sich nichts --------------------------------
{
	const { ctx, definition } = umfeld(ROUTEN);
	apply(ctx);
	aufrufe.length = 0;
	angelegt.length = 0;
	await definition.execute({ name: "a", description: "b", prompt: "c" });
	pruefe(aufrufe.length === 1, "der urspruengliche Ablauf wurde aufgerufen");
	pruefe(aufrufe[0].provider === undefined, "ohne Angabe wird kein Anbieter erfunden");
	pruefe(angelegt.length === 1, "das Mitglied wurde angelegt");
	pruefe(angelegt[0].request.agentOptions === undefined, "ohne Angabe bekommt das Anlegen keine Modellvorgabe — das Mitglied erbt also");
}

// --- 4. Mit Modellangabe erreicht die Wahl wirklich startContinuable --------
{
	const { ctx, definition } = umfeld(ROUTEN);
	apply(ctx);
	aufrufe.length = 0;
	angelegt.length = 0;
	const ergebnis = await definition.execute({ name: "a", description: "b", prompt: "c", provider: "neuralwatt", model: "gemma-4-31b" });
	pruefe(ergebnis?.member?.target === "a", "das Werkzeug liefert weiterhin seine Antwort");
	pruefe(angelegt.length === 1, `der Anlege-Vorgang wurde genau einmal erreicht, war ${angelegt.length}x`);
	pruefe(angelegt[0]?.request?.agentOptions?.provider === "neuralwatt", `der Anbieter kommt beim Anlegen an, war ${JSON.stringify(angelegt[0]?.request?.agentOptions)}`);
	pruefe(angelegt[0]?.request?.agentOptions?.model === "gemma-4-31b", "das Modell kommt beim Anlegen an");
	pruefe(angelegt[0]?.request?.agentOptions?.reasoningEffort === "medium", "die Denktiefe des gewaehlten Modells wird uebernommen, wenn keine genannt ist");
	pruefe(angelegt[0]?.request?.prompt !== undefined, "der Auftrag bleibt unveraendert daneben stehen");
	pruefe(angelegt[0]?.provider === "spawn", "der Anlege-Anbieter (spawn) bleibt unberuehrt");
}

// --- 5. Eine genannte Denktiefe schlaegt die Standardtiefe -----------------
{
	const { ctx, definition } = umfeld(ROUTEN);
	apply(ctx);
	angelegt.length = 0;
	await definition.execute({ name: "a", description: "b", prompt: "c", provider: "neuralwatt", model: "gemma-4-31b", reasoning_effort: "high" });
	pruefe(angelegt[0]?.request?.agentOptions?.reasoningEffort === "high", `die genannte Denktiefe kommt an, war ${angelegt[0]?.request?.agentOptions?.reasoningEffort}`);
}

// --- 6. Die Wahl bleibt auf den einen Aufruf beschraenkt -------------------
{
	const { ctx, definition } = umfeld(ROUTEN);
	apply(ctx);
	angelegt.length = 0;
	await definition.execute({ name: "a", description: "b", prompt: "c", provider: "neuralwatt", model: "gemma-4-31b" });
	await definition.execute({ name: "d", description: "e", prompt: "f" });
	pruefe(angelegt.length === 2, "beide Aufrufe haben angelegt");
	pruefe(angelegt[0]?.request?.agentOptions !== undefined, "der erste Aufruf trug die Wahl");
	pruefe(angelegt[1]?.request?.agentOptions === undefined, "der zweite Aufruf ohne Angabe trug keine Wahl mehr — die Wahl blutet nicht in den naechsten Aufruf");
}

// --- 7. Nur erlaubte Routen gehen durch ------------------------------------
{
	const { ctx, definition } = umfeld(ROUTEN);
	apply(ctx);
	let meldung;
	angelegt.length = 0;
	try {
		await definition.execute({ name: "a", description: "b", prompt: "c", provider: "anthropic", model: "claude-opus-5-5" });
	} catch (error) { meldung = error.message; }
	pruefe(typeof meldung === "string" && meldung.includes("nicht freigegeben"), `eine nicht freigegebene Route wird abgelehnt, Meldung war: ${meldung}`);
	pruefe(typeof meldung === "string" && meldung.includes("gemma-4-31b"), "die Meldung nennt die erlaubten Routen");
	pruefe(angelegt.length === 0, "bei einer abgelehnten Route wird nichts angelegt");
}

// --- 8. Anbieter und Modell gehoeren zusammen ------------------------------
{
	const { ctx, definition } = umfeld(ROUTEN);
	apply(ctx);
	let meldung;
	try {
		await definition.execute({ name: "a", description: "b", prompt: "c", provider: "neuralwatt" });
	} catch (error) { meldung = error.message; }
	pruefe(typeof meldung === "string" && meldung.includes("gehoeren zusammen"), `nur der Anbieter wird abgelehnt, Meldung war: ${meldung}`);
}

// --- 9. Eine unbekannte Denktiefe faellt vor dem Anlegen auf ---------------
{
	const { ctx, definition } = umfeld(ROUTEN);
	apply(ctx);
	let meldung;
	angelegt.length = 0;
	try {
		await definition.execute({ name: "a", description: "b", prompt: "c", provider: "neuralwatt", model: "gemma-4-31b", reasoning_effort: "unsinn" });
	} catch (error) { meldung = error.message; }
	pruefe(typeof meldung === "string" && meldung.includes("abgelehnt"), `eine unsinnige Denktiefe wird abgelehnt, Meldung war: ${meldung}`);
	pruefe(angelegt.length === 0, "bei abgelehnter Denktiefe wird nichts angelegt");
}

// --- 10. Abgeschaltete Liste: kein stilles Ignorieren ----------------------
{
	const { ctx, definition } = umfeld(undefined);
	apply(ctx);
	let meldung;
	angelegt.length = 0;
	try {
		await definition.execute({ name: "a", description: "b", prompt: "c", provider: "neuralwatt", model: "gemma-4-31b" });
	} catch (error) { meldung = error.message; }
	pruefe(typeof meldung === "string" && meldung.includes("leer oder abgeschaltet"), `ohne Liste wird die Auswahl abgelehnt statt ignoriert, Meldung war: ${meldung}`);
	pruefe(definition.description.includes("currently unavailable"), "die Beschreibung sagt, dass die Auswahl gerade nicht geht");
	pruefe(angelegt.length === 0, "ohne Liste wird nichts angelegt");
}

// --- 11. Kein Team-Werkzeug im Scope ist kein Fehler ----------------------
{
	const { ctx, definition } = umfeld(ROUTEN, { ohneWerkzeug: true });
	apply(ctx);
	pruefe(definition === undefined, "der Pruefstand hat wirklich kein Werkzeug gebaut");
}

// --- 12. Erscheint das Werkzeug spaeter, wird es erweitert ----------------
{
	const { ctx, definition, ereignisse, werkzeuge, agent } = umfeld(ROUTEN, { ohneWerkzeug: true });
	apply(ctx);
	const spaet = werkzeugDefinition(async () => ({ childId: "k", messageId: "m" }));
	let sichtbar = false;
	werkzeuge.get = (n, scope) => n === "spawn_teammate" && scope === agent && sichtbar ? spaet : undefined;
	sichtbar = true;
	for (const hoerer of ereignisse.get("tools/change") ?? []) hoerer({});
	const felder = Object.keys(spaet.parameters.properties);
	pruefe(felder.includes("provider") && felder.includes("model") && felder.includes("reasoning_effort"), `das spaet erschienene Werkzeug wurde erweitert, Felder: ${felder.join(", ")}`);
}

// --- 13. Zweimal anwenden stapelt nicht ----------------------------------
{
	const { ctx, definition, ereignisse } = umfeld(ROUTEN);
	apply(ctx);
	const ersteBeschreibung = definition.description;
	const ersteExecute = definition.execute;
	for (const hoerer of ereignisse.get("tools/change") ?? []) hoerer({});
	for (const hoerer of ereignisse.get("tools/change") ?? []) hoerer({});
	pruefe(definition.description === ersteBeschreibung, "die Beschreibung waechst bei weiteren Durchgaengen nicht");
	pruefe(definition.execute === ersteExecute, "die Ausfuehrung wird nicht erneut umhuellt");
}

// --- 14a. Ein Profil-Neuladen frischt die Beschreibung auf --------------
{
	const { ctx, definition, ereignisse } = umfeld(ROUTEN);
	let routen = ROUTEN;
	ctx.get = ((alt2) => (n) => n === "subagentModelSelection"
		? { current: () => ({ enabled: true, allowedModels: routen }) }
		: alt2(n))(ctx.get);
	apply(ctx);
	pruefe(definition.description.includes("gemma-4-31b"), "vor dem Neuladen steht die erste Liste drin");
	// Die Einstellung aendern und das Neuladen ausloesen, so wie es das
	// Einstellungs-Formular tut.
	routen = [{ provider: "anthropic", model: "claude-haiku-5-5" }];
	for (const hoerer of ereignisse.get("app-boot/config-reload") ?? []) hoerer();
	pruefe(definition.description.includes("claude-haiku-5-5"), `nach dem Neuladen steht die neue Liste drin, Beschreibung: ...${definition.description.slice(-160)}`);
	pruefe(!definition.description.includes("gemma-4-31b"), "die alte Liste ist verschwunden");
}

// --- 14. Eine geaenderte Liste erscheint in der Beschreibung -------------
{
	const { ctx, definition, ereignisse } = umfeld(ROUTEN);
	let routen = ROUTEN;
	ctx.get = ((alt) => (n) => n === "subagentModelSelection"
		? { current: () => ({ enabled: true, allowedModels: routen }) }
		: alt(n))(ctx.get);
	apply(ctx);
	pruefe(definition.description.includes("gemma-4-31b"), "die erste Liste steht in der Beschreibung");
	routen = [{ provider: "anthropic", model: "claude-haiku-5-5" }];
	for (const hoerer of ereignisse.get("tools/change") ?? []) hoerer({});
	pruefe(definition.description.includes("claude-haiku-5-5"), "die neue Liste steht nach der Auffrischung in der Beschreibung");
	pruefe(!definition.description.includes("gemma-4-31b"), "die alte Liste ist verschwunden, statt sich anzuhaeufen");
}

// --- 13. Ruecknahme stellt den Ursprungszustand her ------------------------
{
	const { ctx, definition, aufraeumer } = umfeld(ROUTEN);
	apply(ctx);
	const vorher = Object.keys(definition.parameters.properties).length;
	pruefe(vorher === 7, `vor der Ruecknahme sind die drei Felder da, waren ${vorher}`);
	for (const aufraeumen of aufraeumer) aufraeumen();
	const nachher = Object.keys(definition.parameters.properties);
	pruefe(nachher.length === 4, `nach der Ruecknahme sind es wieder vier Felder, waren ${nachher.length}`);
	pruefe(!nachher.includes("provider"), "das Feld provider ist wieder weg");
}

console.log(fehler === 0 ? "Pruefstand: alles in Ordnung." : `Pruefstand: ${fehler} Fehler.`);
process.exitCode = fehler === 0 ? 0 : 1;
