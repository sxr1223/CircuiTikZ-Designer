/**
 * @module nodeComponentSymbol
 */

import ComponentSymbol from "./componentSymbol";
import NodeComponentInstance from "./nodeComponentInstance";

/** @typedef {import("@svgdotjs/svg.js").Container} SVG.Container */

/**
 * Class representing a node-style component.
 * @class
 * @extends ComponentSymbol
 */
export default class NodeComponentSymbol extends ComponentSymbol {
	/**
	 * Creates a new node-style symbol from a `SVGSymbolElement`.
	 *
	 * @param {SVGSymbolElement} symbolElement - the element containing the symbol & metadata
	 * @param {SymbolBaseInformation} [baseInformation] - base information if already extracted using {@link ComponentSymbol.getBaseInformation}
	 * @throws {Error} if the XML structure lacks the required metadata
	 */
	constructor(symbolElement, baseInformation) {
		super(symbolElement, baseInformation);
	}

	/**
	 * Generate a instance of a symbol.
	 * @override
	 * @param {SVG.Container} container - the container to add the instance to
	 * @param {MouseEvent} event - the event which triggered the adding
	 * @returns {NodeComponentInstance} the new instance
	 */
	addInstanceToContainer(container, event) {
		return NodeComponentInstance.createInstance(this, container, event);
	}
}
