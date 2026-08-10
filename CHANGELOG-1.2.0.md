# Changelog – ioBroker.sax-power 1.2.0

Status: **Zur Veröffentlichung freigegeben**
Branch: `feature/1.2.0`
Release-Version: `1.2.0`

## Release-Entscheidung

Der kontrollierte Realtest ist abgeschlossen. Kennwortpersistenz, Zyklenwerte, Health-Tracking, Objektstruktur und Administration wurden bestätigt. Version 1.2.0 ist zur Veröffentlichung freigegeben. Nach dem Release gilt ein Entwicklungsfreeze; bis zur offiziellen ioBroker-Aufnahme werden ausschließlich zwingende Korrekturen aus den ioBroker-Prüfungen umgesetzt.

## Neu

- Batteriemodell-Zuordnung für automatisch erkannte Speicher.
- Unterstützte Modelle:
  - SAX Power Home 5,8 kWh: 5,76 kWh nominal / 5,20 kWh nutzbar
  - SAX Power Home Plus 7,7 kWh: 7,68 kWh nominal / 7,00 kWh nutzbar
- Übernahme des von SAX gemeldeten Gesamtzykluszählers aus `data_cycle`.
- Transparente Berechnung äquivalenter Vollzyklen je Speicher für:
  - heute
  - Woche
  - Monat
  - Jahr
  - Gesamtzeitraum
- Kapazitätsgerechte Zusammenfassung der Vollzyklen über mehrere Speicher.
- Persistente AC-seitige Schätzung der Batteriegesundheit aus qualifizierten Entladeläufen.
- Sichtbare Zähler für valide, benötigte und verworfene Messläufe sowie Live-Fortschritt des aktiven Laufs.
- Explizite Gesundheitszustände, solange noch keine belastbare Bewertung möglich ist.
- Eigene Batteriedokumentation unter `docs/BATTERY.md` mit Datenquellen, Formeln, Kapazitäten, Grenzen und Objektdefinitionen.
- Neue systemweite Objektgruppe `summary`.

## Geändert

- Die Admin-Oberfläche ist jetzt in vier klare Bereiche gegliedert:
  - Anmeldung
  - Einstellungen
  - Status & Statistik
  - Support & Info
- Speicher können nicht mehr manuell hinzugefügt werden.
- Für jeden durch die Cloud erkannten Speicher wird genau eine feste Modellzuordnung angeboten.
- Die Seriennummer bleibt die stabile technische Zuordnung und wird in Überschriften lesbar angezeigt, beispielsweise `Speicher 1: 1012401057`.
- Batteriezustand und Vollzyklen stehen im Status vor den technischen Angaben zur Cloud- und Statistikverbindung.
- Der Aktualisierungspfeil rotiert während einer laufenden Statusaktualisierung.
- Redundanter Seitentitel und manuell gepflegte Versionsangabe im Footer wurden entfernt.
- Unter „Geplante Features“ werden nur noch aufgeführt:
  - Intelligente Ladealgorithmen
  - Benutzerdefinierte Zeiträume
- Systemweite Werte liegen nun eindeutig unter:

  ```text
  summary.battery
  summary.statistics
  ```

- Werte physischer Einzelgeräte bleiben unter:

  ```text
  devices.<serial>.battery
  devices.<serial>.statistics
  ```

- README, Objekt-, Feld-, Statistik- und Batteriedokumentation wurden an die neue Struktur angepasst.

## Behoben

- Das Kennwort wird beim Speichern anderer Einstellungen nicht mehr verändert oder ungültig gespeichert.
- Eine doppelte Verarbeitung der ioBroker-Kennwortverschlüsselung in der Admin-Oberfläche wurde entfernt.
- Die Konfiguration verwendet `encryptedNative` für die Verschlüsselung und `protectedNative` zum Schutz vor gewöhnlichen Konfigurationsabfragen.
- Der Anmeldefehler nach Änderungen beispielsweise am Abfrageintervall oder Batteriemodell ist behoben.
- Frei anlegbare Batterieeinträge und editierbare Seriennummern wurden entfernt.
- Die verwirrende Vermischung von Einzelgeräte- und Gesamtwerten wurde beseitigt.
- Alte Root-Ordner `battery` und `statistics` werden beim Adapterstart automatisch entfernt.

## Berechnungsgrundlage

Äquivalente Vollzyklen eines Speichers:

```text
EFC = (geladene Energie + entladene Energie) / (2 × nominale Kapazität)
```

Bei mehreren Speichern werden Zyklen nicht addiert. Die Zusammenfassung wird aus dem gesamten Energiedurchsatz und der gesamten installierten Nennkapazität berechnet:

```text
EFC_System = Summe(Energiedurchsatz) / (2 × Summe(nominale Kapazität))
```

Der SAX-Zähler und die berechneten Werte bleiben getrennt:

- `reported`: direkt von SAX gemeldeter Zähler
- berechnete Periodenwerte: aus Cloud-History und nominaler Kapazität ermittelt

## Batteriegesundheit

Die SAX Cloud liefert keinen dokumentierten SoH-Wert. 1.2.0 erfasst deshalb AC-seitig qualifizierte Entladeläufe persistent. Admin und Objekte zeigen valide, benötigte und verworfene Läufe sowie den aktuellen SOC- und Energieverlauf. Erst nach fünf Entladungen über mindestens 40 SOC-Prozentpunkte wird der Median als ausdrücklich geschätzter Gesundheitswert angezeigt.

Die während eines Entladelaufs beobachtete Energie wird aus Batterieleistung und Zeit integriert. Sie wird mit der für dieselbe SOC-Spanne erwarteten nutzbaren Modellkapazität verglichen:

```text
Gesundheit = entladene Energie
             / (nutzbare Modellkapazität × SOC-Spanne / 100)
             × 100 %
```

Ein Lauf wird unter anderem bei Datenlücken über 15 Minuten, Richtungswechseln, unplausiblen SOC-Sprüngen oder einem Ergebnis außerhalb 50–120 % verworfen. Ladephasen sind im Live-Fortschritt sichtbar, werden wegen der Ladeverluste aber nicht zur Kapazitätsschätzung verwendet. Der veröffentlichte Wert ist der Median der letzten fünf validen Schätzungen, auf eine Dezimalstelle gerundet und auf maximal 110 % begrenzt. Der vollständige Fortschritt bleibt über Adapterneustarts erhalten.

Die Freigabekriterien und Berechnungsgrenzen sind in `docs/BATTERY.md` dokumentiert und werden vor Veröffentlichung anhand realer Messdaten validiert.

## Qualitätssicherung des aktuellen Vorabstands

- 23 TypeScript-Tests erfolgreich
- 56 Paketprüfungen erfolgreich
- Backend-Lint erfolgreich
- Backend-Typecheck erfolgreich
- Admin-Typecheck erfolgreich
- Backend-Build erfolgreich
- Vite-Admin-Build erfolgreich
- `git diff --check` ohne Fehler
- Passwortpersistenz im Realtest bestätigt
- Zyklenwerte im Realtest als plausibel bestätigt
- Health-Tracking-Status, Messlaufzähler und aktiver Ladeverlauf im Realtest bestätigt
- Statischer Footer samt manuell gepflegter Versionsangabe aus Quellcode und Admin-Bundle entfernt

## Nach dem Release

- GitHub-Workflows und npm-Veröffentlichung verifizieren.
- Offiziellen ioBroker Adapter Checker ausführen.
- Ausschließlich erforderliche Korrekturen aus den ioBroker-Prüfungen vornehmen.
- Aufnahme-PR für `ioBroker/ioBroker.repositories` vorbereiten und einreichen.
