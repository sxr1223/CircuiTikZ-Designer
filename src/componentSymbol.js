/**
 * @module componentSymbol
 */

import { getNamedTag, getNamedTags } from "./xmlHelper";
import * as SVG from "@svgdotjs/svg.js/dist/svg.esm";
import componentInstance from "./componentInstance";

const METADATA_NAMESPACE_URI = "urn:uuid:c93d8327-175d-40b7-bdf7-03205e4f8fc3";

/**
 * @typedef {object} TikZAnchor
 * @property {string} [name] - the anchor name; e.g. G for the gate of a transistor
 * @property {SVGLength} x - anchor x coordinate relative to the symbol mid/anchor; tikz-ish
 * @property {SVGLength} y - anchor y coordinate relative to the symbol mid; positive y is upward (!); tikz-ish
 * @property {SVG.Point} point - the point relative to the symbol = svg-ish
 * @property {boolean} isDefault - true, if the anchor is the default one for placing the node
 */

/**
 * @typedef {object} SymbolBaseInformation
 * @property {?SVGMetadataElement} svgMetadataElement -
 * @property {?Element} componentInformation -
 * @property {boolean} isNode - `true`, if type=="node"
 * @property {boolean} isPath - `true`, if type=="path"
 * @property {?string} displayName - the name to show in the UI
 * @property {?string} tikzName - the tikz name used to draw, if found
 * @property {?string} shapeName - the shape name for path-style components, if found
 * @property {?string} groupName - the group the component belongs to, if set
 * @property {SVG.Point} mid - the point of the SVG Symbol, which corresponds to TikZs (0|0); anchors and pins are relative to this point
 * @property {?SVG.Box} viewBox - the viewBox/boundingBox, if set
 */

export default class ComponentSymbol extends SVG.Symbol {
	/** @type {SVGMetadataElement|null} */
	svgMetadataElement;

	/** @type {string} */
	displayName;
	/** @type {string} */
	tikzName;
	/** @type {?string} */
	groupName;

	/** @type {SVG.Point} */
	mid;
	/** @type {?SVG.Box} */
	viewBox;

	/** @type {TikZAnchor[]} */
	_pins = [];
	/** @type {TikZAnchor[]} */
	_additionalAnchors = [];
	/** @type {?TikZAnchor} */
	_textAnchor = null;
	/** @type {?TikZAnchor} */
	_defaultAnchor = null;

	/**
	 *
	 * @param {SVGSymbolElement} symbolElement
	 * @param {SymbolBaseInformation} [baseInformation]
	 * @throws {Error} if the XML structure lacks the required metadata
	 */
	constructor(symbolElement, baseInformation) {
		super(symbolElement);
		// this.node.instance = this; // Overwrite node circular reference of SVG.Symbol

		// parse information in componentInformation attributes, if not done already
		if (!baseInformation) baseInformation = ComponentSymbol.getBaseInformation(symbolElement);
		if (!baseInformation.svgMetadataElement || !baseInformation.displayName || !baseInformation.tikzName)
			throw new Error("Missing metadata for creating the component");

		this.svgMetadataElement = baseInformation.svgMetadataElement;
		this.displayName = baseInformation.displayName;
		this.tikzName = baseInformation.tikzName;
		this.groupName = baseInformation.groupName;
		this.mid = baseInformation.mid;
		this.viewBox = baseInformation.viewBox;

		// parse pins & anchors
		let pins =
			baseInformation.componentInformation &&
			getNamedTag(baseInformation.componentInformation, "pins", METADATA_NAMESPACE_URI);
		let pinArray = pins ? getNamedTags(pins, "pin", METADATA_NAMESPACE_URI) : [];
		this._pins = pinArray.map(this.#parseAnchor, this);

		let additionalAnchors =
			baseInformation.componentInformation &&
			getNamedTag(baseInformation.componentInformation, "additionalAnchors", METADATA_NAMESPACE_URI);
		let additionalAnchorArray = additionalAnchors
			? getNamedTags(additionalAnchors, "anchor", METADATA_NAMESPACE_URI)
			: [];
		this._additionalAnchors = additionalAnchorArray.map(this.#parseAnchor, this);

		let textPosition =
			baseInformation.componentInformation &&
			getNamedTag(baseInformation.componentInformation, "textPosition", METADATA_NAMESPACE_URI);
		this._textAnchor = textPosition ? this.#parseAnchor(textPosition, this) : null;
	}

	/**
	 *
	 * @param {SVGSymbolElement} symbolElement
	 * @returns {SymbolBaseInformation}
	 */
	static getBaseInformation(symbolElement) {
		/** @type {?SVGMetadataElement} */
		const svgMetadataElement =
			Array.prototype.find.call(symbolElement.children, (e) => e instanceof SVGMetadataElement) ?? null;

		// parse symbol
		const componentInformation =
			svgMetadataElement && getNamedTag(svgMetadataElement, "componentinformation", METADATA_NAMESPACE_URI);

		// parse information in componentInformation attributes
		const isNode = componentInformation?.getAttribute("type") === "node";
		const isPath = componentInformation?.getAttribute("type") === "path";

		const tikzName = componentInformation?.getAttribute("tikzName") ?? null;
		const displayName = componentInformation?.getAttribute("displayName") ?? tikzName;
		const shapeName = componentInformation?.getAttribute("shapeName") ?? null;
		const groupName = componentInformation?.getAttribute("groupName") ?? null;

		/** @type {SVG.Point} */
		const mid = new SVG.Point(
			SVG.Number.ensureInPx(componentInformation?.getAttribute("refX") || 0),
			SVG.Number.ensureInPx(componentInformation?.getAttribute("refY") || 0)
		);

		/** @type {?SVG.Box} */
		let viewBox;
		if (componentInformation?.hasAttribute("viewBox"))
			viewBox = new SVG.Box(componentInformation.getAttribute("viewBox"));
		else if (symbolElement.hasAttribute("viewBox")) viewBox = new SVG.Box(symbolElement.getAttribute("viewBox"));
		else viewBox = null;

		return {
			svgMetadataElement: svgMetadataElement,
			componentInformation: componentInformation,
			isNode: isNode,
			isPath: isPath,
			displayName: displayName,
			tikzName: tikzName,
			shapeName: shapeName,
			groupName: groupName,
			mid: mid,
			viewBox: viewBox,
		};
	}

	/**
	 * Parses an anchor (pin, anchor and textPosition). If `isDefault` is set, `this.defaultAnchor` will be set.
	 *
	 * @private
	 *
	 * @param {Element} anchorElement - the element to parse
	 * @returns {TikZAnchor} the parsed anchor
	 */
	#parseAnchor(anchorElement) {
		const numberRegEx = /^(\d*\.)?\d+$/; // "1", ".1", "1.1"; but not "1."
		/** @type {TikZAnchor} */
		let anchor = {
			name: anchorElement.getAttribute("anchorName") || anchorElement.getAttribute("anchorname") || undefined,
			x: anchorElement.getAttribute("x") ?? 0,
			y: anchorElement.getAttribute("y") ?? 0,
			isDefault: anchorElement.getAttribute("isDefault") || anchorElement.getAttribute("isdefault") || false,
		};
		if (typeof anchor.x === "string" && numberRegEx.test(anchor.x)) anchor.x = Number.parseFloat(anchor.x);
		if (typeof anchor.y === "string" && numberRegEx.test(anchor.y)) anchor.y = Number.parseFloat(anchor.y);
		if (typeof anchor.isDefault !== "boolean") anchor.isDefault = anchor.isDefault === "true";

		anchor.point = new SVG.Point(
			this.mid.x + SVG.Number.ensureInPx(anchor.x),
			this.mid.y - SVG.Number.ensureInPx(anchor.y) // tikz y direction != svg y direction
		);

		if (anchor.isDefault) this._defaultAnchor = anchor;

		return anchor;
	}

	/**
	 * Gets all anchors, which make sense for snapping to the grid.
	 * Does not return the `textAnchor`.
	 *
	 * @returns {TikZAnchor[]} all anchors for snapping to the grid
	 */
	get snappingAnchors() {
		return [...this._pins, ...this._additionalAnchors];
	}

	/**
	 * Gets all anchors points, which make sense for snapping to the grid.
	 * Points are relative to the symbol position.
	 * Does not return the `textAnchor`.
	 *
	 * @returns {SVG.Point} all anchor points for snapping to the grid
	 */
	get snappingPoints() {
		return this.snappingAnchors.map((anchor) => anchor.point);
	}

	/*
	 *
	 * @returns {SVG.Use}
	 *
	createInstance() {
		return new SVG.Use(this);
	}*/

	/**
	 * @typedef {object} DragHandler
	 * @property {SVG.Element} el
	 * @property {SVG.Box} box
	 * @property {SVG.Point} lastClick
	 * @property {(ev: MouseEvent) => void} startDrag
	 * @property {(ev: MouseEvent) => void} drag
	 * @property {(ev: MouseEvent) => void} endDrag
	 */

	/**
	 * @param {SVG.Container} container
	 * @param {MouseEvent} event
	 * @returns {componentInstance}
	 */
	addInstanceToContainer(container, event) {
		return new componentInstance(this, container, event);
	}
}
