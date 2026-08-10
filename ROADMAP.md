# Roadmap – ioBroker.sax-power

Stand: 10. August 2026

## Projektziel

Der Adapter soll SAX Power Speicher transparent, stabil und nachvollziehbar in ioBroker integrieren. Cloud-Daten, berechnete Werte und Schätzungen müssen klar voneinander getrennt sein. Neue Funktionen werden in kleinen, überprüfbaren Stufen entwickelt und erst nach technischer Prüfung sowie kontrolliertem Realtest veröffentlicht.

## Aktueller Stand: Version 1.2.0

1.2.0 ist nach abgeschlossenem Realtest zur Veröffentlichung freigegeben. Implementiert sind:

- automatisch erkannte Speicher mit fester Modellzuordnung,
- bekannte nominale und nutzbare Kapazitäten,
- SAX-gemeldete sowie berechnete Vollzyklen,
- Periodenwerte je Gerät und für das Gesamtsystem,
- eindeutige Objekttrennung zwischen `devices` und `summary`,
- persistente Erfassung qualifizierter Gesundheits-Messläufe mit sichtbarem Fortschritt,
- überarbeitete Admin-Oberfläche,
- korrigierte Kennwortpersistenz,
- vollständige technische Dokumentation der Berechnungsgrundlagen.

### Unmittelbar nächster Schritt

Version 1.2.0 wird veröffentlicht. Anschließend gilt ein Entwicklungsfreeze. Bis zur Aufnahme in das offizielle ioBroker-Repository werden keine neuen Funktionen begonnen; zulässig sind ausschließlich zwingende Korrekturen, die sich aus GitHub Actions, Adapter Checker oder Repository-Aufnahmeprüfung ergeben.

### Wann wird die Batteriegesundheit angezeigt?

Eine erste belastbare Anzeige entsteht nach fünf validen Entladungen mit mindestens 40 SOC-Prozentpunkten. Die Zeit allein genügt nicht. Valide, benötigte und verworfene Läufe werden sichtbar gezählt; Ladephasen fließen wegen ihrer AC-Verluste nicht in die Kapazitätsschätzung ein.

Bis dahin bleibt der Status bewusst bei „Datenbasis wird aufgebaut“ beziehungsweise „Nicht genügend geeignete Messungen“. Es wird kein Prozentwert aus wenigen oder ungeeigneten Daten erzwungen. Nach Ablauf der 3–5 Tage werden Zahl und Qualität der erkannten Messläufe gemeinsam geprüft; daraus ergibt sich, ob bereits ein Gesundheitswert ausgegeben werden kann oder weitere Beobachtungszeit nötig ist.

Erst bei unauffälligem Ergebnis folgt:

1. abschließender Code- und Dokumentationsabgleich,
2. vollständige lokale Prüfung,
3. Anhebung der internen Version auf 1.2.0,
4. finales Release-Paket,
5. kontrollierte Veröffentlichung.

## Geplante Funktionen

Die folgenden Funktionen gehören ausdrücklich nicht zu 1.2.0. Der aktuelle Release bleibt während des Realtests unverändert.

### Integrationen und Datenquellen

Für die spätere intelligente Be- und Entladung werden vorhandene ioBroker-Instanzen eingebunden. Anwender sollen keine Registerlisten oder möglichst auch keine einzelnen Objektpfade manuell pflegen müssen.

Geplante Integrationen:

- ioBroker-Modbus-Instanz für zeitnahe SAX-Mess- und Steuerwerte,
- `pvforecast` für Erzeugungsprognosen,
- kompatibler Adapter für dynamische beziehungsweise börsenbasierte Strompreise.

Der normale Ablauf lautet:

1. Integration aktivieren.
2. Eine automatisch erkannte kompatible Instanz auswählen.
3. Der SAX-Power-Adapter prüft erwartete Objekte beziehungsweise Register und deren Plausibilität.
4. Verbindungsstatus, Datenalter und verfügbare Werte werden sichtbar angezeigt.

Für SAX-Modbus wird von einer einheitlichen Registerbelegung ausgegangen. Trotzdem ist nach der Instanzauswahl eine automatische Validierung Pflicht, damit eine falsche Unit-ID, fehlende Register, veraltete Werte oder eine ungeeignete Konfiguration erkannt werden.

#### Modbus-/Cloud-Strategie

Modbus ist für zeitkritische Werte die bevorzugte Quelle. Die bestehende SAX-Cloud-API bleibt als Fallback und für historische Werte erhalten. Die Auswahl erfolgt pro Messwert, nicht pauschal für den gesamten Adapter:

```text
Modbus aktiv, Wert vorhanden, plausibel und aktuell?
├── Ja: Modbus verwenden
└── Nein: SAX-Cloud-Wert verwenden, sofern geeignet und aktuell genug
```

Dabei gelten folgende Regeln:

- Quelle und Zeitstempel werden je relevantem Messwert transparent ausgewiesen.
- Modbus und Cloud dürfen nicht zu widersprüchlichen Doppelwerten führen.
- Historische Cloud-Werte können parallel zu Modbus-Livewerten genutzt werden.
- Fällt Modbus aus, wird nur dort auf die Cloud zurückgegriffen, wo deren Aktualität und Semantik für den Zweck ausreichen.
- Fehlt für eine Steuerungsentscheidung ein sicherer Ersatzwert, pausiert die Ladesteuerung mit verständlichem Sperrgrund.
- Ein Fallback darf niemals unbemerkt mit veralteten Werten weiterregeln.

Für die Batteriegesundheit bedeutet dies langfristig:

- mit Modbus: zeitgenauere Lade-/Entladeverläufe und feinere Auswertung,
- ohne Modbus: weiterhin Auswertung der vorhandenen Cloud-Historie,
- bei gemischter Datenbasis: Quelle und Qualität jedes Auswertungslaufs dokumentieren,
- geschätzte Gesundheit weiterhin niemals als vom Speicher gemeldeter SoH darstellen.

### Zukünftige Admin-Navigation

Die Oberfläche wird fachlich gegliedert, damit der allgemeine Einstellungsbereich nicht überladen wird:

```text
Anmeldung
Einstellungen
Integrationen
Ladesteuerung
Status & Statistik
Support & Info
```

- `Anmeldung`: ausschließlich SAX-Cloud-Zugang und Anmeldestatus.
- `Einstellungen`: Abfrageintervall, erkannte Speicher, Batteriemodell und allgemeines Adapterverhalten.
- `Integrationen`: Auswahl und Prüfung von Modbus, PV-Prognose und Strompreisquelle.
- `Ladesteuerung`: Aktivierung, Regeln, Grenzwerte und Zeiträume der intelligenten Be- und Entladung.
- `Status & Statistik`: Livewerte, Gesundheit, Vollzyklen, aktuelle Steuerungsentscheidung, Begründung, Datenquellen und Zeitstempel.
- `Support & Info`: Projekt-, Hilfe-, Diagnose- und Versionsinformationen.

Die Trennung ist verbindlich:

- `Integrationen` beantwortet: Woher kommen Messwerte, Prognosen und Preise?
- `Ladesteuerung` beantwortet: Was soll der SAX-Speicher damit tun?
- `Status & Statistik` beantwortet: Was passiert gerade, auf welcher Datenbasis und weshalb?

### Intelligente Ladealgorithmen

Langfristiges Ziel ist ein generisches Energiemanagement ausschließlich für den SAX Speicher. Andere Hardware darf die Funktion nutzen oder darauf reagieren, wird aber nicht durch den Adapter gesteuert.

Geplante Bausteine:

- akkuschonendes Laden,
- netzdienliches Laden,
- Berücksichtigung von PV-Prognosen,
- Berücksichtigung dynamischer beziehungsweise negativer Strompreise,
- konfigurierbare maximale Lade- und Entladeleistungen,
- konfigurierbare SOC-Grenzen,
- `DischargingDay`: Tagesentladung nur, wenn die PV-Prognose ein Wiederaufladen bis zum Abend plausibel zulässt,
- `DischargingNight`: optionale Nachtentladung ohne die Tagesbedingung „bis abends wieder voll“, beispielsweise bei wirtschaftlich sinnvollen Preisfenstern.

Alle Entscheidungen müssen als Zustände nachvollziehbar sein: Eingangsgrößen, Freigabe, Sperrgrund, Zielwert und tatsächlich angeforderte Leistung dürfen nicht in einer Blackbox verschwinden.

Die Konfiguration der Ladesteuerung erhält einen eigenen Menübereich. Einzelne Funktionen werden dort als getrennte Unterbereiche oder aufklappbare Karten dargestellt. Je Funktion werden nur die passenden Optionen angeboten, insbesondere Aktivierung, Leistungsgrenzen, SOC-Grenzen, Prognosebedingungen, Preisbedingungen und Zeiträume.

Der Status muss zu jeder Entscheidung mindestens ausweisen:

- aktiven Betriebsmodus,
- verwendete Eingangsgrößen samt Quelle und Alter,
- aktuelle Freigabe oder Sperre,
- verständliche Begründung,
- berechneten Zielwert,
- tatsächlich angeforderte Leistung.

### Benutzerdefinierte Zeiträume

- freie historische Start- und Endzeit,
- nachvollziehbare Statistikberechnung für den gewählten Zeitraum,
- identische Logik für Einzelgeräte und Gesamtsystem,
- klare Kennzeichnung von vollständigen, unvollständigen oder nicht verfügbaren Daten.

## Verbindliche Arbeitsweise

Dieser Abschnitt ist die Arbeitsanweisung für jeden zukünftigen Chat, der an diesem Projekt weiterarbeitet.

### 1. Bestehenden Stand zuerst sichern und verstehen

Vor jeder Änderung:

1. Repository, Branch, Commit und Arbeitsbaum prüfen.
2. Vorhandene uncommittete Änderungen als bestehenden Projektstand behandeln und nicht überschreiben.
3. Relevante Implementierung, Tests und Dokumentation vollständig lesen.
4. Den zuletzt real getesteten Paketstand und die dazugehörige SHA-256-Prüfsumme festhalten.
5. Reale Beobachtungen des Anwenders höher gewichten als Vermutungen aus dem Code.

Kein Patchen auf Verdacht. Wenn Datenquelle, API-Verhalten oder Ursache unklar sind, wird zuerst mit HAR, Logs, Objektzuständen oder einem kleinen reproduzierbaren Test geklärt.

### 2. Anforderungen fachlich festlegen

Vor der Implementierung wird eindeutig definiert:

- welches Nutzerproblem gelöst wird,
- welche Werte direkt von SAX stammen,
- welche Werte der Adapter berechnet,
- welche Werte lediglich geschätzt werden,
- welche Datenbasis und Einheiten verwendet werden,
- wie Einzelgeräte und Gesamtsystem behandelt werden,
- wie fehlende oder unzureichende Daten sichtbar dargestellt werden.

Eine Schätzung darf nie wie ein echter Messwert aussehen. Unsichere Werte bleiben lieber „nicht verfügbar“, bis die Grundlage belastbar ist.

### 3. Kleine, abgeschlossene Änderungspakete

Änderungen werden in kleinen fachlichen Stufen umgesetzt. Pro Stufe gilt:

1. eine klar begrenzte Funktion oder Fehlerkorrektur,
2. passende Tests,
3. Dokumentationsanpassung,
4. vollständiger Build,
5. eindeutig benanntes Vorabpaket,
6. kontrollierter Realtest,
7. erst danach die nächste Stufe.

Große Funktionsblöcke werden nicht gleichzeitig mit unnötigen Refactorings vermischt.

### 4. Objektmodell verbindlich trennen

Die Semantik bleibt dauerhaft:

```text
devices.<serial>.* = Werte genau dieses physischen Speichers
summary.*          = Zusammenfassung aller erkannten Speicher
info.*             = Adapter- und Verbindungszustand
```

Neue Objekte benötigen:

- stabilen Pfad,
- korrekten ioBroker-Typ und Rolle,
- Einheit,
- lesbaren Namen,
- dokumentierte Datenquelle,
- dokumentierte Aggregationsregel,
- definiertes Verhalten bei fehlenden Daten.

Objektpfade werden nicht still geändert. Bei notwendigen Änderungen ist eine Migration beziehungsweise gezielte Bereinigung veralteter Objekte vorzusehen.

### 5. Berechnungen transparent entwickeln

Jede Berechnung muss:

- zentral implementiert sein,
- mit festen Beispielen automatisiert getestet werden,
- Einheiten und Rundung eindeutig definieren,
- Mehrspeicherfälle korrekt behandeln,
- in README oder einer passenden Datei unter `docs/` dokumentiert sein,
- in der Oberfläche als gemessen, gemeldet, berechnet oder geschätzt erkennbar sein.

Formeln, Modellkapazitäten, Mindestdatenbasis und bekannte Grenzen gehören ins Repository und dürfen nicht nur im Chat stehen.

### 6. Admin-Oberfläche aus Anwendersicht prüfen

Die Oberfläche folgt dem tatsächlichen Bedienablauf:

- Anmeldung und allgemeine Einstellungen sind getrennt.
- Automatisch erkannte Geräte können nicht frei erfunden oder dupliziert werden.
- Technische IDs werden nur dort gezeigt, wo sie die Zuordnung nachvollziehbar machen.
- Einzelgeräte und Gesamtwerte sind visuell eindeutig getrennt.
- Lade- und Fehlerzustände sind sichtbar.
- Bestehende Geheimnisse bleiben bei Änderungen anderer Felder unverändert.
- Allgemeine Einstellungen, externe Integrationen und Ladesteuerung bleiben getrennte Navigationsbereiche.
- Kompatible ioBroker-Instanzen werden automatisch erkannt und ausgewählt; manuelle Objekt- oder Registerzuordnungen sind nur als begründeter Sonderfall zulässig.
- Datenquelle und Aktualität steuerungsrelevanter Werte sind sichtbar.
- Jede automatische Steuerungsentscheidung besitzt eine verständliche Begründung und einen sichtbaren Sperrgrund.

Jede größere UI-Änderung wird anhand eines realen Screenshots geprüft, nicht nur anhand des Quellcodes.

### 7. Pflichtprüfungen vor jedem Testpaket

Mindestens ausführen:

```text
Backend-Tests
Backend-Lint
Backend-Typecheck
Admin-Typecheck
Backend-Build
Admin-Build
ioBroker-Paketprüfung
git diff --check
```

Zusätzlich sind für geänderte Fachlogik gezielte Regressionstests erforderlich. Ein Sammelbefehl gilt nur dann als erfolgreich, wenn jede einzelne relevante Prüfung nachweislich erfolgreich war.

### 8. Vorabpakete reproduzierbar bereitstellen

Jedes Testpaket erhält einen eindeutigen Namen mit Funktionsstand und Baseline, beispielsweise:

```text
ioBroker.sax-power-1.2.0-pretest-<stufe>-from-<commit>.tgz
```

Zu jedem Paket gehören:

- absolute Ablageangabe,
- SHA-256-Prüfsumme,
- Hinweis auf die interne Paketversion,
- Installationsblock mit Prüfsummenprüfung,
- konkrete Testschritte,
- erwartete Ergebnisse,
- anzufordernde Screenshots, Logs oder Objektwerte.

Die Installation erfolgt kontrolliert in der bestehenden Testinstanz. Vor risikoreichen Änderungen wird ein wiederherstellbares Backup erstellt.

### 9. Realtest als eigener Release-Gate

Ein grüner Build ist kein Release. Nach der Installation wird geprüft:

- Start und Authentifizierung,
- Verhalten nach Speichern und Neustart,
- Cloud-Abfrage und Abfrageintervall,
- erkannte Geräte,
- Objektanlage und Objektmigration,
- Einzel- und Gesamtwerte,
- Plausibilität der Berechnungen,
- Darstellung in der Admin-Oberfläche,
- Logs über einen angemessenen Zeitraum.

Für zeitabhängige Funktionen wie Batteriegesundheit wird die notwendige Beobachtungsdauer abgewartet. Es wird nicht künstlich ein Wert erzwungen, nur um einen Release-Termin einzuhalten.

### 10. Release erst nach ausdrücklicher Freigabe

Vor dem Release:

1. Ergebnisse des Realtests zusammenfassen.
2. Offene Punkte und bekannte Einschränkungen nennen.
3. Changelog und Roadmap mit dem tatsächlichen Stand abgleichen.
4. Version erst jetzt anheben.
5. vollständige Prüfungen erneut ausführen.
6. finales Paket und Prüfsumme erzeugen.
7. Veröffentlichung erst nach gemeinsamer ausdrücklicher Freigabe.

### 11. Dokumentation ist Teil der Funktion

Jede relevante Änderung aktualisiert im selben Arbeitsschritt mindestens die betroffenen Dateien:

- `README.md`
- `docs/OBJECTS.md`
- `docs/FIELD_REFERENCE.md`
- `docs/STATISTICS.md`
- `docs/BATTERY.md`
- weitere thematisch passende Dokumente
- Changelog und Roadmap

Neue Objekte, Formeln, Datenquellen, Grenzfälle und Migrationsverhalten gelten erst als fertig, wenn sie dokumentiert sind.

### 12. Übergabe an einen zukünftigen Chat

Am Ende jeder Arbeitsstufe wird eine kompakte Übergabe festgehalten:

- aktueller Branch und Baseline-Commit,
- uncommittete Änderungen,
- zuletzt gebautes Paket und SHA-256,
- Installationsort,
- bereits bestandene automatisierte Prüfungen,
- Ergebnis des Realtests,
- bekannte Fehler und Einschränkungen,
- genau ein nächster fachlicher Schritt,
- Dinge, die ausdrücklich noch nicht verändert werden dürfen.

Ein zukünftiger Chat beginnt mit dieser Übergabe und dem realen Repositoryzustand. Er baut nicht aus dem Gedächtnis neu und wiederholt keine bereits erfolgreich abgeschlossene Phase.

## Release-Gates in Kurzform

| Gate | Voraussetzung |
|---|---|
| Fachlich | Datenquelle, Semantik, Formel und Grenzen definiert |
| Implementierung | Kleine abgeschlossene Änderung mit Regressionstests |
| Dokumentation | Objekte, Formeln und Verhalten vollständig beschrieben |
| Technisch | Tests, Lint, Typechecks, Builds und Paketprüfung grün |
| Installation | Paket per SHA-256 verifiziert und kontrolliert installiert |
| Realbetrieb | Erwartete Werte, UI, Migration, Neustart und Logs geprüft |
| Release | Changelog final, Version angehoben und ausdrücklich freigegeben |

## Prüfung zur Aufnahme in das offizielle ioBroker-Repository

Am 10. August 2026 wurde der Stand gegen die aktuellen Anforderungen von `ioBroker/ioBroker.repositories` geprüft.

Erfüllt beziehungsweise für den finalen Release vorbereitet sind:

- korrekter Repository- und npm-Paketname,
- GitHub-Themen und MIT-Lizenz,
- englisches README mit Herstellerlink und Changelog,
- kurzer `common.title` sowie mehrsprachiges `titleLang`,
- Adaptertyp `energy` und Verbindungstyp `cloud`,
- Autor-/Maintainerangaben,
- unterstützte Admin-Oberfläche,
- GitHub-Actions für Check/Lint und Adaptertests unter Node.js 22/24,
- gültige Objektrollen laut lokaler Paketprüfung,
- `encryptedNative` und `protectedNative` für das Cloud-Kennwort,
- npm-Veröffentlichung vorhanden; `bluefox` ist als ioBroker-Maintainer eingetragen.

Noch zwingend vor dem Aufnahme-PR:

1. exakten finalen Release-Commit im bestehenden ioBroker-System testen,
2. interne Version auf 1.2.0 anheben und alle Prüfungen erneut ausführen,
3. Commit und Push erst nach ausdrücklicher Freigabe,
4. grünen GitHub-Workflow abwarten,
5. 1.2.0 auf npm veröffentlichen,
6. Adapter Checker ohne Fehler/Warnungen ausführen,
7. Aufnahme-PR für `ioBroker/ioBroker.repositories` inklusive Link zum Tester-Forenthread erstellen.

Im Adapter-Repository sind Bot-/Dependabot-PRs `#2` bis `#18` offen. Sie werden nicht gesammelt vor 1.2.0 gemergt. Große beziehungsweise aktuell rote Abhängigkeitssprünge bleiben aus dem Release heraus. PR `#10` ist durch den bereits verwendeten `testing-action-check@v2` inhaltlich überholt; weitere ältere Bot-PRs werden nach 1.2.0 einzeln auf Übernahme oder Schließung geprüft.

## Aktuelle Übergabe

- Branch: `feature/1.2.0`
- Baseline-Commit: `a418d20`
- Aktuelles Testpaket: `ioBroker.sax-power-1.2.0-pretest-release-readiness-from-a418d20.tgz`
- SHA-256: `9047e88271bc5a83be201b30530a5f60a0ed70a513f56d4a1147477960e3702c`
- Vorheriger Health-Test: `ioBroker.sax-power-1.2.0-pretest-healthtracking-from-a418d20.tgz`, SHA-256 `210efa7ae6ce33e6e749a171fe985b6e050853e6dac2682736990249df3dd5f1`
- Vorheriger Realtest: `ioBroker.sax-power-1.2.0-pretest-summary-from-a418d20.tgz`, SHA-256 `053a085c6c9b17dd81adb4572426964bfb789decf178cb7f9ed9b7ca2d099c98`
- Release-Version: `1.2.0`
- Automatisierte Prüfungen: grün
- Passwortpersistenz: im Realtest bestätigt
- Zyklenwerte: im Realtest plausibel
- Health-Tracking: Status, Messlaufzähler und aktiver Ladeverlauf im Realbetrieb bestätigt
- Realtest: Footer entfernt; Kennwortschutz, Health-Fortschritt, Objektstruktur und Neustartpersistenz bestätigt
- Freigabe: Version 1.2.0 darf committed, gepusht und veröffentlicht werden
- Nächster Schritt: Veröffentlichung verifizieren und den Adapter ohne Funktionsentwicklung für die offiziellen ioBroker-Tests vorbereiten
- Entwicklungsfreeze: keine neuen Funktionen bis zur Aufnahme ins offizielle ioBroker-Repository
