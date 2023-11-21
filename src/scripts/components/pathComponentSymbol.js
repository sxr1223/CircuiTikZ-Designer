/**
 * @module pathComponentSymbol
 */

import ComponentSymbol from "./componentSymbol";
import PathComponentInstance from "./pathComponentInstance";

/** @typedef {import("@svgdotjs/svg.js").Container} SVG.Container */
/** @typedef {import("./componentSymbol").TikZAnchor} TikZAnchor */

/**
 * Class representing a path-style component.
 * @class
 * @extends ComponentSymbol
 */
export default class PathComponentSymbol extends ComponentSymbol {
	/** @type {TikZAnchor} */
	startPin;
	/** @type {TikZAnchor} */
	endPin;

	/**
	 * Creates a new path-style symbol from a `SVGSymbolElement`.
	 *
	 * @param {SVGSymbolElement} symbolElement - the element containing the symbol & metadata
	 * @param {SymbolBaseInformation} [baseInformation] - base information if already extracted using {@link ComponentSymbol.getBaseInformation}
	 * @throws {Error} if the XML structure lacks the required metadata
	 */
	constructor(symbolElement, baseInformation) {
		super(symbolElement, baseInformation);

		this._pins = this._pins.filter((pin) => {
			if (pin.name === "START") this.startPin = pin;
			else if (pin.name === "END") this.endPin = pin;
			else return true;
			return false;
		});
	}

	/**
	 * Generate a instance of a symbol.
	 * @override
	 * @param {SVG.Container} container - the container to add the instance to
	 * @param {MouseEvent} event - the event which triggered the adding
	 */
	addInstanceToContainer(container, event) {
		return PathComponentInstance.createInstance(this, container, event);
	}
}
