# AGENTS.md – Arbeitsanweisung für ioBroker.sax-power

Diese Datei gilt für das gesamte Repository. Jeder neue Chat beziehungsweise Agent liest sie vor der ersten Projektaktion vollständig und behandelt sie als verbindliche Arbeitsanweisung. Fachliche Details, Roadmap und aktuelle Übergabe stehen ergänzend in `ROADMAP.md`.

## Ziel der Zusammenarbeit

Der Anwender beschreibt Anforderungen, Beobachtungen und Testergebnisse fachlich. Die Entwicklungsarbeit findet anschließend direkt in diesem Repository statt: Quellcode analysieren, Änderungen implementieren, Tests ausführen, Dokumentation pflegen und ein überprüfbares Testpaket bauen.

Der Anwender soll keine Entwicklungs- oder Patchbefehle auf dem NAS ausführen müssen. Seine Konsole wird nur benötigt, wenn ein fertiges Paket im realen ioBroker-System installiert oder dort ein nicht anderweitig zugänglicher Zustand, Logeintrag oder Datenpunkt geprüft werden muss.

## Verbindlicher Arbeitsbeginn

Vor jeder Änderung:

1. `AGENTS.md` und die relevanten Abschnitte aus `ROADMAP.md` vollständig lesen.
2. Repositorypfad, Branch, HEAD-Commit und Arbeitsbaum prüfen.
3. Vorhandene uncommittete oder unbekannte Änderungen als Eigentum des Anwenders behandeln.
4. Keine fremde Änderung zurücksetzen, überschreiben, bereinigen oder inhaltlich umdeuten.
5. Den zuletzt real getesteten Paketstand, seine SHA-256-Prüfsumme und die aktuelle Übergabe aus der Roadmap abgleichen.
6. Relevanten Code, Tests und Dokumentation lesen, bevor gepatcht wird.

Falls Git-Zugriff, Repositoryzustand oder Herkunft vorhandener Änderungen nicht sicher feststellbar sind, wird nicht auf Verdacht gearbeitet. Der Blocker wird zuerst geklärt.

## Direkte Repositoryarbeit

- Änderungen selbstständig direkt in den Dateien dieses Repositories umsetzen.
- Für gezielte Dateiänderungen `apply_patch` verwenden.
- Bestehende Architektur und Konventionen bewahren; unnötige Refactorings vermeiden.
- Anforderungen in kleine, fachlich abgeschlossene Stufen zerlegen.
- Fehlerursachen anhand von Code, Tests, Logs, HAR-Dateien oder realen Objektwerten belegen.
- Nicht mehrfach blind nachpatchen. Ist die Ursache nach ein bis zwei Versuchen unklar, zuerst den tatsächlichen Code-, Import-, API- oder Laufzeitkontext sichern und untersuchen.
- Reale Beobachtungen aus dem Testsystem höher gewichten als unbelegte Annahmen.

## Schutz- und Freigabegrenzen

Ohne ausdrückliche Freigabe des Anwenders niemals:

- committen,
- pushen,
- mergen oder rebasen,
- Branches oder Tags anlegen beziehungsweise löschen,
- die Paketversion anheben,
- einen GitHub-, npm- oder ioBroker-Release veröffentlichen,
- die produktive beziehungsweise reale ioBroker-Instanz verändern,
- Zugangsdaten oder Secrets anzeigen, ersetzen oder in Dateien übernehmen.

Ein Auftrag wie „implementiere“, „behebe“ oder „baue ein Testpaket“ erlaubt Dateiänderungen, Prüfungen und den lokalen Paketbau, aber keine der oben genannten Veröffentlichungsaktionen.

## Umsetzung einer Änderung

Für jede Entwicklungsstufe gilt:

1. Nutzerproblem und erwartetes Verhalten konkret festhalten.
2. Datenquelle und Semantik unterscheiden: von SAX gemeldet, vom Adapter berechnet oder lediglich geschätzt.
3. Änderung möglichst klein implementieren.
4. Passende Regressionstests ergänzen oder aktualisieren.
5. Betroffene Dokumentation im selben Arbeitsschritt aktualisieren.
6. Vollständige Pflichtprüfungen ausführen.
7. Diff auf unbeabsichtigte Änderungen und sensible Daten prüfen.
8. Eindeutig benanntes Vorabpaket erzeugen und SHA-256 berechnen.
9. Konkreten Realtest mit erwarteten Ergebnissen formulieren.
10. Feedback, Screenshots, Logs und Objektwerte aus dem Realtest in der nächsten Stufe berücksichtigen.

## Pflichtprüfungen

Vor jedem Testpaket mindestens nachweislich ausführen:

- Backend-Tests,
- Backend-Lint,
- Backend-Typecheck,
- Admin-Typecheck,
- Backend-Build,
- Admin-Build,
- ioBroker-Paketprüfung,
- `git diff --check`.

Geänderte Fachlogik benötigt gezielte Regressionstests. Ein Sammelbefehl gilt nicht als vollständig erfolgreich, wenn eine relevante Einzelprüfung fehlt, übersprungen wurde oder nur wegen eines falschen Alias abbrach. Ergebnisse werden einzeln und wahrheitsgemäß berichtet.

## Dokumentationspflicht

Neue oder geänderte Funktionen sind erst fertig, wenn alle betroffenen Unterlagen angepasst sind. Je nach Änderung gehören dazu insbesondere:

- `README.md`,
- `docs/OBJECTS.md`,
- `docs/FIELD_REFERENCE.md`,
- `docs/STATISTICS.md`,
- `docs/BATTERY.md`,
- `CHANGELOG-1.2.0.md` beziehungsweise der aktuelle Changelog,
- `ROADMAP.md`.

Objektpfade, Einheiten, Rollen, Formeln, Datenquellen, Aggregationsregeln, Fallbacks, Grenzfälle und Migrationen dürfen nicht nur im Chat dokumentiert sein.

## Testpakete und Realtest

Vorabpakete eindeutig benennen, zum Beispiel:

```text
ioBroker.sax-power-<zielversion>-pretest-<stufe>-from-<baseline>.tgz
```

Zu jedem Paket angeben:

- Dateiname und lokaler Downloadlink,
- SHA-256-Prüfsumme,
- tatsächliche interne Paketversion,
- verwendete Baseline,
- bestandene Prüfungen,
- bekannte Einschränkungen,
- konkrete Installations- und Testschritte.

Die Installation im realen ioBroker-System führt grundsätzlich der Anwender aus. Dafür möglichst einen vollständigen, prüfenden Befehlsblock liefern. Nach dem Realtest gezielt nur die benötigten Screenshots, Logs oder Objektwerte anfordern.

Ein grüner Build ist kein Release. Zeitabhängige Funktionen werden über den fachlich notwendigen Zeitraum beobachtet. Werte werden nicht künstlich erzeugt oder freigegeben, nur um einen Termin einzuhalten.

## Admin-Oberfläche und Objektmodell

- Bedienung aus Anwendersicht und nach größeren UI-Änderungen anhand realer Screenshots prüfen.
- Geheimnisse müssen bei Änderungen anderer Einstellungen unverändert erhalten bleiben.
- Automatisch erkannte Speicher dürfen nicht versehentlich manuell dupliziert werden.
- Einzelgeräte und zusammengefasste Werte klar trennen:

```text
devices.<serial>.* = Werte des einzelnen physischen Speichers
summary.*          = Zusammenfassung aller erkannten Speicher
info.*             = Adapter- und Verbindungszustand
```

- Externe Datenquellen künftig unter `Integrationen` konfigurieren.
- Steuerungsregeln künftig getrennt unter `Ladesteuerung` konfigurieren.
- Messwertquelle, Datenalter, Entscheidung und Sperrgrund transparent anzeigen.
- Modbus pro Messwert bevorzugen und die SAX-Cloud nur als geeigneten, aktuellen Fallback nutzen; Details stehen in `ROADMAP.md`.

## Kommunikation während der Arbeit

- Mit dem Ergebnis beziehungsweise dem aktuellen Befund beginnen.
- Bei längeren Arbeiten kurze, konkrete Zwischenstände geben.
- Ursachen, Entscheidungen und Risiken nachvollziehbar benennen.
- Keine erfolgreich wirkende Abschlussmeldung senden, solange Prüfungen noch laufen oder fehlschlagen.
- Im Abschluss knapp aufführen: geänderte Dateien/Funktionen, Tests, Paket, Prüfsumme, offene Punkte und genau der nächste Realtest.

## Übergabe an zukünftige Chats

Nach jeder abgeschlossenen Stufe die `Aktuelle Übergabe` in `ROADMAP.md` aktualisieren. Sie enthält mindestens:

- Branch und Baseline-Commit,
- vorhandene uncommittete Änderungen,
- letztes Testpaket und SHA-256,
- tatsächliche interne Version,
- bestandene Prüfungen,
- Ergebnis des Realtests,
- bekannte Einschränkungen,
- genau einen nächsten fachlichen Schritt,
- ausdrücklich gesperrte Aktionen.

Ein zukünftiger Chat beginnt mit dieser Übergabe und dem realen Repositoryzustand. Er rekonstruiert den Stand nicht aus Erinnerung und wiederholt keine bereits erfolgreich abgeschlossene Phase.
