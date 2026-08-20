import React from "react";

import { I18n } from "@iobroker/gui-components";

const TRANSLATED_STRING_PROPS = new Set([
	"aria-label",
	"helperText",
	"label",
	"placeholder",
	"title",
]);

function translateDynamicText(text: string): string {
	let match = text.match(/^Average across (\d+) storage systems$/);
	if (match) return I18n.t("Average across %s storage systems", match[1]);

	match = text.match(/^R(\d+): (read|write|read\/write|missing)$/);
	if (match) return `R${match[1]}: ${I18n.t(match[2])}`;

	match = text.match(/^Not available: register ([\d, ]+) is missing or does not provide the required access\.$/);
	if (match) return I18n.t("Not available: register %s is missing or does not provide the required access.", match[1]);

	match = text.match(/^The SAX Power cloud denied access( \(HTTP \d+\))?\.$/);
	if (match) return I18n.t("The SAX Power cloud denied access%s.", match[1] ?? "");

	match = text.match(/^The SAX Power cloud reported a server error( \(HTTP \d+\))?\.$/);
	if (match) return I18n.t("The SAX Power cloud reported a server error%s.", match[1] ?? "");

	match = text.match(/^Storage system (\d+)$/);
	if (match) return I18n.t("Storage system %s", match[1]);

	match = text.match(/^Storage system (\d+): (.+)$/);
	if (match) return I18n.t("Storage system %s: %s", match[1], match[2]);

	match = text.match(/^([\d.,]+)% \(estimated\)$/);
	if (match) return I18n.t("%s% (estimated)", match[1]);

	match = text.match(/^Valid measurement runs: (\d+) of (\d+) · Rejected: (\d+)$/);
	if (match) return I18n.t("Valid measurement runs: %s of %s · Rejected: %s", match[1], match[2], match[3]);

	match = text.match(/^(\d+) of (\d+) valid · (\d+) rejected$/);
	if (match) return I18n.t("%s of %s valid · %s rejected", match[1], match[2], match[3]);

	return I18n.t(text);
}

export function translate(text: string, ...args: (string | number)[]): string {
	return I18n.t(text, ...args);
}

function translateText(text: string): string {
	const content = text.trim();
	if (!content) return text;

	const leadingWhitespace = text.slice(0, text.indexOf(content));
	const trailingWhitespace = text.slice(text.indexOf(content) + content.length);
	return `${leadingWhitespace}${translateDynamicText(content)}${trailingWhitespace}`;
}

function localizeNode(node: React.ReactNode): React.ReactNode {
	if (typeof node === "string") return translateText(node);
	if (Array.isArray(node)) return node.map(localizeNode);
	if (!React.isValidElement<Record<string, unknown>>(node)) return node;

	const translatedProps: Record<string, unknown> = {};
	for (const property of TRANSLATED_STRING_PROPS) {
		const value = node.props[property];
		if (typeof value === "string") translatedProps[property] = translateText(value);
	}

	if ("children" in node.props) {
		translatedProps.children = localizeNode(node.props.children as React.ReactNode);
	}

	return React.cloneElement(node, translatedProps);
}

export function LocalizedContent(props: { children: React.ReactNode }): React.JSX.Element {
	return <>{localizeNode(props.children)}</>;
}
