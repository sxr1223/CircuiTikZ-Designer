// @ts-check
/**
 * @module LineDrawer
 */

import * as SVG from "@svgdotjs/svg.js";

import FABcontroller from "../controllers/fabController";
import SnapController from "../snapDrag/snapController";
import SnapCursorController from "../snapDrag/snapCursor";
import Line from "./line";

/** @typedef {import("../controllers/mainController").default} MainController */

/**
 * @class
 */
export default class LineDrawer {
	/** @type {MainController} */
	#mainController;
	/** @type {SVG.Svg} */
	#canvas;

	/** @type {?Line} */
	#newLine;
	/** @type {SVG.Point} */
	#lastPoint;

	/** @type {boolean} */
	#horizontalFirst = false;
	/** @type {boolean} */
	#holdDirectionSet = false;
	/** @type {{up: boolean, right: boolean, down: boolean, left: boolean}} */
	#lastLineDirection = { up: false, right: false, down: false, left: false };
	/** @type {boolean} */
	#wasAboveXAxis;
	/** @type {boolean} */
	#wasRightOfYAxis;

	/**
	 *
	 * @param {MainController} mainController
	 */
	constructor(mainController) {
		this.#mainController = mainController;
		this.#canvas = this.#mainController.canvasController.canvas;
	}

	/**
	 * Deactivate the line drawing feature temporary.
	 *
	 * Removes listeners from the canvas.
	 */
	deactivate() {
		this.#onCancel();
		// unregister move listener
		this.#canvas.off("mousemove", this.#moveListener);
		this.#canvas.off("click", this.#clickListener);
		SnapCursorController.controller.visible = false;
		this.#canvas.node.classList.remove("selectPoint");
	}

	/**
	 * Activate the line drawing feature.
	 *
	 * Adds listeners to the canvas.
	 */
	activate() {
		this.#resetVars();
		this.#canvas.on("click", this.#clickListener, this);
		this.#canvas.on("mousemove", this.#moveListener, this);
		this.#canvas.node.classList.add("selectPoint");
		SnapCursorController.controller.visible = true;

		// init FAB
		FABcontroller.controller.setButtons(
			{
				icon: "done",
				buttonClass: "btn-success",
				onclick: this.#onOK.bind(this),
			},
			[
				{
					icon: "close",
					buttonClass: "btn-danger",
					onclick: this.#onCancel.bind(this),
				},
			]
		);
	}

	/**
	 * Listener for clicks to add new Lines or add points to lines.
	 *
	 * @param {MouseEvent} event
	 */
	#clickListener(event) {
		let pt = this.#mainController.canvasController.pointerEventToPoint(event);
		const snappedPoint = event.shiftKey ? pt : SnapController.controller.snapPoint(pt, [{ x: 0, y: 0 }]);

		if (!this.#lastPoint) {
			SnapCursorController.controller.visible = false;
			this.#newLine = new Line(snappedPoint);
			this.#lastPoint = snappedPoint;
			this.#canvas.add(this.#newLine);
		} else {
			if (this.#lastPoint.x === snappedPoint.x && this.#lastPoint.y === snappedPoint.y) return;
			this.#newLine.pushPoint(this.#horizontalFirst, snappedPoint);
			const secondLastPoint = this.#lastPoint;
			this.#lastPoint = snappedPoint;

			if (
				(this.#horizontalFirst || this.#lastPoint.x === secondLastPoint.x) &&
				this.#lastPoint.y !== secondLastPoint.y
			) {
				// up or down
				this.#lastLineDirection.up = this.#lastPoint.y < secondLastPoint.y;
				this.#lastLineDirection.down = this.#lastPoint.y > secondLastPoint.y;
				this.#lastLineDirection.left = false;
				this.#lastLineDirection.right = false;
			} else {
				// left or right
				this.#lastLineDirection.left = this.#lastPoint.x < secondLastPoint.x;
				this.#lastLineDirection.right = this.#lastPoint.x > secondLastPoint.x;
				this.#lastLineDirection.up = false;
				this.#lastLineDirection.down = false;
			}

			FABcontroller.controller.visible = true;
		}
	}

	/**
	 * Listener for the ok button. Ends the currently created line using {@link "#lineEnd"}.
	 */
	#onOK() {
		this.#lineEnd();
	}

	/**
	 * Listener for the cancel button. Removes the current line in creation.
	 *
	 */
	#onCancel() {
		if (this.#newLine) this.#newLine.remove();
		this.#resetVars();
		FABcontroller.controller.visible = false;
		SnapCursorController.controller.visible = true;
	}

	/**
	 * Marks the line in creation as done. Prepares the class for adding the next line.
	 */
	#lineEnd() {
		this.#newLine.removeMousePoint();

		this.#mainController.addLine(this.#newLine);

		this.#resetVars();
		FABcontroller.controller.visible = false;
		SnapCursorController.controller.visible = true;
	}

	/**
	 * Resets all variables between line draws and on init.
	 */
	#resetVars() {
		this.#newLine = null;
		this.#lastPoint = null;
		this.#holdDirectionSet = false;

		this.#lastLineDirection.up = false;
		this.#lastLineDirection.right = false;
		this.#lastLineDirection.down = false;
		this.#lastLineDirection.left = false;
	}

	/**
	 * Listener for mouse movements. Does update the "SnapCursor" or the currently drawn line.
	 * @param {MouseEvent} event
	 */
	#moveListener(event) {
		let pt = this.#mainController.canvasController.pointerEventToPoint(event);
		const snappedPoint = event.shiftKey ? pt : SnapController.controller.snapPoint(pt, [{ x: 0, y: 0 }]);
		if (!this.#newLine) {
			SnapCursorController.controller.move(snappedPoint);
		} else {
			// try to get quadrant change
			const isAboveXAxis = snappedPoint.y < this.#lastPoint.y;
			const isRightOfYAxis = snappedPoint.x > this.#lastPoint.x;

			if (this.#holdDirectionSet) {
				// change direction if mouse position crosses the horizontal or vertical position of the last point

				if (this.#wasAboveXAxis !== isAboveXAxis) {
					this.#horizontalFirst = true;
				} else if (this.#wasRightOfYAxis !== isRightOfYAxis) {
					this.#horizontalFirst = false;
				}
			} else {
				// no initial direction set --> evaluate delta to last point
				const deltaX = snappedPoint.x - this.#lastPoint.x;
				const deltaY = snappedPoint.y - this.#lastPoint.y;
				this.#horizontalFirst = deltaX > deltaY;
				this.#holdDirectionSet = true;
			}

			this.#wasAboveXAxis = isAboveXAxis;
			this.#wasRightOfYAxis = isRightOfYAxis;

			// no parallel line to the old one, if any
			if ((this.#lastLineDirection.left && isRightOfYAxis) || (this.#lastLineDirection.right && !isRightOfYAxis))
				this.#horizontalFirst = false;
			else if ((this.#lastLineDirection.down && isAboveXAxis) || (this.#lastLineDirection.up && !isAboveXAxis))
				this.#horizontalFirst = true;

			this.#newLine.updateMousePoint(this.#horizontalFirst, snappedPoint);
		}
	}
}
